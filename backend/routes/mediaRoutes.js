const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadMedia, uploadAvatar, uploadSubmission } = require('../middleware/uploadMiddleware');

router.post('/upload', requireAuth, requireRole('expert', 'admin'), uploadMedia.single('file'), MediaController.uploadMedia);
router.post('/avatar', requireAuth, uploadAvatar.single('avatar'), MediaController.uploadAvatar);
router.post('/submission', requireAuth, requireRole('learner'), uploadSubmission.single('evidence'), MediaController.uploadSubmissionFile);

module.exports = router;

