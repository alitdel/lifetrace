const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/stats', requireAuth, ReportController.getStats);
router.get('/analytics', requireAuth, ReportController.getAnalytics);

module.exports = router;

