require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');

// Route imports
const chatRouter = require('./routes/chat');
const authRouter = require('./routes/auth');
const botsRouter = require('./routes/bots');
const keysRouter = require('./routes/keys');
const dashboardRouter = require('./routes/dashboard');
const v1Router = require('./routes/v1');
const ttsRouter = require('./routes/tts');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const { adminMiddleware } = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// ── Security ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.set('trust proxy', 1);

// ── CORS ──
const isProd = process.env.NODE_ENV === 'production';
const dashboardOrigins = isProd
  ? ['https://chatbotagent.chat', 'https://www.chatbotagent.chat']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173', 'https://chatbotagent.chat'];
const dashboardCors = cors({ origin: dashboardOrigins, credentials: true });
// Public API + widget: any origin (protected by API key auth)
const publicCors = cors();

app.use(express.json({ limit: '1mb' }));

// ── Internal routes (your own chatbot UI) ──
// Fixed order:
app.use('/api/auth', dashboardCors, authRouter);                  // ← auth first (no authMiddleware)
app.use('/api/bots', dashboardCors, authMiddleware, botsRouter);
app.use('/api/keys', dashboardCors, authMiddleware, keysRouter);
app.use('/api/dashboard', dashboardCors, authMiddleware, dashboardRouter);
app.use('/api/payments', dashboardCors, authMiddleware, paymentsRouter);
app.use('/api/admin', dashboardCors, authMiddleware, adminMiddleware, adminRouter);
app.use('/api', dashboardCors, authMiddleware, chatRouter);       // ← catch-all LAST

// ── Public API (API key protected) — open CORS ──
app.use('/v1/tts', publicCors, ttsRouter);
app.use('/v1', publicCors, v1Router);


// ── Embeddable widget — open CORS + cross-origin resource policy ──
app.use('/widget', publicCors, (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('public/widget'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Connecting to Ollama at ${process.env.OLLAMA_URL}`);
  console.log(`Public API: http://localhost:${PORT}/v1/chat`);
  console.log(`Dashboard API: http://localhost:${PORT}/api/`);
});
