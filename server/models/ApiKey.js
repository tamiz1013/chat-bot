const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', required: true, index: true },
  keyHash: { type: String, required: true, unique: true },
  prefix: { type: String, required: true, index: true }, // first 8 chars for lookup
  rawKey: { type: String }, // stored so user can always view/copy
  label: { type: String, default: 'Default', trim: true },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
}, { timestamps: true });

// Generate a new API key, return the raw key (only shown once)
apiKeySchema.statics.generateKey = function () {
  const raw = `sk-cb-${crypto.randomBytes(24).toString('hex')}`;
  const prefix = raw.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, prefix, keyHash };
};

// Find key by raw value
apiKeySchema.statics.findByRawKey = async function (rawKey) {
  const prefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return this.findOne({ prefix, keyHash, isActive: true });
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
