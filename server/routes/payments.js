const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const PaymentConfig = require('../models/PaymentConfig');
const PLAN_LIMITS = require('../config/plans');

// GET /api/payments/config — get payment options (public prices + wallets)
router.get('/config', async (req, res) => {
  try {
    const config = await PaymentConfig.getConfig();
    const activeWallets = (config.cryptoWallets || []).filter((w) => w.isActive && w.address);

    res.json({
      prices: config.prices,
      methods: {
        crypto: {
          available: activeWallets.length > 0,
          networks: activeWallets.map((w) => ({
            network: w.network,
            address: w.address,
            coin: w.coin,
          })),
        },
        binance_pay: {
          available: !!(config.binancePayQr || config.binancePayId),
          qrCode: config.binancePayQr || '',
          payId: config.binancePayId || '',
        },
      },
    });
  } catch (err) {
    console.error('Payment config error:', err.message);
    res.status(500).json({ error: 'Failed to load payment config' });
  }
});

// POST /api/payments/create — user initiates an upgrade
router.post('/create', async (req, res) => {
  try {
    const { plan, paymentMethod, network } = req.body;

    if (!['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose pro or enterprise.' });
    }
    if (!['crypto', 'binance_pay'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if user already has a pending transaction
    const existing = await Transaction.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'submitted'] },
    });
    if (existing) {
      return res.status(409).json({
        error: 'You already have a pending transaction. Wait for it to be reviewed or cancel it first.',
        transaction: existing,
      });
    }

    const config = await PaymentConfig.getConfig();
    const amount = config.prices[plan] || 0;

    const txData = {
      userId: req.user._id,
      plan,
      amount,
      currency: 'USDT',
      paymentMethod,
    };

    if (paymentMethod === 'crypto') {
      if (!network) {
        return res.status(400).json({ error: 'Network is required for crypto payment' });
      }
      const wallet = (config.cryptoWallets || []).find(
        (w) => w.network === network && w.isActive && w.address
      );
      if (!wallet) {
        return res.status(400).json({ error: `No wallet configured for ${network}` });
      }
      txData.network = network;
      txData.walletAddress = wallet.address;
    }

    const transaction = await Transaction.create(txData);

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('Create payment error:', err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id/submit — user submits transaction ID after paying
router.put('/:id/submit', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 5) {
      return res.status(400).json({ error: 'Valid transaction ID / hash is required' });
    }

    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: `Transaction is already ${tx.status}` });
    }

    tx.transactionId = transactionId.trim();
    tx.status = 'submitted';
    await tx.save();

    res.json({ transaction: tx });
  } catch (err) {
    console.error('Submit payment error:', err.message);
    res.status(500).json({ error: 'Failed to submit transaction' });
  }
});

// GET /api/payments/my — user's own transactions
router.get('/my', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort('-createdAt')
      .lean();
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// DELETE /api/payments/:id — cancel a pending transaction
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending transactions' });
    }
    await tx.deleteOne();
    res.json({ message: 'Transaction cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
});

module.exports = router;
