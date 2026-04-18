const express = require('express');
const router = express.Router();
const Bot = require('../models/Bot');
const ApiKey = require('../models/ApiKey');
const PLAN_LIMITS = require('../config/plans');

// GET /api/bots — list user's bots
router.get('/', async (req, res) => {
  try {
    const bots = await Bot.find({ userId: req.user._id }).sort('-createdAt');
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// POST /api/bots — create a bot
router.post('/', async (req, res) => {
  try {
    const limits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS.free;
    const count = await Bot.countByUser(req.user._id);

    if (count >= limits.bots) {
      return res.status(403).json({
        error: `Bot limit reached (${limits.bots}). Upgrade your plan.`,
      });
    }

    const { name, systemPrompt, settings, allowedOrigins } = req.body;
    if (!name) return res.status(400).json({ error: 'Bot name is required' });

    const bot = await Bot.create({
      userId: req.user._id,
      name,
      systemPrompt: systemPrompt || undefined,
      settings: settings || undefined,
      allowedOrigins: allowedOrigins || [],
    });

    // Auto-generate an API key for the new bot
    const { raw, prefix, keyHash } = ApiKey.generateKey();
    await ApiKey.create({
      userId: req.user._id,
      botId: bot._id,
      keyHash,
      prefix,
      rawKey: raw,
      label: 'Default',
    });

    res.status(201).json({ bot, apiKey: raw });
  } catch (err) {
    console.error('Create bot error:', err.message);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// GET /api/bots/:id
router.get('/:id', async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// PUT /api/bots/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, systemPrompt, settings, allowedOrigins, isActive } = req.body;
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    if (name !== undefined) bot.name = name;
    if (systemPrompt !== undefined) bot.systemPrompt = systemPrompt;
    if (settings !== undefined) Object.assign(bot.settings, settings);
    if (allowedOrigins !== undefined) bot.allowedOrigins = allowedOrigins;
    if (isActive !== undefined) bot.isActive = isActive;

    await bot.save();
    res.json({ bot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

// DELETE /api/bots/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await Bot.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!result) return res.status(404).json({ error: 'Bot not found' });
    // Also remove associated API keys
    const ApiKey = require('../models/ApiKey');
    await ApiKey.deleteMany({ botId: req.params.id });
    res.json({ message: 'Bot and associated API keys deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// ── Knowledge Base ──────────────────────

// POST /api/bots/:id/knowledge — add entry
router.post('/:id/knowledge', async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const limits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS.free;
    if (bot.knowledgeBase.length >= limits.knowledgeEntries) {
      return res.status(403).json({
        error: `Knowledge limit reached (${limits.knowledgeEntries}). Upgrade your plan.`,
      });
    }

    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    bot.knowledgeBase.push({ title, content, category });
    await bot.save();
    res.status(201).json({ knowledgeBase: bot.knowledgeBase });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add knowledge entry' });
  }
});

// PUT /api/bots/:botId/knowledge/:entryId
router.put('/:botId/knowledge/:entryId', async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.botId, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const entry = bot.knowledgeBase.id(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Knowledge entry not found' });

    const { title, content, category } = req.body;
    if (title !== undefined) entry.title = title;
    if (content !== undefined) entry.content = content;
    if (category !== undefined) entry.category = category;

    await bot.save();
    res.json({ knowledgeBase: bot.knowledgeBase });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update knowledge entry' });
  }
});

// DELETE /api/bots/:botId/knowledge/:entryId
router.delete('/:botId/knowledge/:entryId', async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.botId, userId: req.user._id });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    bot.knowledgeBase.pull({ _id: req.params.entryId });
    await bot.save();
    res.json({ knowledgeBase: bot.knowledgeBase });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete knowledge entry' });
  }
});

module.exports = router;
