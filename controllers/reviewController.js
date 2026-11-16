const db = require('../config/db');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

class ReviewController {
  /**
   * Reviewer/Admin: Get Pending Knowledge Submissions Queue
   */
  static async getPendingSubmissions(req, res, next) {
    try {
      const { status = 'all' } = req.query;

      let statusFilter = "k.status IN ('submitted', 'under_review')";
      const params = [];

      if (status === 'submitted' || status === 'under_review' || status === 'rejected' || status === 'approved') {
        statusFilter = 'k.status = ?';
        params.push(status);
      }

      const sql = `
        SELECT k.id, k.title, k.slug, k.short_summary, k.skill_level, k.status,
               k.estimated_time_minutes, k.created_at, k.updated_at,
               c.name as category_name, c.icon as category_icon,
               u.id as expert_id, u.full_name as expert_name, u.avatar_url as expert_avatar,
               ep.organization_or_trade as expert_org,
               rev.full_name as reviewer_name,
               (SELECT COUNT(*) FROM knowledge_steps WHERE knowledge_id = k.id) as steps_count
        FROM knowledge_records k
        JOIN categories c ON k.category_id = c.id
        JOIN users u ON k.expert_id = u.id
        LEFT JOIN expert_profiles ep ON u.id = ep.user_id
        LEFT JOIN users rev ON k.reviewer_id = rev.id
        WHERE ${statusFilter}
        ORDER BY k.created_at ASC
      `;

      const [rows] = await db.query(sql, params);

      res.json({
        success: true,
        submissions: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reviewer/Admin: Assign Self & Start Technical Review
   */
  static async startReview(req, res, next) {
    try {
      const { id } = req.params;
      const reviewerId = req.session.user.id;

      const [records] = await db.query('SELECT status, title, expert_id FROM knowledge_records WHERE id = ?', [id]);
      if (!records.length) {
        return res.status(404).json({ success: false, message: 'Submission not found.' });
      }

      const record = records[0];

      await db.query(
        'UPDATE knowledge_records SET status = "under_review", reviewer_id = ? WHERE id = ?',
        [reviewerId, id]
      );

      await db.query(
        `INSERT INTO review_history (knowledge_id, reviewer_id, previous_status, new_status, action, feedback_notes)
         VALUES (?, ?, ?, 'under_review', 'Review Started', 'Reviewer assigned and commenced technical verification.')`,
        [id, reviewerId, record.status]
      );

      await AuditService.logRequest(req, {
        action: 'REVIEW_COMMENCED',
        module: 'REVIEW',
        recordId: id,
        details: { title: record.title }
      });

      res.json({
        success: true,
        message: 'Review session commenced successfully.',
        status: 'under_review'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reviewer/Admin: Submit Formal Review Decision
   */
  static async submitDecision(req, res, next) {
    try {
      const { id } = req.params;
      const reviewerId = req.session.user.id;
      const {
        decision, // 'approved', 'rejected', 'correction_requested'
        completeness_score = 5,
        clarity_score = 5,
        safety_score = 5,
        comments,
        rejection_reason,
        internal_notes
      } = req.body;

      if (!['approved', 'rejected', 'correction_requested'].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review decision. Permitted values: approved, rejected, correction_requested.'
        });
      }

      if (!comments || comments.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Constructive review feedback comments are required.'
        });
      }

      const [records] = await db.query('SELECT expert_id, title, status FROM knowledge_records WHERE id = ?', [id]);
      if (!records.length) {
        return res.status(404).json({ success: false, message: 'Knowledge record not found.' });
      }

      const record = records[0];
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      let newStatus = 'under_review';
      let historyAction = 'Review Decision';

      if (decision === 'approved') {
        newStatus = 'published';
        historyAction = 'Approved & Published';

        await db.query(
          `UPDATE knowledge_records SET
            status = 'published',
            reviewer_id = ?,
            approved_at = ?,
            published_at = ?,
            review_comments = ?,
            rejection_reason = NULL
           WHERE id = ?`,
          [reviewerId, now, now, comments.trim(), id]
        );

        // Notify expert
        await NotificationService.notify({
          userId: record.expert_id,
          title: 'Knowledge Record Approved & Published!',
          message: `Congratulations! "${record.title}" has successfully passed reviewer verification and is now live in the LifeTrace Library.`,
          type: 'success',
          link: `/knowledge-details.html?id=${id}`
        });
      } else if (decision === 'rejected') {
        newStatus = 'rejected';
        historyAction = 'Submission Rejected';

        const reason = rejection_reason || comments;
        await db.query(
          `UPDATE knowledge_records SET
            status = 'rejected',
            reviewer_id = ?,
            review_comments = ?,
            rejection_reason = ?
           WHERE id = ?`,
          [reviewerId, comments.trim(), reason.trim(), id]
        );

        // Notify expert
        await NotificationService.notify({
          userId: record.expert_id,
          title: 'Knowledge Submission Rejected',
          message: `Your submission "${record.title}" was rejected: ${reason.trim()}`,
          type: 'warning',
          link: `/create-knowledge.html?edit=${id}`
        });
      } else if (decision === 'correction_requested') {
        newStatus = 'draft';
        historyAction = 'Corrections Requested';

        await db.query(
          `UPDATE knowledge_records SET
            status = 'draft',
            reviewer_id = ?,
            review_comments = ?
           WHERE id = ?`,
          [reviewerId, comments.trim(), id]
        );

        // Notify expert
        await NotificationService.notify({
          userId: record.expert_id,
          title: 'Corrections Requested for Submission',
          message: `Reviewer requested revisions for "${record.title}": ${comments.trim()}`,
          type: 'action_required',
          link: `/create-knowledge.html?edit=${id}`
        });
      }

      // Record in reviews table
      await db.query(
        `INSERT INTO reviews (knowledge_id, reviewer_id, decision, completeness_score, clarity_score, safety_score, comments, internal_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          reviewerId,
          decision,
          parseInt(completeness_score, 10) || 5,
          parseInt(clarity_score, 10) || 5,
          parseInt(safety_score, 10) || 5,
          comments.trim(),
          internal_notes || null
        ]
      );

      // Record in review_history
      await db.query(
        `INSERT INTO review_history (knowledge_id, reviewer_id, previous_status, new_status, action, feedback_notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, reviewerId, record.status, newStatus, historyAction, comments.trim()]
      );

      await AuditService.logRequest(req, {
        action: `REVIEW_${decision.toUpperCase()}`,
        module: 'REVIEW',
        recordId: id,
        details: { title: record.title, decision, scores: { completeness_score, clarity_score, safety_score } }
      });

      res.json({
        success: true,
        message: `Submission successfully marked as ${newStatus}.`,
        decision,
        newStatus
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Review History for a Knowledge Record
   */
  static async getHistory(req, res, next) {
    try {
      const { id } = req.params;

      const [rows] = await db.query(
        `SELECT rh.*, u.full_name as reviewer_name, u.role as reviewer_role
         FROM review_history rh
         LEFT JOIN users u ON rh.reviewer_id = u.id
         WHERE rh.knowledge_id = ?
         ORDER BY rh.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        history: rows
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReviewController;

