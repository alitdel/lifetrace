const db = require('../config/db');
const CertificateService = require('../services/certificateService');

class CertificateController {
  /**
   * Public: Verify Certificate Authenticity by Code
   */
  static async verifyCode(req, res, next) {
    try {
      const { code } = req.params;

      const cert = await CertificateService.verifyCertificate(code);

      if (!cert) {
        return res.status(404).json({
          success: false,
          verified: false,
          message: 'Certificate not found. The provided verification code is invalid or does not exist in the LifeTrace National Registry.'
        });
      }

      res.json({
        success: true,
        verified: cert.status === 'valid',
        certificate: {
          code: cert.certificate_code,
          learner_name: cert.learner_name,
          title: cert.title,
          category_name: cert.category_name,
          issue_date: cert.issue_date,
          issuer_name: cert.issuer_name,
          status: cert.status,
          knowledge_id: cert.knowledge_id,
          knowledge_slug: cert.knowledge_slug,
          skill_level: cert.skill_level
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Get All Earned Certificates
   */
  static async getMyCertificates(req, res, next) {
    try {
      const learnerId = req.session.user.id;

      const [certs] = await db.query(
        `SELECT c.*, k.title as knowledge_title, k.slug as knowledge_slug, k.cover_image_url,
                cat.name as category_name, cat.icon as category_icon
         FROM certificates c
         JOIN knowledge_records k ON c.knowledge_id = k.id
         JOIN categories cat ON k.category_id = cat.id
         WHERE c.learner_id = ?
         ORDER BY c.issue_date DESC`,
        [learnerId]
      );

      res.json({
        success: true,
        certificates: certs
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Specific Certificate by ID or Code
   */
  static async getCertificate(req, res, next) {
    try {
      const { id_or_code } = req.params;

      const [rows] = await db.query(
        `SELECT c.*, k.title as knowledge_title, k.slug as knowledge_slug, k.skill_level,
                cat.name as category_name,
                ar.score as assessment_score, ar.total_points as assessment_total, ar.percentage as assessment_percentage
         FROM certificates c
         JOIN knowledge_records k ON c.knowledge_id = k.id
         JOIN categories cat ON k.category_id = cat.id
         LEFT JOIN assessment_results ar ON c.assessment_result_id = ar.id
         WHERE c.id = ? OR c.certificate_code = ?`,
        [id_or_code, id_or_code]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Certificate not found.' });
      }

      res.json({
        success: true,
        certificate: rows[0]
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Request Certificate Issuance
   */
  static async requestCertificate(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { knowledgeId } = req.params;

      const result = await CertificateService.issueCertificate(learnerId, knowledgeId, req);

      res.json({
        success: true,
        message: result.alreadyIssued
          ? 'Certificate already issued for this module.'
          : 'Certificate successfully generated and recorded in LifeTrace registry!',
        certificate: result.certificate,
        alreadyIssued: result.alreadyIssued
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = CertificateController;

