require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const alertsRoutes = require('./src/routes/alerts');
const simulateRoutes = require('./src/routes/simulate');
const { locationRouter, respondersListRouter } = require('./src/routes/responder');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// === CORS: only allow localhost in development ===
const frontend = process.env.FRONTEND_URL;
const allowedOrigins = frontend ? frontend.split(',').map(s => s.trim()) : [];
if (!isProd) {
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://127.0.0.1:3000');
}

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// === Body size limit (C4/M4) ===
app.use(express.json({ limit: '1mb' }));

// === Rate limiting (C6) ===
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

const alertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many alerts, please wait before sending another' },
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/responder', locationRouter);
app.use('/api/responders', respondersListRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Payload too large' });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Signal platform API listening on port ${port}`);
});
