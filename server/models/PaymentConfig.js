const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  // Crypto wallet addresses per network
  cryptoWallets: [{
    network: { type: String, required: true }, // TRC20, ERC20, BEP20, SOL, etc.
    address: { type: String, default: '' },
    coin: { type: String, default: 'USDT' },
    isActive: { type: Boolean, default: true },
  }],

  // Binance Pay QR code URL (admin uploads)
  binancePayQr: { type: String, default: '' },
  binancePayId: { type: String, default: '' }, // Binance Pay ID

  // Plan prices
  prices: {
    pro: { type: Number, default: 29 },
    enterprise: { type: Number, default: 99 },
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Singleton pattern — only one config doc
paymentConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      cryptoWallets: [
        { network: 'TRC20', address: '', coin: 'USDT' },
        { network: 'ERC20', address: '', coin: 'USDT' },
        { network: 'BEP20', address: '', coin: 'USDT' },
      ],
      prices: { pro: 29, enterprise: 99 },
    });
  }
  return config;
};

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);
