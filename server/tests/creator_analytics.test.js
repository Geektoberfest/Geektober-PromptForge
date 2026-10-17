import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../server.js';
import Users from '../models/user.js';
import Prompt from '../models/prompt.js';
import Order from '../models/order.js';
import connectDB from '../utils/connectDB.js';

describe('Creator Analytics Time-Series & CSV Export Suite', () => {
  const JWT_SECRET = process.env.JWT_Secret_Key || 'default_jwt_secret_dev_key_promptforge';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await Users.deleteMany({ email: /@analytics-test\.dev$/ });
    await Prompt.deleteMany({ title: /Analytics Test Prompt/ });
    await Order.deleteMany({ razorpayOrderId: /^order_analytics_/ });
  });

  function createAuthCookie(user) {
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    return `token=${token}`;
  }

  it('should return continuous chronological zero-filled time-series date objects', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    const creator = await Users.create({
      username: `creator_ts_${suffix}`,
      email: `creator_${suffix}@analytics-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 0,
    });

    const buyer = await Users.create({
      username: `buyer_ts_${suffix}`,
      email: `buyer_${suffix}@analytics-test.dev`,
      password: 'hashed_password',
    });

    const prompt = await Prompt.create({
      title: `Analytics Test Prompt ${suffix}`,
      description: 'Analytics test prompt description',
      promptText: 'Neon futuristic city at night',
      imageUrl: 'https://example.com/city.jpg',
      author: creator.username,
      authorId: creator._id,
      category: 'Sci-Fi',
      aiModel: 'Midjourney v6',
      pricePaise: 5000,
    });

    // Create an order paid today
    const now = new Date();
    await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: creator._id,
      amountPaise: 5000,
      currency: 'INR',
      status: 'PAID',
      razorpayOrderId: `order_analytics_ts1_${suffix}`,
      paidAt: now,
    });

    // Create an order paid 2 days ago
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: creator._id,
      amountPaise: 10000,
      currency: 'INR',
      status: 'PAID',
      razorpayOrderId: `order_analytics_ts2_${suffix}`,
      paidAt: twoDaysAgo,
    });

    const cookie = createAuthCookie(creator);

    // Request 7-day time series
    const res = await request(app)
      .get('/api/v1/creator/analytics/time-series?days=7')
      .set('Cookie', [cookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.days).toBe(7);

    const series = res.body.timeSeries;
    expect(series.length).toBe(7);

    // Verify chronological ascending order
    for (let i = 0; i < series.length - 1; i++) {
      expect(new Date(series[i].date).getTime()).toBeLessThan(new Date(series[i + 1].date).getTime());
    }

    // Verify zero-filling on missing dates
    const zeroDays = series.filter((item) => item.dailyRevenuePaise === 0);
    expect(zeroDays.length).toBeGreaterThan(0);

    // Verify revenue calculation for today
    const todayStr = now.toISOString().slice(0, 10);
    const todayPoint = series.find((item) => item.date === todayStr);
    expect(todayPoint).toBeDefined();
    expect(todayPoint.dailyRevenuePaise).toBe(5000);
    expect(todayPoint.dailyNetEarningsPaise).toBe(4500); // 90% of 5000
    expect(todayPoint.unitsSold).toBe(1);

    // Verify revenue calculation for two days ago
    const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
    const twoDaysAgoPoint = series.find((item) => item.date === twoDaysAgoStr);
    expect(twoDaysAgoPoint).toBeDefined();
    expect(twoDaysAgoPoint.dailyRevenuePaise).toBe(10000);
    expect(twoDaysAgoPoint.dailyNetEarningsPaise).toBe(9000); // 90% of 10000
    expect(twoDaysAgoPoint.unitsSold).toBe(1);
  });

  it('should stream completed sales in RFC-4180 CSV format with proper headers and escaping', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');

    const creator = await Users.create({
      username: `creator_csv_${suffix}`,
      email: `creator_${suffix}@analytics-test.dev`,
      password: 'hashed_password',
      creatorBalancePaise: 0,
    });

    const buyer = await Users.create({
      username: `buyer_csv_${suffix}`,
      email: `buyer_${suffix}@analytics-test.dev`,
      password: 'hashed_password',
    });

    // Title with special characters: quotes, commas, and special punctuation
    const trickyTitle = `Analytics Test Prompt: "Futuristic, Neon & Cyber" ${suffix}`;
    const prompt = await Prompt.create({
      title: trickyTitle,
      description: 'Analytics tricky title description',
      promptText: 'Neon futuristic city with tricky title',
      imageUrl: 'https://example.com/tricky.jpg',
      author: creator.username,
      authorId: creator._id,
      category: 'Digital Art',
      aiModel: 'Midjourney v6',
      pricePaise: 2000,
    });

    await Order.create({
      buyerId: buyer._id,
      promptId: prompt._id,
      sellerId: creator._id,
      amountPaise: 2000,
      currency: 'INR',
      status: 'PAID',
      razorpayOrderId: `order_analytics_csv1_${suffix}`,
      razorpayPaymentId: `pay_analytics_csv1_${suffix}`,
      paidAt: new Date(),
    });

    const cookie = createAuthCookie(creator);
    const res = await request(app)
      .get('/api/v1/creator/analytics/export')
      .set('Cookie', [cookie]);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="promptforge-creator-statement-');

    const csvContent = res.text;
    const lines = csvContent.trim().split('\r\n');

    // Header row verification
    expect(lines[0]).toBe(
      'Order ID,Date (UTC),Prompt Title,Buyer Username,Gross Amount (INR),Platform Fee (10% INR),Net Payout (INR),Payment ID'
    );

    // Sales row verification
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const dataRow = lines[1];

    // Escaped title should be wrapped in quotes with doubled internal quotes
    const expectedEscapedTitle = `"${trickyTitle.replace(/"/g, '""')}"`;
    expect(dataRow).toContain(expectedEscapedTitle);
    expect(dataRow).toContain(`buyer_csv_${suffix}`);
    expect(dataRow).toContain('20.00'); // Gross
    expect(dataRow).toContain('2.00');  // 10% Fee
    expect(dataRow).toContain('18.00'); // 90% Net
    expect(dataRow).toContain(`pay_analytics_csv1_${suffix}`);
  });

  it('should reject unauthenticated requests to analytics endpoints with 401', async () => {
    const res1 = await request(app).get('/api/v1/creator/analytics/time-series');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/v1/creator/analytics/export');
    expect(res2.status).toBe(401);
  });
});
