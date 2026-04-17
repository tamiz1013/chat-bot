const UsageLog = require('../models/UsageLog');
const PLAN_LIMITS = require('../config/plans');

// Check monthly usage limit before allowing a chat request
const rateLimiter = async (req, res, next) => {
  try {
    const bot = req.bot;
    const apiKey = req.apiKey;

    // Get user's plan
    const User = require('../models/User');
    const user = await User.findById(apiKey.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

    // Count messages this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await UsageLog.countDocuments({
      userId: user._id,
      timestamp: { $gte: startOfMonth },
    });

    if (monthlyUsage >= limits.messagesPerMonth) {
      return res.status(429).json({
        error: 'Monthly message limit reached. Please upgrade your plan.',
        limit: limits.messagesPerMonth,
        used: monthlyUsage,
      });
    }

    req.planUser = user;
    req.planLimits = limits;
    next();
  } catch (err) {
    console.error('Rate limiter error:', err.message);
    next(); // fail open — don't block on rate-limit errors
  }
};

module.exports = { rateLimiter };
