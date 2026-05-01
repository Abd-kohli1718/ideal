const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  createAlert,
  listAlerts,
  getAlert,
  acceptAlert,
  dispatchAlert,
  resolveAlert,
  deleteAlert,
} = require('../controllers/alertController');
const { verifySupabaseJwt, requireResponder } = require('../middleware/auth');

const router = express.Router();

const alertCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many alerts. Please wait before sending another.' },
});

router.use(verifySupabaseJwt);

router.post('/', alertCreateLimiter, createAlert);
router.get('/', listAlerts);
router.get('/:id', getAlert);
router.patch('/:id/accept', requireResponder, acceptAlert);
router.patch('/:id/dispatch', requireResponder, dispatchAlert);
router.patch('/:id/resolve', requireResponder, resolveAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
