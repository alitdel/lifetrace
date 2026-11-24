const db = require('../config/db');
const AuditService = require('../services/auditService');

function getCategoryCover(slug) {
  const map = {
    'basket-making': '/assets/images/category-basket.svg',
    'mat-making': '/assets/images/category-mat.svg',
    'pottery-clay-work': '/assets/images/category-pottery.svg',
    'traditional-weaving': '/assets/images/category-weaving.svg',
    'woodcraft-carving': '/assets/images/category-woodcraft.svg',
    'beadwork': '/assets/images/category-beadwork.svg',
    'traditional-textiles': '/assets/images/category-textiles.svg',
    'handmade-household-products': '/assets/images/category-household.svg',
    'traditional-food-processing': '/assets/images/category-food.svg',
    'other-local-skills': '/assets/images/category-other.svg'
  };
  return map[slug] || '/assets/images/category-basket.svg';
}

class CategoryController {
  /**
   * List Categories
   */
  static async getAll(req, res, next) {
    try {
      const showAll = req.query.all === 'true' && req.session && req.session.user && req.session.user.role === 'admin';
      
      const sql = showAll
        ? `SELECT c.*, COUNT(k.id) as published_records_count 
           FROM categories c
           LEFT JOIN knowledge_records k ON c.id = k.category_id AND k.status = 'published'
           GROUP BY c.id
           ORDER BY c.display_order ASC, c.name ASC`
        : `SELECT c.*, COUNT(k.id) as published_records_count 
           FROM categories c
           LEFT JOIN knowledge_records k ON c.id = k.category_id AND k.status = 'published'
           WHERE c.is_active = 1
           GROUP BY c.id
           ORDER BY c.display_order ASC, c.name ASC`;

      const [rows] = await db.query(sql);

      rows.forEach(c => {
        c.image_url = c.image_url || getCategoryCover(c.slug);
      });

      res.json({
        success: true,
        categories: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Single Category with its knowledge records
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM categories WHERE id = ? OR slug = ?', [id, id]);

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }

      res.json({
        success: true,
        category: rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Create Category
   */
  static async create(req, res, next) {
    try {
      const { name, description, icon, display_order } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Category name is required.' });
      }

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Check unique
      const [existing] = await db.query('SELECT id FROM categories WHERE slug = ? OR name = ?', [slug, name.trim()]);
      if (existing.length) {
        return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
      }

      const [result] = await db.query(
        `INSERT INTO categories (name, slug, description, icon, is_active, display_order)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [name.trim(), slug, description || '', icon || 'fa-tools', display_order || 0]
      );

      await AuditService.logRequest(req, {
        action: 'CATEGORY_CREATED',
        module: 'CATEGORY',
        recordId: result.insertId,
        details: { name: name.trim(), slug }
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        category: { id: result.insertId, name: name.trim(), slug }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update Category
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, icon, is_active, display_order } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Category name is required.' });
      }

      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      await db.query(
        `UPDATE categories 
         SET name = ?, slug = ?, description = ?, icon = ?, is_active = ?, display_order = ?
         WHERE id = ?`,
        [name.trim(), slug, description || '', icon || 'fa-tools', is_active !== undefined ? (is_active ? 1 : 0) : 1, display_order || 0, id]
      );

      await AuditService.logRequest(req, {
        action: 'CATEGORY_UPDATED',
        module: 'CATEGORY',
        recordId: id,
        details: { name, is_active }
      });

      res.json({
        success: true,
        message: 'Category updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Toggle Category Active State
   */
  static async toggleActive(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT is_active, name FROM categories WHERE id = ?', [id]);
      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }

      const newStatus = rows[0].is_active ? 0 : 1;
      await db.query('UPDATE categories SET is_active = ? WHERE id = ?', [newStatus, id]);

      await AuditService.logRequest(req, {
        action: newStatus ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
        module: 'CATEGORY',
        recordId: id,
        details: { name: rows[0].name, newStatus }
      });

      res.json({
        success: true,
        message: `Category has been ${newStatus ? 'activated' : 'deactivated'}.`,
        is_active: newStatus
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;

