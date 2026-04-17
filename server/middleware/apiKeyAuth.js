const ApiKey = require('../models/ApiKey');
const Bot = require('../models/Bot');

// Validate API key for public /v1/* endpoints
const apiKeyAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API key required. Pass as Bearer token.' });
  }

  const rawKey = header.split(' ')[1];
  if (!rawKey.startsWith('sk-cb-')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  try {
    const apiKey = await ApiKey.findByRawKey(rawKey);
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    const bot = await Bot.findById(apiKey.botId);
    if (!bot || !bot.isActive) {
      return res.status(404).json({ error: 'Bot not found or deactivated' });
    }

    // Origin check
    if (bot.allowedOrigins.length > 0) {
      const origin = req.headers.origin || req.headers.referer || '';
      const allowed = bot.allowedOrigins.some((o) => origin.includes(o));
      if (!allowed && origin) {
        return res.status(403).json({ error: 'Origin not allowed for this API key' });
      }
    }

    // Increment usage
    apiKey.usageCount += 1;
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    req.apiKey = apiKey;
    req.bot = bot;
    next();
  } catch (err) {
    console.error('API key auth error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { apiKeyAuth };
