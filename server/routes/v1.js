const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimiter } = require('../middleware/rateLimiter');
const Conversation = require('../models/Conversation');
const UsageLog = require('../models/UsageLog');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.MODEL || 'gemma4:e4b';

// Build system prompt from bot config + knowledge base
function buildSystemPrompt(bot) {
  let prompt = bot.systemPrompt + '\n\n';

  if (bot.knowledgeBase.length > 0) {
    prompt += '=== BUSINESS KNOWLEDGE BASE ===\n';
    for (const entry of bot.knowledgeBase) {
      prompt += `\n## ${entry.title}`;
      if (entry.category && entry.category !== 'general') {
        prompt += ` [${entry.category}]`;
      }
      prompt += `\n${entry.content}\n`;
    }
    prompt += '\n=== END OF KNOWLEDGE BASE ===\n\n';
    prompt += 'IMPORTANT RULES:\n';
    prompt += '1. Answer ONLY based on the business knowledge above.\n';
    prompt += '2. If the question is not related to the business information provided, politely say: "' + bot.settings.fallbackMessage + '"\n';
    prompt += '3. Be friendly, concise, and professional.\n';
    prompt += '4. Do NOT make up information that is not in the knowledge base.\n';
  }

  return prompt;
}

// POST /v1/chat — public API (API key auth)
router.post('/chat', apiKeyAuth, rateLimiter, async (req, res) => {
  const startTime = Date.now();
  const bot = req.bot;
  const apiKey = req.apiKey;

  const { message, sessionId: clientSessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message (string) is required' });
  }

  // Sanitize: limit message length
  const sanitizedMessage = message.trim().slice(0, 2000);
  const sessionId = clientSessionId || crypto.randomUUID();

  try {
    // Get or create conversation
    let conversation = await Conversation.findOne({ botId: bot._id, sessionId });
    if (!conversation) {
      conversation = new Conversation({
        botId: bot._id,
        sessionId,
        messages: [],
        metadata: {
          origin: req.headers.origin || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: sanitizedMessage });

    // Build messages array for Ollama
    const systemPrompt = buildSystemPrompt(bot);
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      // Include last 20 messages for context (limit history)
      ...conversation.messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Call Ollama
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: bot.settings.temperature,
          num_predict: bot.settings.maxTokens,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return res.status(502).json({ error: `LLM error: ${errText}` });
    }

    const data = await ollamaRes.json();
    const assistantContent = data.message?.content || 'Sorry, I could not generate a response.';

    // Save assistant message
    conversation.messages.push({ role: 'assistant', content: assistantContent });
    await conversation.save();

    // Log usage
    await UsageLog.create({
      userId: apiKey.userId,
      botId: bot._id,
      apiKeyId: apiKey._id,
      tokensEstimate: (data.eval_count || 0) + (data.prompt_eval_count || 0),
      responseTimeMs: Date.now() - startTime,
    });

    res.json({
      reply: assistantContent,
      sessionId,
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error('v1/chat error:', err.message);
    res.status(500).json({ error: 'Chat request failed. Is Ollama running?' });
  }
});

// POST /v1/chat/stream — SSE streaming version
router.post('/chat/stream', apiKeyAuth, rateLimiter, async (req, res) => {
  const startTime = Date.now();
  const bot = req.bot;
  const apiKey = req.apiKey;

  const { message, sessionId: clientSessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message (string) is required' });
  }

  const sanitizedMessage = message.trim().slice(0, 2000);
  const sessionId = clientSessionId || crypto.randomUUID();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let conversation = await Conversation.findOne({ botId: bot._id, sessionId });
    if (!conversation) {
      conversation = new Conversation({
        botId: bot._id,
        sessionId,
        messages: [],
        metadata: {
          origin: req.headers.origin || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    }

    conversation.messages.push({ role: 'user', content: sanitizedMessage });

    const systemPrompt = buildSystemPrompt(bot);
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ];

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: bot.settings.temperature,
          num_predict: bot.settings.maxTokens,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      res.write(`data: ${JSON.stringify({ error: `LLM error: ${errText}` })}\n\n`);
      return res.end();
    }

    // Send sessionId as first event
    res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullResponse += parsed.message.content;
            res.write(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`);
          }
          if (parsed.done) {
            // Save conversation
            conversation.messages.push({ role: 'assistant', content: fullResponse });
            await conversation.save();

            // Log usage
            await UsageLog.create({
              userId: apiKey.userId,
              botId: bot._id,
              apiKeyId: apiKey._id,
              tokensEstimate: (parsed.eval_count || 0) + (parsed.prompt_eval_count || 0),
              responseTimeMs: Date.now() - startTime,
            });

            res.write('data: [DONE]\n\n');
            return res.end();
          }
        } catch {
          // skip malformed
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('v1/chat/stream error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Chat failed. Is Ollama running?' })}\n\n`);
    res.end();
  }
});

// GET /v1/chat/session/:sessionId — get conversation history
router.get('/chat/session/:sessionId', apiKeyAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      botId: req.bot._id,
      sessionId: req.params.sessionId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: conversation.sessionId,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

module.exports = router;
