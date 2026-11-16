const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All administrative routes require role 'admin'
router.use(requireAuth, requireRole('admin'));

router.get('/users', AdminController.listUsers);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.put('/users/:id/role', AdminController.updateUserRole);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

module.exports = router;

