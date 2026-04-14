const express = require('express');
const { updateLocation, listResponders } = require('../controllers/responderController');
const { verifySupabaseJwt } = require('../middleware/auth');

const locationRouter = express.Router();
locationRouter.use(verifySupabaseJwt);
locationRouter.patch('/location', updateLocation);

const respondersListRouter = express.Router();
respondersListRouter.use(verifySupabaseJwt);
respondersListRouter.get('/', listResponders);

module.exports = { locationRouter, respondersListRouter };
