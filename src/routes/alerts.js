const express = require('express');
const {
  createAlert,
  listAlerts,
  getAlert,
  acceptAlert,
  resolveAlert,
} = require('../controllers/alertController');
const { verifySupabaseJwt, requireResponder } = require('../middleware/auth');

const router = express.Router();

router.use(verifySupabaseJwt);

router.post('/', createAlert);
router.get('/', listAlerts);
router.get('/:id', getAlert);
router.patch('/:id/accept', requireResponder, acceptAlert);
router.patch('/:id/resolve', requireResponder, resolveAlert);

module.exports = router;
