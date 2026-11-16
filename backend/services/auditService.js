const db = require('../config/db');

/**
 * Audit Logging Service
 * Records sensitive actions in an immutable audit trail
 */
class AuditService {
  /**
   * Log an event
   * @param {Object} params
   * @param {number|null} params.userId
   * @param {string} params.username
   * @param {string} params.role
   * @param {string} params.action - e.g. 'LOGIN', 'SUBMIT_KNOWLEDGE', 'APPROVE_KNOWLEDGE'
   * @param {string} params.module - e.g. 'AUTH', 'KNOWLEDGE', 'REVIEW', 'ADMIN'
   * @param {string|number|null} params.recordId
   * @param {string|null} params.ipAddress
   * @param {string|null} params.userAgent
   * @param {Object|null} params.details
   */
  static async log({
    userId = null,
    username = 'SYSTEM',
    role = 'ANONYMOUS',
    action,
    module,
    recordId = null,
    ipAddress = null,
    userAgent = null,
    details = null
  }) {
    try {
      const detailsJson = details ? JSON.stringify(details) : null;
      await db.query(
        `INSERT INTO audit_logs (user_id, username, role, action, module, record_id, ip_address, user_agent, details_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, role, action, module, recordId ? String(recordId) : null, ipAddress, userAgent, detailsJson]
      );
    } catch (err) {
      console.error('[AuditService Error] Failed to write audit log:', err.message);
    }
  }

  /**
   * Helper to log directly from Express request object
   */
  static async logRequest(req, { action, module, recordId = null, details = null }) {
    const user = req.session && req.session.user ? req.session.user : null;
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] || '').substring(0, 255);

    return this.log({
      userId: user ? user.id : null,
      username: user ? user.username : 'ANONYMOUS',
      role: user ? user.role : 'ANONYMOUS',
      action,
      module,
      recordId,
      ipAddress,
      userAgent,
      details
    });
  }
}

module.exports = AuditService;

