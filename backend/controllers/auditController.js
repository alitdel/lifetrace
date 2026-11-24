const db = require('../config/db');

class AuditController {
  /**
   * Admin: Get Filtered Audit Logs
   */
  static async getLogs(req, res, next) {
    try {
      const { module, action, search, page = 1, limit = 25 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const params = [];
      const conditions = [];

      if (module && module !== 'all') {
        conditions.push('module = ?');
        params.push(module);
      }

      if (action && action !== 'all') {
        conditions.push('action LIKE ?');
        params.push(`%${action}%`);
      }

      if (search && search.trim()) {
        conditions.push('(username LIKE ? OR action LIKE ? OR record_id LIKE ?)');
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      let whereClause = '';
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      const [countRows] = await db.query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
      const total = countRows[0] ? countRows[0].total : 0;

      const [logs] = await db.query(
        `SELECT * FROM audit_logs 
         ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit, 10), offset]
      );

      res.json({
        success: true,
        logs,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuditController;

