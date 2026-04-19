const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');
const UsageLog = require('../models/UsageLog');

const STT_URL = process.env.STT_URL || 'http://localhost:8000';

// POST /v1/stt — proxy audio to Whisper STT, returns transcription
router.post('/', apiKeyAuth, rateLimiter, async (req, res) => {
  const startTime = Date.now();
  const apiKey = req.apiKey;

  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      error: 'Content-Type must be multipart/form-data. Send audio file as "file" field.',
    });
  }

  try {
    // Collect raw request body to forward as-is to STT server
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const sttRes = await fetch(`${STT_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => 'Unknown STT error');
      return res.status(502).json({ error: `STT engine error: ${errText}` });
    }

    const data = await sttRes.json();

    await UsageLog.create({
      userId: apiKey.userId,
      botId: req.bot._id,
      apiKeyId: apiKey._id,
      tokensEstimate: (data.text || '').length,
      responseTimeMs: Date.now() - startTime,
    });

    res.json(data);
  } catch (err) {
    console.error('v1/stt error:', err.message);
    res.status(500).json({ error: 'STT request failed. Is the Whisper server running?' });
  }
});

module.exports = router;
