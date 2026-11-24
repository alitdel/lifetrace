const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/pending', requireAuth, requireRole('reviewer', 'admin'), ReviewController.getPendingSubmissions);
router.post('/:id/start', requireAuth, requireRole('reviewer', 'admin'), ReviewController.startReview);
router.post('/:id/decision', requireAuth, requireRole('reviewer', 'admin'), ReviewController.submitDecision);
router.get('/:id/history', requireAuth, ReviewController.getHistory);

module.exports = router;

