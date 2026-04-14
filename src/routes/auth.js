const express = require('express');
const { signup, login, logout } = require('../controllers/authController');
const { verifySupabaseJwt } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', verifySupabaseJwt, logout);

module.exports = router;
