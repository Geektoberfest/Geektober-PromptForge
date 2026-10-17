import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/order.js';
import Prompt from '../models/prompt.js';
import Entitlement from '../models/entitlement.js';
import Users from '../models/user.js';
import Ledger from '../models/ledger.js';
import eventBus from '../utils/eventBus.js';

export async function handleRazorpayWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if secret configured
    if (webhookSecret) {
      if (!signature) {
        console.warn('Webhook received without x-razorpay-signature header');
        return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
      }

      const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const signatureBuffer = Buffer.from(signature, 'utf-8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        console.warn('Webhook signature mismatch detected');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (!payload) {
      return res.status(200).json({ status: 'ok', message: 'No payload in webhook' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const maxRetries = 3;
        let order;
        let prompt;
        let alreadyProcessed = false;
        let notFound = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const session = await mongoose.startSession();
          session.startTransaction();

          try {
            const updateSet = {
              status: 'PAID',
              paidAt: new Date(),
            };
            if (razorpayPaymentId) {
              updateSet.razorpayPaymentId = razorpayPaymentId;
            }

            order = await Order.findOneAndUpdate(
              { razorpayOrderId, status: { $ne: 'PAID' } },
              { $set: updateSet },
              { new: true, session }
            );

            if (!order) {
              const existingOrder = await Order.findOne({ razorpayOrderId }).session(session);
              await session.commitTransaction();

              if (existingOrder && existingOrder.status === 'PAID') {
                alreadyProcessed = true;
                break;
              }
              notFound = true;
              break;
            }

            // Ensure entitlement is provisioned atomically
            await Entitlement.findOneAndUpdate(
              { userId: order.buyerId, promptId: order.promptId },
              { orderId: order._id, grantedAt: new Date() },
              { upsert: true, new: true, session }
            );

            prompt = await Prompt.findByIdAndUpdate(
              order.promptId,
              { $inc: { salesCount: 1 } },
              { new: true, session }
            );

            // Settle creator balance and record immutable accounting ledger entry
            if (order.sellerId && order.amountPaise > 0) {
              const seller = await Users.findById(order.sellerId).session(session);
              if (!seller) {
                throw new Error(`Seller user ${order.sellerId} not found`);
              }

              const platformFeePaise = Math.round(order.amountPaise * 0.1);
              const netCreatorPaise = Math.round(order.amountPaise * 0.9);
              const updatedBalance = (seller.creatorBalancePaise || 0) + netCreatorPaise;

              await Users.findByIdAndUpdate(
                order.sellerId,
                { $inc: { creatorBalancePaise: netCreatorPaise } },
                { session }
              );

              await Ledger.create(
                [
                  {
                    userId: order.sellerId,
                    orderId: order._id,
                    type: 'CREDIT_SALE',
                    grossAmountPaise: order.amountPaise,
                    platformFeePaise,
                    netAmountPaise: netCreatorPaise,
                    balanceAfterPaise: updatedBalance,
                    createdAt: new Date(),
                  },
                ],
                { session }
              );
            }

            await session.commitTransaction();
            break;
          } catch (err) {
            await session.abortTransaction();
            const isTransient =
              err.hasErrorLabel?.('TransientTransactionError') ||
              (err.errorLabels && err.errorLabels.has && err.errorLabels.has('TransientTransactionError')) ||
              err.code === 112 ||
              err.codeName === 'WriteConflict';

            if (isTransient && attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
              continue;
            }
            throw err;
          } finally {
            session.endSession();
          }
        }

        if (alreadyProcessed) {
          return res.status(200).json({ status: 'already_processed' });
        }

        if (notFound) {
          return res.status(200).json({ status: 'success' });
        }

        if (order) {
          eventBus.broadcastToUser(order.buyerId, {
            event: 'PAYMENT_SUCCESS',
            data: {
              orderId: order._id.toString(),
              promptId: order.promptId.toString(),
              title: prompt?.title || 'Purchased Prompt',
              message: 'Payment verified! Full prompt and parameters are now unlocked.',
            },
          });
        }
      }
    } else if (event === 'payment.failed') {
      const razorpayOrderId = payload.payment?.entity?.order_id;
      if (razorpayOrderId) {
        await Order.findOneAndUpdate(
          { razorpayOrderId, status: 'PENDING' },
          { status: 'FAILED' }
        );
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ success: false, message: 'Webhook error', error: err.message });
  }
}
