const crypto = require('crypto');
const db = require('../config/db');
const NotificationService = require('./notificationService');
const AuditService = require('./auditService');

class CertificateService {
  /**
   * Check if a learner meets the strict requirements for a certificate
   * Requirements:
   * 1. 100% of knowledge steps completed
   * 2. Passed assessment score >= passing_score (default 75%)
   */
  static async checkEligibility(learnerId, knowledgeId) {
    // 1. Check progress
    const [progressRows] = await db.query(
      `SELECT status, completion_percentage, completed_steps_count, total_steps_count 
       FROM learning_progress 
       WHERE learner_id = ? AND knowledge_id = ?`,
      [learnerId, knowledgeId]
    );

    if (!progressRows || progressRows.length === 0) {
      return { eligible: false, reason: 'You have not enrolled in this knowledge module.' };
    }

    const progress = progressRows[0];
    if (progress.completed_steps_count < progress.total_steps_count || progress.completion_percentage < 100) {
      return { 
        eligible: false, 
        reason: `Incomplete procedural steps. You completed ${progress.completed_steps_count} of ${progress.total_steps_count} steps.` 
      };
    }

    // 2. Check assessment
    const [assessmentRows] = await db.query(
      `SELECT id, passing_score FROM assessments WHERE knowledge_id = ? AND is_active = 1`,
      [knowledgeId]
    );

    let assessmentResult = null;
    if (assessmentRows && assessmentRows.length > 0) {
      const assessment = assessmentRows[0];
      const [results] = await db.query(
        `SELECT id, score, total_points, percentage, passed 
         FROM assessment_results 
         WHERE assessment_id = ? AND learner_id = ? 
         ORDER BY percentage DESC LIMIT 1`,
        [assessment.id, learnerId]
      );

      if (!results || results.length === 0) {
        return { 
          eligible: false, 
          reason: 'You have not attempted the practical mastery assessment.' 
        };
      }

      assessmentResult = results[0];
      if (!assessmentResult.passed || assessmentResult.percentage < assessment.passing_score) {
        return { 
          eligible: false, 
          reason: `Assessment score of ${assessmentResult.percentage}% is below the required passing score of ${assessment.passing_score}%.` 
        };
      }
    }

    return { 
      eligible: true, 
      assessmentResultId: assessmentResult ? assessmentResult.id : null 
    };
  }

  /**
   * Issue a verified certificate
   */
  static async issueCertificate(learnerId, knowledgeId, req = null) {
    // Check if certificate already exists
    const [existingCerts] = await db.query(
      `SELECT * FROM certificates WHERE learner_id = ? AND knowledge_id = ?`,
      [learnerId, knowledgeId]
    );

    if (existingCerts && existingCerts.length > 0) {
      return { certificate: existingCerts[0], alreadyIssued: true };
    }

    // Check eligibility
    const eligibility = await this.checkEligibility(learnerId, knowledgeId);
    if (!eligibility.eligible) {
      throw new Error(`Certificate criteria not met: ${eligibility.reason}`);
    }

    // Fetch learner and knowledge details
    const [learnerRows] = await db.query(`SELECT full_name FROM users WHERE id = ?`, [learnerId]);
    const [knowledgeRows] = await db.query(`SELECT title FROM knowledge_records WHERE id = ?`, [knowledgeId]);

    if (!learnerRows.length || !knowledgeRows.length) {
      throw new Error('Learner or Knowledge record not found.');
    }

    const learnerName = learnerRows[0].full_name;
    const knowledgeTitle = knowledgeRows[0].title;
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certificateCode = `LT-UG-${year}-${randomHex}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const verificationUrl = `/certificate.html?code=${certificateCode}`;
    const certTitle = `Certificate of Practical Mastery: ${knowledgeTitle}`;
    const issuerName = 'LifeTrace Practical Knowledge Council & Vocational Standards Board';

    const [insertResult] = await db.query(
      `INSERT INTO certificates (
        certificate_code, learner_id, knowledge_id, assessment_result_id,
        issue_date, title, learner_name, issuer_name, status, verification_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)`,
      [
        certificateCode, learnerId, knowledgeId, eligibility.assessmentResultId,
        issueDate, certTitle, learnerName, issuerName, verificationUrl
      ]
    );

    const [newCertRows] = await db.query(`SELECT * FROM certificates WHERE id = ?`, [insertResult.insertId]);
    const newCert = newCertRows[0];

    // Send learner notification
    await NotificationService.notify({
      userId: learnerId,
      title: 'Certificate of Mastery Awarded!',
      message: `Congratulations ${learnerName}! Your practical mastery in "${knowledgeTitle}" has been certified (Code: ${certificateCode}).`,
      type: 'success',
      link: verificationUrl
    });

    // Record in immutable audit log
    if (req) {
      await AuditService.logRequest(req, {
        action: 'CERTIFICATE_ISSUED',
        module: 'CERTIFICATES',
        recordId: certificateCode,
        details: { learnerId, learnerName, knowledgeId, knowledgeTitle }
      });
    }

    return { certificate: newCert, alreadyIssued: false };
  }

  /**
   * Verify certificate by unique code (Public)
   */
  static async verifyCertificate(code) {
    const [rows] = await db.query(
      `SELECT c.*, u.email as learner_email, k.slug as knowledge_slug, k.skill_level,
              cat.name as category_name
       FROM certificates c
       JOIN users u ON c.learner_id = u.id
       JOIN knowledge_records k ON c.knowledge_id = k.id
       JOIN categories cat ON k.category_id = cat.id
       WHERE c.certificate_code = ?`,
      [code]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    return rows[0];
  }
}

module.exports = CertificateService;

