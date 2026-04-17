const express = require('express');
const router = express.Router();
const UsageLog = require('../models/UsageLog');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const PLAN_LIMITS = require('../config/plans');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalBots, monthlyMessages, totalConversations] = await Promise.all([
      Bot.countDocuments({ userId }),
      UsageLog.countDocuments({ userId, timestamp: { $gte: startOfMonth } }),
      Conversation.countDocuments({
        botId: { $in: (await Bot.find({ userId }).select('_id')).map((b) => b._id) },
      }),
    ]);

    const limits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS.free;

    res.json({
      plan: req.user.plan,
      totalBots,
      botLimit: limits.bots,
      monthlyMessages,
      messageLimit: limits.messagesPerMonth,
      totalConversations,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/usage — daily breakdown for current month
router.get('/usage', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const daily = await UsageLog.aggregate([
      { $match: { userId: req.user._id, timestamp: { $gte: startOfMonth } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTimeMs' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ daily });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// GET /api/dashboard/conversations?botId=...
router.get('/conversations', async (req, res) => {
  try {
    const filter = {};
    if (req.query.botId) {
      // Verify bot belongs to user
      const bot = await Bot.findOne({ _id: req.query.botId, userId: req.user._id });
      if (!bot) return res.status(404).json({ error: 'Bot not found' });
      filter.botId = req.query.botId;
    } else {
      const botIds = (await Bot.find({ userId: req.user._id }).select('_id')).map((b) => b._id);
      filter.botId = { $in: botIds };
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const conversations = await Conversation.find(filter)
      .populate('botId', 'name')
      .sort('-updatedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Conversation.countDocuments(filter);

    res.json({ conversations, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
