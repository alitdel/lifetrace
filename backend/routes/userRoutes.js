const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/profile', requireAuth, UserController.getProfile);
router.put('/profile', requireAuth, UserController.updateProfile);
router.get('/experts', UserController.getPublicExperts);
router.get('/experts/:id', UserController.getExpertDetails);

module.exports = router;

