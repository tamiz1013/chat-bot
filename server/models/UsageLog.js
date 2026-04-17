const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true },
  apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true },
  tokensEstimate: { type: Number, default: 0 },
  responseTimeMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

// Index for monthly aggregation
usageLogSchema.index({ userId: 1, timestamp: 1 });

module.exports = mongoose.model('UsageLog', usageLogSchema);
