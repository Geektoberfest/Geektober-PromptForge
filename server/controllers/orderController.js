import mongoose from 'mongoose';
import Prompt from '../models/prompt.js';
import Users from '../models/user.js';
import Order from '../models/order.js';
import Entitlement from '../models/entitlement.js';
import Ledger from '../models/ledger.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../config/razorpay.js';
import eventBus from '../utils/eventBus.js';

export async function createOrder(req, res) {
  try {
    const buyerId = req.user.id;
    const { promptId } = req.body;

    if (!promptId) {
      return res.status(400).json({ success: false, message: 'Prompt ID is required' });
    }

    const prompt = await Prompt.findById(promptId);
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'Prompt not found' });
    }

    // Prevent creator buying own prompt
    if (prompt.authorId && prompt.authorId.toString() === buyerId) {
      return res.status(400).json({ success: false, message: 'You are the creator of this prompt' });
    }

    // Check existing entitlement
    const existingEntitlement = await Entitlement.findOne({ userId: buyerId, promptId: prompt._id });
    if (existingEntitlement) {
      return res.status(400).json({
        success: false,
        message: 'You already own this prompt',
        alreadyOwned: true,
      });
    }

    // Free prompts do not require payment
    if (prompt.pricePaise === 0) {
      const freeOrder = await Order.create({
        buyerId,
        promptId: prompt._id,
        sellerId: prompt.authorId,
        amountPaise: 0,
        currency: 'INR',
        status: 'PAID',
        paidAt: new Date(),
      });

      await Entitlement.create({
        userId: buyerId,
        promptId: prompt._id,
        orderId: freeOrder._id,
      });

      await Prompt.findByIdAndUpdate(prompt._id, { $inc: { salesCount: 1 } });

      eventBus.broadcastToUser(buyerId, {
        event: 'PAYMENT_SUCCESS',
        data: {
          orderId: freeOrder._id.toString(),
          promptId: prompt._id.toString(),
          title: prompt.title,
          message: 'Payment verified! Full prompt and parameters are now unlocked.',
        },
      });

      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'Free prompt unlocked successfully!',
        fullPromptText: prompt.fullPromptText,
        negativePrompt: prompt.negativePrompt,
        seed: prompt.seed,
      });
    }

    // Check for recent pending order to ensure idempotency
    const idempotencyKey = `${buyerId}_${promptId}_${prompt.pricePaise}`;
    let order = await Order.findOne({
      buyerId,
      promptId: prompt._id,
      status: 'PENDING',
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (!order) {
      const rzpOrder = await createRazorpayOrder({
        amountPaise: prompt.pricePaise,
        currency: 'INR',
        receipt: `rcpt_${buyerId.slice(-6)}_${Date.now().toString().slice(-6)}`,
      });

      order = await Order.create({
        buyerId,
        promptId: prompt._id,
        sellerId: prompt.authorId,
        amountPaise: prompt.pricePaise,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: rzpOrder.id,
        idempotencyKey,
      });
    }

    return res.status(200).json({
      success: true,
      orderId: order._id.toString(),
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amountPaise,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_simKey',
      prompt: {
        title: prompt.title,
        category: prompt.category,
        aiModel: prompt.aiModel,
      },
    });
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
}

export async function verifyPayment(req, res) {
  try {
    const buyerId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification tokens' });
    }

    // Verify signature
    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'FAILED' }
      );
      return res.status(400).json({ success: false, message: 'Cryptographic signature verification failed' });
    }

    const maxRetries = 3;
    let order;
    let prompt;
    let alreadyFulfilledResponse = null;
    let notFound = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Concurrency locking: atomically transition order from non-PAID to PAID
        const updateSet = {
          status: 'PAID',
          paidAt: new Date(),
        };
        if (razorpay_payment_id) {
          updateSet.razorpayPaymentId = razorpay_payment_id;
        }
        if (razorpay_signature) {
          updateSet.razorpaySignature = razorpay_signature;
        }

        order = await Order.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id, status: { $ne: 'PAID' } },
          { $set: updateSet },
          { new: true, session }
        );

        if (!order) {
          const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id }).session(session);
          await session.commitTransaction();

          if (existingOrder && existingOrder.status === 'PAID') {
            const existingPrompt = await Prompt.findById(existingOrder.promptId);
            alreadyFulfilledResponse = {
              success: true,
              message: 'Order already fulfilled',
              fullPromptText: existingPrompt?.fullPromptText,
              negativePrompt: existingPrompt?.negativePrompt,
              seed: existingPrompt?.seed,
            };
            break;
          }

          notFound = true;
          break;
        }

        prompt = await Prompt.findById(order.promptId).session(session);
        if (!prompt) {
          throw new Error('Associated prompt not found');
        }

        // Provision entitlement record atomically
        await Entitlement.findOneAndUpdate(
          { userId: buyerId, promptId: prompt._id },
          { orderId: order._id, grantedAt: new Date() },
          { upsert: true, new: true, session }
        );

        // Increment prompt sales count atomically
        await Prompt.findByIdAndUpdate(
          prompt._id,
          { $inc: { salesCount: 1 } },
          { session }
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

    if (alreadyFulfilledResponse) {
      return res.status(200).json(alreadyFulfilledResponse);
    }

    if (notFound) {
      return res.status(404).json({ success: false, message: 'Associated order not found' });
    }

    eventBus.broadcastToUser(buyerId, {
      event: 'PAYMENT_SUCCESS',
      data: {
        orderId: order._id.toString(),
        promptId: prompt._id.toString(),
        title: prompt.title,
        message: 'Payment verified! Full prompt and parameters are now unlocked.',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and prompt unlocked!',
      fullPromptText: prompt.fullPromptText,
      negativePrompt: prompt.negativePrompt,
      seed: prompt.seed,
      order: {
        id: order._id.toString(),
        amount: order.amountPaise,
        paidAt: order.paidAt,
      },
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ success: false, message: 'Error processing payment verification', error: err.message });
  }
}

export async function getUserOrders(req, res) {
  try {
    const buyerId = req.user.id;
    const orders = await Order.find({ buyerId, status: 'PAID' })
      .populate('promptId', 'title category aiModel imageUrl pricePaise author')
      .sort({ paidAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user orders', error: err.message });
  }
}
