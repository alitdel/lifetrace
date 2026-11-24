const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assessmentController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/knowledge/:knowledgeId', optionalAuth, AssessmentController.getByKnowledgeId);
router.post('/:id/submit', requireAuth, AssessmentController.submitAssessment);
router.post('/', requireAuth, requireRole('expert', 'admin'), AssessmentController.createAssessment);
router.get('/my/results', requireAuth, AssessmentController.getMyResults);

module.exports = router;

