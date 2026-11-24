const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, NotificationController.getNotifications);
router.put('/:id/read', requireAuth, NotificationController.markAsRead);
router.put('/read-all', requireAuth, NotificationController.markAllAsRead);

module.exports = router;

