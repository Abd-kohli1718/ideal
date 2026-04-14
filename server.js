require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const alertsRoutes = require('./src/routes/alerts');
const simulateRoutes = require('./src/routes/simulate');
const { locationRouter, respondersListRouter } = require('./src/routes/responder');

const app = express();

const frontend = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: frontend && frontend.length > 0 ? frontend : true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/responder', locationRouter);
app.use('/api/responders', respondersListRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Signal platform API listening on port ${port}`);
});
