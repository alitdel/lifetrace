const express = require('express');
const router = express.Router();
const LearningController = require('../controllers/learningController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Learner routes
router.post('/:knowledgeId/enroll', requireAuth, LearningController.enroll);
router.get('/:knowledgeId/progress', requireAuth, LearningController.getProgress);
router.post('/:knowledgeId/steps/:stepId/complete', requireAuth, LearningController.completeStep);
router.get('/my/courses', requireAuth, LearningController.getMyEnrolledCourses);
router.post('/:knowledgeId/submit-practical', requireAuth, LearningController.submitPractical);

// Evaluation routes
router.get('/submissions/all', requireAuth, requireRole('expert', 'reviewer', 'admin'), LearningController.getAllSubmissions);
router.post('/submissions/:submissionId/grade', requireAuth, requireRole('expert', 'reviewer', 'admin'), LearningController.gradeSubmission);

module.exports = router;

