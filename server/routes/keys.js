const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const Bot = require('../models/Bot');

// GET /api/keys — list user's API keys (masked)
router.get('/', async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user._id })
      .populate('botId', 'name')
      .sort('-createdAt');

    const masked = keys.map((k) => ({
      _id: k._id,
      prefix: k.prefix,
      label: k.label,
      botId: k.botId,
      isActive: k.isActive,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));

    res.json({ keys: masked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/keys — generate new key
router.post('/', async (req, res) => {
  try {
    const { botId, label } = req.body;
    if (!botId) return res.status(400).json({ error: 'botId is required' });

    // Verify bot belongs to user
    const bot = await Bot.findOne({ _id: botId, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const { raw, prefix, keyHash } = ApiKey.generateKey();

    const apiKey = await ApiKey.create({
      userId: req.user._id,
      botId,
      keyHash,
      prefix,
      label: label || 'Default',
    });

    // Return raw key only this once
    res.status(201).json({
      key: raw,
      _id: apiKey._id,
      prefix: apiKey.prefix,
      label: apiKey.label,
      botId: apiKey.botId,
      message: 'Save this key now — it won\'t be shown again.',
    });
  } catch (err) {
    console.error('Generate key error:', err.message);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// DELETE /api/keys/:id — revoke key
router.delete('/:id', async (req, res) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!key) return res.status(404).json({ error: 'API key not found' });

    key.isActive = false;
    await key.save();
    res.json({ message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

module.exports = router;
