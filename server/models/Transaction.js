const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['pro', 'enterprise'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  paymentMethod: { type: String, enum: ['crypto', 'binance_pay'], required: true },

  // Crypto-specific
  network: { type: String }, // e.g. 'TRC20', 'ERC20', 'BEP20'
  walletAddress: { type: String }, // address shown to user

  // User-submitted proof
  transactionId: { type: String, trim: true }, // tx hash submitted by user

  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
  },

  adminNote: { type: String }, // admin can leave a note when approving/rejecting
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
