const express = require('express');
const router = express.Router();
const KnowledgeController = require('../controllers/knowledgeController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateKnowledge } = require('../middleware/validationMiddleware');

// Public Library endpoints
router.get('/library', optionalAuth, KnowledgeController.getLibrary);
router.get('/featured', KnowledgeController.getFeatured);
router.get('/details/:id_or_slug', optionalAuth, KnowledgeController.getDetails);

// Expert and Learner specific routes
router.get('/my/submissions', requireAuth, requireRole('expert', 'admin'), KnowledgeController.getMySubmissions);
router.get('/my/bookmarks', requireAuth, KnowledgeController.getMyBookmarks);
router.post('/:id/bookmark', requireAuth, KnowledgeController.toggleBookmark);

// CRUD
router.post('/', requireAuth, requireRole('expert', 'admin'), validateKnowledge, KnowledgeController.create);
router.put('/:id', requireAuth, requireRole('expert', 'admin'), KnowledgeController.update);
router.delete('/:id', requireAuth, requireRole('expert', 'admin'), KnowledgeController.delete);

module.exports = router;

