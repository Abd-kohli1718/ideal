const express = require('express');
const { simulateSocial, simulateSos } = require('../controllers/simulateController');
const { verifySupabaseJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifySupabaseJwt);

router.post('/social', simulateSocial);
router.post('/sos', simulateSos);

module.exports = router;
