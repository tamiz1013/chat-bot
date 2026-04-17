const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Bot = require('../models/Bot');
const ApiKey = require('../models/ApiKey');
const Transaction = require('../models/Transaction');
const UsageLog = require('../models/UsageLog');
const Conversation = require('../models/Conversation');
const PaymentConfig = require('../models/PaymentConfig');

// ── Overview Stats ──
router.get('/stats', async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalBots,
      totalApiKeys,
      totalConversations,
      monthlyMessages,
      pendingTransactions,
      totalRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      Bot.countDocuments(),
      ApiKey.countDocuments({ isActive: true }),
      Conversation.countDocuments(),
      UsageLog.countDocuments({ timestamp: { $gte: startOfMonth } }),
      Transaction.countDocuments({ status: 'submitted' }),
      Transaction.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalBots,
      totalApiKeys,
      totalConversations,
      monthlyMessages,
      pendingTransactions,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Users ──
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Attach bot count for each user
    const userIds = users.map((u) => u._id);
    const botCounts = await Bot.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const botCountMap = Object.fromEntries(botCounts.map((b) => [b._id.toString(), b.count]));

    const enriched = users.map((u) => ({
      ...u,
      botCount: botCountMap[u._id.toString()] || 0,
    }));

    res.json({ users: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id — update user (plan, role, isActive)
router.put('/users/:id', async (req, res) => {
  try {
    const { plan, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) user.plan = plan;
    if (role && ['user', 'admin'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── Transactions ──
router.get('/transactions', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const status = req.query.status || '';

    const filter = {};
    if (status && ['pending', 'submitted', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'name email plan')
        .populate('reviewedBy', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PUT /api/admin/transactions/:id — approve or reject
router.put('/transactions/:id', async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (!['pending', 'submitted'].includes(tx.status)) {
      return res.status(400).json({ error: `Transaction already ${tx.status}` });
    }

    tx.status = action === 'approve' ? 'approved' : 'rejected';
    tx.adminNote = adminNote || '';
    tx.reviewedBy = req.user._id;
    tx.reviewedAt = new Date();
    await tx.save();

    // If approved, upgrade the user's plan
    if (action === 'approve') {
      await User.findByIdAndUpdate(tx.userId, { plan: tx.plan });
    }

    const updated = await Transaction.findById(tx._id)
      .populate('userId', 'name email plan')
      .populate('reviewedBy', 'name')
      .lean();

    res.json({ transaction: updated });
  } catch (err) {
    console.error('Transaction review error:', err.message);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// ── Bots (all bots across platform) ──
router.get('/bots', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const [bots, total] = await Promise.all([
      Bot.find()
        .populate('userId', 'name email')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bot.countDocuments(),
    ]);

    res.json({ bots, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// ── Payment Config ──
router.get('/payment-config', async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment config' });
  }
});

router.put('/payment-config', async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    const { cryptoWallets, binancePayQr, binancePayId, prices } = req.body;

    if (cryptoWallets) config.cryptoWallets = cryptoWallets;
    if (typeof binancePayQr === 'string') config.binancePayQr = binancePayQr;
    if (typeof binancePayId === 'string') config.binancePayId = binancePayId;
    if (prices) {
      if (prices.pro) config.prices.pro = prices.pro;
      if (prices.enterprise) config.prices.enterprise = prices.enterprise;
    }
    config.updatedBy = req.user._id;

    await config.save();
    res.json({ config });
  } catch (err) {
    console.error('Update payment config error:', err.message);
    res.status(500).json({ error: 'Failed to update payment config' });
  }
});

module.exports = router;
