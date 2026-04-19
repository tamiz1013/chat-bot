const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');
const UsageLog = require('../models/UsageLog');

const KOKORO_URL = process.env.KOKORO_URL || 'http://localhost:8880';

// POST /v1/tts — proxy to Kokoro TTS, returns audio
router.post('/', apiKeyAuth, rateLimiter, async (req, res) => {
  const startTime = Date.now();
  const apiKey = req.apiKey;

  const { input, voice, response_format, speed } = req.body;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ error: '"input" (string) is required' });
  }

  const sanitizedInput = input.trim().slice(0, 5000);
  const selectedVoice = voice || 'af_heart';
  const format = ['wav', 'mp3', 'opus', 'flac', 'aac', 'pcm'].includes(response_format)
    ? response_format
    : 'mp3';

  try {
    const ttsRes = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: sanitizedInput,
        voice: selectedVoice,
        response_format: format,
        ...(speed != null && { speed: Math.max(0.5, Math.min(2.0, Number(speed))) }),
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => 'Unknown TTS error');
      return res.status(502).json({ error: `Kokoro TTS error: ${errText}` });
    }

    const contentTypes = {
      mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/opus',
      flac: 'audio/flac', aac: 'audio/aac', pcm: 'audio/pcm',
    };
    const contentType = ttsRes.headers.get('content-type') || contentTypes[format] || 'audio/mpeg';

    await UsageLog.create({
      userId: apiKey.userId,
      botId: req.bot._id,
      apiKeyId: apiKey._id,
      tokensEstimate: sanitizedInput.length,
      responseTimeMs: Date.now() - startTime,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="speech.${format}"`);

    const reader = ttsRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error('v1/tts error:', err.message);
    res.status(500).json({ error: 'TTS request failed. Is Kokoro running?' });
  }
});

// GET /v1/tts/voices — list available Kokoro voices
router.get('/voices', apiKeyAuth, async (req, res) => {
  try {
    const voicesRes = await fetch(`${KOKORO_URL}/v1/audio/voices`);
    if (voicesRes.ok) {
      const data = await voicesRes.json();
      return res.json(data);
    }
  } catch {
    // Kokoro may not expose this endpoint
  }

  res.json({
    voices: ['af_heart', 'af_bella', 'af_sarah', 'am_adam', 'am_michael', 'bf_emma', 'bm_george'],
    note: 'Pass any Kokoro voice name in the "voice" field',
  });
});

module.exports = router;
