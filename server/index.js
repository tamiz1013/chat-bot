require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');

// Route imports
const chatRouter = require('./routes/chat');
const authRouter = require('./routes/auth');
const botsRouter = require('./routes/bots');
const keysRouter = require('./routes/keys');
const dashboardRouter = require('./routes/dashboard');
const v1Router = require('./routes/v1');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const { adminMiddleware } = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// ── CORS ──
// Dashboard routes: restricted to known dev origins
const dashboardCors = cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'] });
// Public API + widget: any origin (protected by API key auth)
const publicCors = cors();

app.use(express.json());

// ── Internal routes (your own chatbot UI) ──
app.use('/api', dashboardCors, chatRouter);

// ── Dashboard API (JWT protected) ──
app.use('/api/auth', dashboardCors, authRouter);
app.use('/api/bots', dashboardCors, authMiddleware, botsRouter);
app.use('/api/keys', dashboardCors, authMiddleware, keysRouter);
app.use('/api/dashboard', dashboardCors, authMiddleware, dashboardRouter);
app.use('/api/payments', dashboardCors, authMiddleware, paymentsRouter);

// ── Admin API (JWT + admin role) ──
app.use('/api/admin', dashboardCors, authMiddleware, adminMiddleware, adminRouter);

// ── Public API (API key protected) — open CORS ──
app.use('/v1', publicCors, v1Router);

// ── Embeddable widget — open CORS ──
app.use('/widget', publicCors, express.static('public/widget'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Connecting to Ollama at ${process.env.OLLAMA_URL}`);
  console.log(`Public API: http://localhost:${PORT}/v1/chat`);
  console.log(`Dashboard API: http://localhost:${PORT}/api/`);
});
