const db = require('../config/db');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const CertificateService = require('../services/certificateService');

class LearningController {
  /**
   * Learner: Enroll in Knowledge Learning Activity
   */
  static async enroll(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { knowledgeId } = req.params;

      // Verify knowledge record exists and is published
      const [kRows] = await db.query(
        'SELECT id, title, status FROM knowledge_records WHERE id = ?',
        [knowledgeId]
      );

      if (!kRows.length || kRows[0].status !== 'published') {
        return res.status(404).json({ success: false, message: 'Published learning record not found.' });
      }

      // Count total steps
      const [stepsCount] = await db.query(
        'SELECT COUNT(*) as total FROM knowledge_steps WHERE knowledge_id = ?',
        [knowledgeId]
      );
      const totalSteps = stepsCount[0] ? Math.max(1, stepsCount[0].total) : 1;

      // Check existing enrollment
      const [existing] = await db.query(
        'SELECT * FROM learning_progress WHERE learner_id = ? AND knowledge_id = ?',
        [learnerId, knowledgeId]
      );

      if (existing.length > 0) {
        return res.json({
          success: true,
          message: 'Already enrolled.',
          progress: existing[0]
        });
      }

      const [insertResult] = await db.query(
        `INSERT INTO learning_progress (learner_id, knowledge_id, status, current_step, completed_steps_count, total_steps_count, completion_percentage)
         VALUES (?, ?, 'in_progress', 1, 0, ?, 0.00)`,
        [learnerId, knowledgeId, totalSteps]
      );

      const [newProgress] = await db.query('SELECT * FROM learning_progress WHERE id = ?', [insertResult.insertId]);

      await AuditService.logRequest(req, {
        action: 'COURSE_ENROLLED',
        module: 'LEARNING',
        recordId: knowledgeId,
        details: { course: kRows[0].title }
      });

      res.status(201).json({
        success: true,
        message: 'Successfully enrolled! You can now track your practical progress step by step.',
        progress: newProgress[0]
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Get Progress for a Knowledge Record
   */
  static async getProgress(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { knowledgeId } = req.params;

      const [rows] = await db.query(
        `SELECT lp.*, k.title, k.slug, k.cover_image_url, k.skill_level
         FROM learning_progress lp
         JOIN knowledge_records k ON lp.knowledge_id = k.id
         WHERE lp.learner_id = ? AND lp.knowledge_id = ?`,
        [learnerId, knowledgeId]
      );

      if (!rows.length) {
        return res.json({ success: true, enrolled: false, progress: null, completedStepIds: [] });
      }

      const progress = rows[0];

      // Get individual completed step IDs
      const [completions] = await db.query(
        'SELECT step_id FROM learning_step_completions WHERE progress_id = ?',
        [progress.id]
      );

      const completedStepIds = completions.map(c => c.step_id);

      res.json({
        success: true,
        enrolled: true,
        progress,
        completedStepIds
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Mark Step as Completed
   */
  static async completeStep(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { knowledgeId, stepId } = req.params;

      // Find progress
      let [progressRows] = await db.query(
        'SELECT * FROM learning_progress WHERE learner_id = ? AND knowledge_id = ?',
        [learnerId, knowledgeId]
      );

      if (!progressRows.length) {
        // Auto enroll if not yet enrolled
        const [stepsCount] = await db.query(
          'SELECT COUNT(*) as total FROM knowledge_steps WHERE knowledge_id = ?',
          [knowledgeId]
        );
        const total = stepsCount[0] ? Math.max(1, stepsCount[0].total) : 1;
        await db.query(
          `INSERT INTO learning_progress (learner_id, knowledge_id, status, current_step, completed_steps_count, total_steps_count, completion_percentage)
           VALUES (?, ?, 'in_progress', 1, 0, ?, 0.00)`,
          [learnerId, knowledgeId, total]
        );
        [progressRows] = await db.query(
          'SELECT * FROM learning_progress WHERE learner_id = ? AND knowledge_id = ?',
          [learnerId, knowledgeId]
        );
      }

      const progress = progressRows[0];

      // Insert step completion
      await db.query(
        `INSERT OR IGNORE INTO learning_step_completions (progress_id, step_id) VALUES (?, ?)`,
        [progress.id, stepId]
      ).catch(async () => {
        await db.query(
          `INSERT IGNORE INTO learning_step_completions (progress_id, step_id) VALUES (?, ?)`,
          [progress.id, stepId]
        );
      });

      // Recalculate progress
      const [completions] = await db.query(
        'SELECT COUNT(*) as count FROM learning_step_completions WHERE progress_id = ?',
        [progress.id]
      );
      const completedCount = completions[0] ? completions[0].count : 1;

      // Update total steps count in case steps were modified
      const [stepsTotalRows] = await db.query(
        'SELECT COUNT(*) as total FROM knowledge_steps WHERE knowledge_id = ?',
        [knowledgeId]
      );
      const totalSteps = stepsTotalRows[0] ? Math.max(1, stepsTotalRows[0].total) : 1;

      const percentage = Math.min(100.00, parseFloat(((completedCount / totalSteps) * 100).toFixed(2)));
      const isCompleted = percentage >= 100;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.query(
        `UPDATE learning_progress 
         SET completed_steps_count = ?,
             total_steps_count = ?,
             completion_percentage = ?,
             status = ?,
             completed_at = COALESCE(?, completed_at),
             last_accessed_at = ?
         WHERE id = ?`,
        [completedCount, totalSteps, percentage, isCompleted ? 'completed' : 'in_progress', isCompleted ? now : null, now, progress.id]
      );

      // Check if eligible for certificate
      let certResult = null;
      if (isCompleted) {
        try {
          certResult = await CertificateService.issueCertificate(learnerId, knowledgeId, req);
        } catch {
          // May still need to take assessment
        }
      }

      res.json({
        success: true,
        message: isCompleted ? 'All practical steps completed! Well done!' : 'Step completed successfully.',
        completedCount,
        totalSteps,
        percentage,
        isCompleted,
        certificate: certResult ? certResult.certificate : null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: List Enrolled Courses with Progress
   */
  static async getMyEnrolledCourses(req, res, next) {
    try {
      const learnerId = req.session.user.id;

      const [rows] = await db.query(
        `SELECT lp.*, k.title, k.slug, k.cover_image_url, k.skill_level, k.estimated_time_minutes,
                c.name as category_name, c.icon as category_icon,
                u.full_name as expert_name,
                cert.certificate_code, cert.verification_url
         FROM learning_progress lp
         JOIN knowledge_records k ON lp.knowledge_id = k.id
         JOIN categories c ON k.category_id = c.id
         JOIN users u ON k.expert_id = u.id
         LEFT JOIN certificates cert ON lp.learner_id = cert.learner_id AND lp.knowledge_id = cert.knowledge_id
         WHERE lp.learner_id = ?
         ORDER BY lp.last_accessed_at DESC`,
        [learnerId]
      );

      res.json({
        success: true,
        courses: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Submit Practical Assignment Evidence
   */
  static async submitPractical(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { knowledgeId } = req.params;
      const { submission_title, submission_text, file_url, original_filename, file_size, mime_type, evidence = [] } = req.body;

      if (!submission_title || !submission_text || submission_text.trim().length < 20) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a descriptive title and detailed practical documentation (minimum 20 characters).'
        });
      }

      const [result] = await db.query(
        `INSERT INTO practical_submissions (
          knowledge_id, learner_id, submission_title, submission_text,
          file_url, original_filename, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
        [
          knowledgeId,
          learnerId,
          submission_title.trim(),
          submission_text.trim(),
          file_url || (evidence.length > 0 ? evidence[0].file_url : null),
          original_filename || (evidence.length > 0 ? evidence[0].original_filename : null),
          file_size || null,
          mime_type || null
        ]
      );

      const submissionId = result.insertId;

      // Insert multiple evidence photos/videos if provided
      if (Array.isArray(evidence) && evidence.length > 0) {
        for (const ev of evidence) {
          if (ev.file_url) {
            await db.query(
              `INSERT INTO submission_evidence (submission_id, file_url, original_filename, evidence_type, step_number, caption)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [submissionId, ev.file_url, ev.original_filename || 'evidence.jpg', ev.evidence_type || 'photo', ev.step_number || null, ev.caption || null]
            );
          }
        }
      }

      // Notify the author expert of this submission
      const [kRows] = await db.query('SELECT expert_id, title FROM knowledge_records WHERE id = ?', [knowledgeId]);
      if (kRows.length) {
        await NotificationService.notify({
          userId: kRows[0].expert_id,
          title: 'New Practical Assignment Submitted',
          message: `${req.session.user.full_name} submitted practical evidence for "${kRows[0].title}".`,
          type: 'action_required',
          link: `/dashboard.html?tab=submissions`
        });
      }

      await AuditService.logRequest(req, {
        action: 'PRACTICAL_SUBMITTED',
        module: 'LEARNING',
        recordId: result.insertId,
        details: { knowledgeId, submission_title }
      });

      res.status(201).json({
        success: true,
        message: 'Practical evidence submitted successfully for expert evaluation.',
        submissionId: result.insertId
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert/Reviewer/Admin: View Submissions for Evaluation
   */
  static async getAllSubmissions(req, res, next) {
    try {
      const user = req.session.user;
      const { knowledgeId, status } = req.query;

      let sql = `
        SELECT ps.*, k.title as knowledge_title, k.slug as knowledge_slug,
               u.full_name as learner_name, u.email as learner_email, u.avatar_url as learner_avatar,
               assessor.full_name as assessor_name
        FROM practical_submissions ps
        JOIN knowledge_records k ON ps.knowledge_id = k.id
        JOIN users u ON ps.learner_id = u.id
        LEFT JOIN users assessor ON ps.assessor_id = assessor.id
      `;
      const params = [];
      const conditions = [];

      // If expert, only show submissions for their knowledge records
      if (user.role === 'expert') {
        conditions.push('k.expert_id = ?');
        params.push(user.id);
      }

      if (knowledgeId) {
        conditions.push('ps.knowledge_id = ?');
        params.push(knowledgeId);
      }

      if (status && status !== 'all') {
        conditions.push('ps.status = ?');
        params.push(status);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY ps.submitted_at DESC';

      const [rows] = await db.query(sql, params);

      // Attach evidence photos/videos to each submission
      for (const row of rows) {
        const [evRows] = await db.query('SELECT * FROM submission_evidence WHERE submission_id = ? ORDER BY id ASC', [row.id]);
        row.evidence = evRows || [];
      }

      res.json({
        success: true,
        submissions: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert/Assessor: Grade & Review Practical Submission
   */
  static async gradeSubmission(req, res, next) {
    try {
      const assessorId = req.session.user.id;
      const { submissionId } = req.params;
      const { status, grade_score, assessor_feedback } = req.body;

      if (!status || !['passed', 'needs_revision', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Permitted: passed, needs_revision, failed.'
        });
      }

      if (grade_score === undefined || grade_score < 0 || grade_score > 100) {
        return res.status(400).json({
          success: false,
          message: 'Grade score must be between 0 and 100.'
        });
      }

      const [subs] = await db.query(
        `SELECT ps.*, k.title as knowledge_title 
         FROM practical_submissions ps
         JOIN knowledge_records k ON ps.knowledge_id = k.id
         WHERE ps.id = ?`,
        [submissionId]
      );

      if (!subs.length) {
        return res.status(404).json({ success: false, message: 'Submission not found.' });
      }

      const sub = subs[0];
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await db.query(
        `UPDATE practical_submissions SET
          status = ?,
          grade_score = ?,
          assessor_feedback = ?,
          assessor_id = ?,
          evaluated_at = ?
         WHERE id = ?`,
        [status, parseFloat(grade_score), assessor_feedback || '', assessorId, now, submissionId]
      );

      // Notify learner
      await NotificationService.notify({
        userId: sub.learner_id,
        title: `Practical Assignment ${status === 'passed' ? 'Passed!' : 'Evaluated'}`,
        message: `Your practical submission for "${sub.knowledge_title}" received ${grade_score}% (${status.toUpperCase()}). Feedback: ${assessor_feedback || 'Well done.'}`,
        type: status === 'passed' ? 'success' : 'info',
        link: `/learning-progress.html?knowledge_id=${sub.knowledge_id}`
      });

      // If passed, check if certificate qualifies
      let cert = null;
      if (status === 'passed') {
        try {
          cert = await CertificateService.issueCertificate(sub.learner_id, sub.knowledge_id, req);
        } catch {
          // May need assessment
        }
      }

      await AuditService.logRequest(req, {
        action: 'PRACTICAL_EVALUATED',
        module: 'ASSESSMENT',
        recordId: submissionId,
        details: { status, grade_score, learnerId: sub.learner_id }
      });

      res.json({
        success: true,
        message: 'Practical assignment evaluated successfully.',
        status,
        grade_score,
        certificate: cert ? cert.certificate : null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LearningController;

