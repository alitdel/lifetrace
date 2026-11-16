const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);
router.post('/', requireAuth, requireRole('admin'), CategoryController.create);
router.put('/:id', requireAuth, requireRole('admin'), CategoryController.update);
router.delete('/:id', requireAuth, requireRole('admin'), CategoryController.toggleActive);

module.exports = router;

