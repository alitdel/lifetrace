const db = require('../config/db');

class NotificationController {
  /**
   * Get Current User Notifications
   */
  static async getNotifications(req, res, next) {
    try {
      const userId = req.session.user.id;

      const [notifications] = await db.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );

      const [unreadCountRows] = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );

      const unreadCount = unreadCountRows[0] ? unreadCountRows[0].count : 0;

      res.json({
        success: true,
        notifications,
        unreadCount
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark Single Notification as Read
   */
  static async markAsRead(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;

      await db.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      res.json({
        success: true,
        message: 'Notification marked as read.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark All Notifications as Read
   */
  static async markAllAsRead(req, res, next) {
    try {
      const userId = req.session.user.id;

      await db.query(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [userId]
      );

      res.json({
        success: true,
        message: 'All notifications marked as read.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotificationController;

