const mongoose = require('mongoose');

const knowledgeEntrySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  category: { type: String, default: 'general', trim: true },
}, { _id: true });

const botSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  systemPrompt: {
    type: String,
    default: 'You are a helpful customer support assistant. Answer questions based only on the provided business information. If you don\'t know, say so politely.',
  },
  knowledgeBase: [knowledgeEntrySchema],
  settings: {
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 1024, min: 64, max: 4096 },
    greeting: { type: String, default: 'Hello! How can I help you today?' },
    fallbackMessage: { type: String, default: 'I\'m sorry, I don\'t have information about that. Please contact our support team.' },
  },
  allowedOrigins: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Plan-based limits
botSchema.statics.countByUser = function (userId) {
  return this.countDocuments({ userId });
};

module.exports = mongoose.model('Bot', botSchema);
