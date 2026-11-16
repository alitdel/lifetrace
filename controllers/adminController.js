const db = require('../config/db');
const AuditService = require('../services/auditService');

class AdminController {
  /**
   * Admin: List Users with filtering and pagination
   */
  static async listUsers(req, res, next) {
    try {
      const { role, status, search, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const params = [];
      const conditions = [];

      if (role && role !== 'all') {
        conditions.push('role = ?');
        params.push(role);
      }

      if (status && status !== 'all') {
        conditions.push('status = ?');
        params.push(status);
      }

      if (search && search.trim()) {
        conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      let whereClause = '';
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      // Count
      const [countRows] = await db.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
      const total = countRows[0] ? countRows[0].total : 0;

      // Data
      const [users] = await db.query(
        `SELECT id, username, email, role, full_name, phone, status, avatar_url, created_at, last_login
         FROM users
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit, 10), offset]
      );

      res.json({
        success: true,
        users,
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

  /**
   * Admin: Update User Status (active, inactive, pending)
   */
  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }

      // Prevent admin deactivating own account
      if (parseInt(id, 10) === req.session.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot change the status of your own administrator account.' });
      }

      const [targetUsers] = await db.query('SELECT username, status FROM users WHERE id = ?', [id]);
      if (!targetUsers.length) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

      await AuditService.logRequest(req, {
        action: 'USER_STATUS_CHANGED',
        module: 'ADMIN',
        recordId: id,
        details: { username: targetUsers[0].username, oldStatus: targetUsers[0].status, newStatus: status }
      });

      res.json({
        success: true,
        message: `Account status for ${targetUsers[0].username} updated to ${status}.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update User Role (expert, learner, reviewer, admin)
   */
  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['expert', 'learner', 'reviewer', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid user role specified.' });
      }

      // Prevent admin demoting own account
      if (parseInt(id, 10) === req.session.user.id && role !== 'admin') {
        return res.status(400).json({ success: false, message: 'You cannot remove administrator privileges from yourself.' });
      }

      const [targetUsers] = await db.query('SELECT username, role FROM users WHERE id = ?', [id]);
      if (!targetUsers.length) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

      // Ensure profile exists for new role
      if (role === 'expert') {
        await db.query(
          `INSERT OR IGNORE INTO expert_profiles (user_id, areas_of_expertise, location) VALUES (?, 'General Practical Skills', 'Uganda')`,
          [id]
        ).catch(async () => {
          await db.query(
            `INSERT IGNORE INTO expert_profiles (user_id, areas_of_expertise, location) VALUES (?, 'General Practical Skills', 'Uganda')`,
            [id]
          );
        });
      } else if (role === 'learner') {
        await db.query(
          `INSERT OR IGNORE INTO learner_profiles (user_id, education_level, primary_interest, location) VALUES (?, 'Vocational Student', 'Vocational Skills', 'Uganda')`,
          [id]
        ).catch(async () => {
          await db.query(
            `INSERT IGNORE INTO learner_profiles (user_id, education_level, primary_interest, location) VALUES (?, 'Vocational Student', 'Vocational Skills', 'Uganda')`,
            [id]
          );
        });
      }

      await AuditService.logRequest(req, {
        action: 'USER_ROLE_CHANGED',
        module: 'ADMIN',
        recordId: id,
        details: { username: targetUsers[0].username, oldRole: targetUsers[0].role, newRole: role }
      });

      res.json({
        success: true,
        message: `Role for ${targetUsers[0].username} updated to ${role.toUpperCase()}.`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get System Settings
   */
  static async getSettings(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
      const settingsMap = {};
      rows.forEach(r => {
        settingsMap[r.setting_key] = r.setting_value;
      });

      res.json({
        success: true,
        settings: settingsMap,
        raw: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update System Settings
   */
  static async updateSettings(req, res, next) {
    try {
      const { settings } = req.body;
      const adminId = req.session.user.id;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, message: 'Settings object is required.' });
      }

      for (const [key, val] of Object.entries(settings)) {
        await db.query(
          `INSERT INTO system_settings (setting_key, setting_value, updated_by)
           VALUES (?, ?, ?)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by`,
          [key, String(val), adminId]
        ).catch(async () => {
          await db.query(
            `INSERT INTO system_settings (setting_key, setting_value, updated_by)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
            [key, String(val), adminId]
          );
        });
      }

      await AuditService.logRequest(req, {
        action: 'SETTINGS_UPDATED',
        module: 'ADMIN',
        details: settings
      });

      res.json({
        success: true,
        message: 'System settings updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;

