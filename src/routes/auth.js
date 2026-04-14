const express = require('express');
const { signup, login, logout, oauthSync } = require('../controllers/authController');
const { verifySupabaseJwt } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', verifySupabaseJwt, logout);
router.post('/sync', verifySupabaseJwt, oauthSync);

module.exports = router;
