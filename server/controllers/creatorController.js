import mongoose from 'mongoose';
import Prompt from '../models/prompt.js';
import Order from '../models/order.js';
import Users from '../models/user.js';

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function getCreatorAnalytics(req, res) {
  try {
    const creatorId = req.user.id;
    const user = await Users.findById(creatorId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    // Find all prompts by this creator
    const prompts = await Prompt.find({
      $or: [{ authorId: creatorId }, { author: user.username }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const promptIds = prompts.map((p) => p._id);

    // Find all successful orders for this creator
    const orders = await Order.find({
      $or: [{ sellerId: creatorId }, { promptId: { $in: promptIds } }],
      status: 'PAID',
    })
      .populate('buyerId', 'username email avatarUrl')
      .populate('promptId', 'title category aiModel imageUrl')
      .sort({ paidAt: -1 })
      .lean();

    // Calculate aggregated metrics
    const totalPrompts = prompts.length;
    const totalSalesUnits = orders.length;

    const grossRevenuePaise = orders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);
    const platformFeePaise = Math.round(grossRevenuePaise * 0.1); // 10% fee
    const netEarningsPaise = user.creatorBalancePaise || Math.round(grossRevenuePaise * 0.9);

    const totalLikes = prompts.reduce((sum, p) => sum + (p.likes || 0), 0);

    const ratedPrompts = prompts.filter((p) => p.reviewsCount > 0);
    const overallAverageRating =
      ratedPrompts.length > 0
        ? Number(
            (
              ratedPrompts.reduce((sum, p) => sum + p.averageRating, 0) / ratedPrompts.length
            ).toFixed(1)
          )
        : 0;

    // Breakdown per prompt
    const promptBreakdown = prompts.map((p) => {
      const promptOrders = orders.filter(
        (o) => o.promptId?._id?.toString() === p._id.toString() || o.promptId?.toString() === p._id.toString()
      );
      const promptRevenuePaise = promptOrders.reduce((sum, o) => sum + (o.amountPaise || 0), 0);

      return {
        id: p._id.toString(),
        title: p.title,
        category: p.category,
        aiModel: p.aiModel,
        imageUrl: p.imageUrl,
        pricePaise: p.pricePaise,
        salesCount: p.salesCount || promptOrders.length,
        likes: p.likes,
        averageRating: p.averageRating,
        reviewsCount: p.reviewsCount,
        revenuePaise: promptRevenuePaise,
        createdAt: p.createdAt,
      };
    });

    // Recent 10 sales
    const recentSales = orders.slice(0, 10).map((o) => ({
      orderId: o._id.toString(),
      amountPaise: o.amountPaise,
      buyerUsername: o.buyerId?.username || 'Verified Buyer',
      promptTitle: o.promptId?.title || 'Generative Prompt',
      paidAt: o.paidAt || o.createdAt,
    }));

    return res.status(200).json({
      success: true,
      analytics: {
        totalPrompts,
        totalSalesUnits,
        grossRevenuePaise,
        platformFeePaise,
        netEarningsPaise,
        totalLikes,
        overallAverageRating,
        balanceInr: (netEarningsPaise / 100).toFixed(2),
        grossRevenueInr: (grossRevenuePaise / 100).toFixed(2),
      },
      prompts: promptBreakdown,
      recentSales,
    });
  } catch (err) {
    console.error('Creator analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate creator analytics', error: err.message });
  }
}

export async function getCreatorTimeSeriesAnalytics(req, res) {
  try {
    const creatorId = new mongoose.Types.ObjectId(req.user.id);
    let days = parseInt(req.query.days, 10);
    if (isNaN(days)) {
      days = 30;
    } else {
      days = Math.max(7, Math.min(90, days));
    }

    const now = new Date();
    // Generate chronological list of date strings (YYYY-MM-DD) for the past days
    const dateStrings = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      dateStrings.push(d.toISOString().slice(0, 10));
    }

    const startDate = new Date(`${dateStrings[0]}T00:00:00.000Z`);

    const rawSeries = await Order.aggregate([
      {
        $match: {
          sellerId: creatorId,
          status: 'PAID',
          paidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          dailyRevenuePaise: { $sum: '$amountPaise' },
          dailyNetEarningsPaise: {
            $sum: { $round: [{ $multiply: ['$amountPaise', 0.9] }, 0] },
          },
          unitsSold: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const seriesMap = new Map();
    for (const item of rawSeries) {
      seriesMap.set(item._id, item);
    }

    // Zero-fill dates in the range for smooth continuous charting
    const timeSeries = dateStrings.map((date) => {
      const existing = seriesMap.get(date);
      const dailyRevenuePaise = existing ? existing.dailyRevenuePaise : 0;
      const dailyNetEarningsPaise = existing ? existing.dailyNetEarningsPaise : 0;
      const unitsSold = existing ? existing.unitsSold : 0;

      return {
        date,
        dailyRevenuePaise,
        dailyNetEarningsPaise,
        unitsSold,
        dailyRevenueInr: (dailyRevenuePaise / 100).toFixed(2),
        dailyNetEarningsInr: (dailyNetEarningsPaise / 100).toFixed(2),
      };
    });

    return res.status(200).json({
      success: true,
      days,
      timeSeries,
      data: timeSeries,
    });
  } catch (err) {
    console.error('Time-series analytics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate time-series analytics',
      error: err.message,
    });
  }
}

export async function exportCreatorStatementCSV(req, res) {
  try {
    const creatorId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="promptforge-creator-statement-${today}.csv"`
    );

    const headers = [
      'Order ID',
      'Date (UTC)',
      'Prompt Title',
      'Buyer Username',
      'Gross Amount (INR)',
      'Platform Fee (10% INR)',
      'Net Payout (INR)',
      'Payment ID',
    ];
    res.write(headers.join(',') + '\r\n');

    const cursor = Order.find({ sellerId: creatorId, status: 'PAID' })
      .populate('buyerId', 'username')
      .populate('promptId', 'title')
      .sort({ paidAt: -1 })
      .cursor();

    for await (const order of cursor) {
      const orderId = order._id.toString();
      const dateUtc = order.paidAt
        ? new Date(order.paidAt).toISOString()
        : new Date(order.createdAt).toISOString();
      const promptTitle = order.promptId?.title || 'Generative Prompt';
      const buyerUsername = order.buyerId?.username || 'Verified Buyer';
      const grossInr = ((order.amountPaise || 0) / 100).toFixed(2);
      const feeInr = (Math.round((order.amountPaise || 0) * 0.1) / 100).toFixed(2);
      const netInr = (Math.round((order.amountPaise || 0) * 0.9) / 100).toFixed(2);
      const paymentId = order.razorpayPaymentId || 'N/A';

      const row = [
        escapeCSV(orderId),
        escapeCSV(dateUtc),
        escapeCSV(promptTitle),
        escapeCSV(buyerUsername),
        escapeCSV(grossInr),
        escapeCSV(feeInr),
        escapeCSV(netInr),
        escapeCSV(paymentId),
      ].join(',');

      res.write(row + '\r\n');
    }

    res.end();
  } catch (err) {
    console.error('CSV export error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to export creator statement',
        error: err.message,
      });
    }
    res.end();
  }
}
