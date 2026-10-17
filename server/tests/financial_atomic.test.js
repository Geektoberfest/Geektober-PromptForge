import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../server.js';
import Users from '../models/user.js';
import Prompt from '../models/prompt.js';
import Order from '../models/order.js';
import Entitlement from '../models/entitlement.js';
import Ledger from '../models/ledger.js';
import connectDB from '../utils/connectDB.js';

describe('Atomic Financial Settlement Ledger & Multi-Document Transactions Suite', () => {
  const JWT_SECRET = process.env.JWT_Secret_Key || 'default_jwt_secret_dev_key_promptforge';
  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_key_123';

  beforeAll(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    await connectDB();
  });

  afterAll(async () => {
    // Clean up test collections
    await Users.deleteMany({ email: /@atomic-test\.dev$/ });
    await Prompt.deleteMany({ title: /Atomic Test Prompt/ });
    await Order.deleteMany({ razorpayOrderId: /^order_atomic_/ });
    await Entitlement.deleteMany({});
    await Ledger.deleteMany({});
  });

  function createAuthCookie(user) {
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    return `token=${token}`;
  }

  function signWebhook(payload) {
    const raw = JSON.stringify(payload);
    return crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  }

  function generatePaymentSignature(orderId, paymentId) {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'yourKeySecret';
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  it('should roll back completely when fulfillment fails due to invalid seller ID', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    const buyer = await Users.create({
      username: `buyer_rb_${suffix}`,
      email: `buyer_${suffix}@atomic-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 0,
    });

    const fakeSellerId = new mongoose.Types.ObjectId();

    const prompt = await Prompt.create({
      title: `Atomic Test Prompt Rollback ${suffix}`,
      promptText: 'A beautiful sunset in synthwave style',
      author: 'Unknown Seller',
      authorId: fakeSellerId,
      category: 'Art',
      description: 'Test description for atomic settlement',
      imageUrl: 'https://example.com/image.jpg',
      aiModel: 'Midjourney v6',
      pricePaise: 5000,
      salesCount: 0,
    });

    const razorpayOrderId = `order_atomic_rb_${suffix}`;
    const order = await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: fakeSellerId,
      amountPaise: 5000,
      currency: 'INR',
      status: 'PENDING',
      razorpayOrderId,
    });

    const paymentId = `pay_atomic_rb_${suffix}`;
    const cookie = createAuthCookie(buyer);
    const res = await request(app)
      .post('/api/v1/orders/verify')
      .set('Cookie', [cookie])
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: generatePaymentSignature(razorpayOrderId, paymentId),
      });

    expect(res.status).toBe(500);

    // Verify complete rollback: order status remains PENDING
    const orderAfter = await Order.findById(order._id);
    expect(orderAfter.status).toBe('PENDING');

    // Verify no entitlement was created
    const entitlement = await Entitlement.findOne({ userId: buyer._id, promptId: prompt._id });
    expect(entitlement).toBeNull();

    // Verify sales count was not incremented
    const promptAfter = await Prompt.findById(prompt._id);
    expect(promptAfter.salesCount).toBe(0);

    // Verify no ledger entry was recorded
    const ledgerEntries = await Ledger.find({ orderId: order._id });
    expect(ledgerEntries.length).toBe(0);
  });

  it('should handle concurrent verification requests without double-crediting or duplicate ledger entries', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    const buyer = await Users.create({
      username: `buyer_conc_${suffix}`,
      email: `buyer_${suffix}@atomic-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 0,
    });

    const seller = await Users.create({
      username: `seller_conc_${suffix}`,
      email: `seller_${suffix}@atomic-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 1000,
    });

    const prompt = await Prompt.create({
      title: `Atomic Test Prompt Concurrent ${suffix}`,
      promptText: 'Hyperrealistic portrait of an astronaut',
      author: seller.username,
      authorId: seller._id,
      category: 'Photorealistic',
      description: 'Test description for concurrent test',
      imageUrl: 'https://example.com/astronaut.jpg',
      aiModel: 'Stable Diffusion XL',
      pricePaise: 10000,
      salesCount: 0,
    });

    const razorpayOrderId = `order_atomic_conc_${suffix}`;
    const order = await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: seller._id,
      amountPaise: 10000,
      currency: 'INR',
      status: 'PENDING',
      razorpayOrderId,
    });

    const cookie = createAuthCookie(buyer);
    const payId1 = `pay_conc_1_${suffix}`;
    const payId2 = `pay_conc_2_${suffix}`;

    // Send two concurrent verification requests for the exact same order
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/orders/verify')
        .set('Cookie', [cookie])
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: payId1,
          razorpay_signature: generatePaymentSignature(razorpayOrderId, payId1),
        }),
      request(app)
        .post('/api/v1/orders/verify')
        .set('Cookie', [cookie])
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: payId2,
          razorpay_signature: generatePaymentSignature(razorpayOrderId, payId2),
        }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // One must have fulfilled and the other returned "Order already fulfilled"
    const messages = [res1.body.message, res2.body.message];
    expect(messages).toContain('Payment verified and prompt unlocked!');
    expect(messages).toContain('Order already fulfilled');

    // Verify order is PAID
    const orderAfter = await Order.findById(order._id);
    expect(orderAfter.status).toBe('PAID');

    // Verify prompt sales count incremented exactly once (0 -> 1)
    const promptAfter = await Prompt.findById(prompt._id);
    expect(promptAfter.salesCount).toBe(1);

    // Verify seller balance incremented exactly once: 1000 + 9000 (90% of 10000) = 10000
    const sellerAfter = await Users.findById(seller._id);
    expect(sellerAfter.creatorBalancePaise).toBe(10000);

    // Verify exactly one ledger entry exists for this order
    const ledgerEntries = await Ledger.find({ orderId: order._id });
    expect(ledgerEntries.length).toBe(1);

    const ledger = ledgerEntries[0];
    expect(ledger.userId.toString()).toBe(seller._id.toString());
    expect(ledger.type).toBe('CREDIT_SALE');
    expect(ledger.grossAmountPaise).toBe(10000);
    expect(ledger.platformFeePaise).toBe(1000);
    expect(ledger.netAmountPaise).toBe(9000);
    expect(ledger.balanceAfterPaise).toBe(10000);
  });

  it('should prevent race condition between client verification and razorpay webhook', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    const buyer = await Users.create({
      username: `buyer_race_${suffix}`,
      email: `buyer_${suffix}@atomic-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 0,
    });

    const seller = await Users.create({
      username: `seller_race_${suffix}`,
      email: `seller_${suffix}@atomic-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 500,
    });

    const prompt = await Prompt.create({
      title: `Atomic Test Prompt Race ${suffix}`,
      promptText: 'Cyberpunk Tokyo alleyway at night',
      author: seller.username,
      authorId: seller._id,
      category: 'Cyberpunk',
      description: 'Test description for race test',
      imageUrl: 'https://example.com/cyberpunk.jpg',
      aiModel: 'Midjourney v6',
      pricePaise: 2000,
      salesCount: 5,
    });

    const razorpayOrderId = `order_atomic_race_${suffix}`;
    const order = await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: seller._id,
      amountPaise: 2000,
      currency: 'INR',
      status: 'PENDING',
      razorpayOrderId,
    });

    const cookie = createAuthCookie(buyer);
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_race_wh_${suffix}`,
            order_id: razorpayOrderId,
            amount: 2000,
            status: 'captured',
          },
        },
      },
    };
    const signature = signWebhook(webhookPayload);

    const payIdCli = `pay_race_cli_${suffix}`;

    // Race verifyPayment and webhook simultaneously
    const [clientRes, webhookRes] = await Promise.all([
      request(app)
        .post('/api/v1/orders/verify')
        .set('Cookie', [cookie])
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: payIdCli,
          razorpay_signature: generatePaymentSignature(razorpayOrderId, payIdCli),
        }),
      request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .send(webhookPayload),
    ]);

    expect(clientRes.status).toBe(200);
    expect(webhookRes.status).toBe(200);

    // Check prompt sales count: 5 + 1 = 6
    const promptAfter = await Prompt.findById(prompt._id);
    expect(promptAfter.salesCount).toBe(6);

    // Check seller balance: 500 + 1800 (90% of 2000) = 2300
    const sellerAfter = await Users.findById(seller._id);
    expect(sellerAfter.creatorBalancePaise).toBe(2300);

    // Exactly one ledger entry
    const ledgerEntries = await Ledger.find({ orderId: order._id });
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].netAmountPaise).toBe(1800);
    expect(ledgerEntries[0].balanceAfterPaise).toBe(2300);
  });
});
