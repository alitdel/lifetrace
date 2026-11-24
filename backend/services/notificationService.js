const db = require('../config/db');

/**
 * In-App Notification Service
 */
class NotificationService {
  /**
   * Create a notification for a user
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} params.type - 'info' | 'success' | 'warning' | 'action_required'
   * @param {string|null} params.link
   */
  static async notify({ userId, title, message, type = 'info', link = null }) {
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link, is_read)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [userId, title, message, type, link]
      );
    } catch (err) {
      console.error('[NotificationService Error]', err.message);
    }
  }

  /**
   * Notify all users with a specific role (e.g. all reviewers)
   */
  static async notifyRole({ role, title, message, type = 'info', link = null }) {
    try {
      const [users] = await db.query('SELECT id FROM users WHERE role = ? AND status = "active"', [role]);
      for (const u of users) {
        await this.notify({ userId: u.id, title, message, type, link });
      }
    } catch (err) {
      console.error('[NotificationService notifyRole Error]', err.message);
    }
  }
}

module.exports = NotificationService;

