const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  messages: [messageSchema],
  metadata: {
    origin: String,
    userAgent: String,
  },
}, { timestamps: true });

conversationSchema.index({ botId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
