const express = require('express');
const rateLimit = require('express-rate-limit');
const { listMessages, createMessage } = require('../controllers/messageController');
const { verifySupabaseJwt } = require('../middleware/auth');

const router = express.Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please slow down.' },
});

router.use(verifySupabaseJwt);

// GET /api/alerts/:alertId/messages — list messages for an alert
router.get('/:alertId/messages', listMessages);

// POST /api/alerts/:alertId/messages — send a message
router.post('/:alertId/messages', messageLimiter, createMessage);

module.exports = router;
