const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', requireAuth, requireRole('admin'), AuditController.getLogs);

module.exports = router;

