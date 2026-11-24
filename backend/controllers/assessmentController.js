const db = require('../config/db');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');
const CertificateService = require('../services/certificateService');

class AssessmentController {
  /**
   * Get Assessment for a Knowledge Record
   */
  static async getByKnowledgeId(req, res, next) {
    try {
      const { knowledgeId } = req.params;
      const user = req.session && req.session.user ? req.session.user : null;

      const [assessments] = await db.query(
        'SELECT * FROM assessments WHERE knowledge_id = ? AND is_active = 1',
        [knowledgeId]
      );

      if (!assessments.length) {
        return res.json({ success: true, hasAssessment: false, assessment: null });
      }

      const assessment = assessments[0];

      // Fetch questions
      const [questions] = await db.query(
        'SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY display_order ASC, id ASC',
        [assessment.id]
      );

      const isPrivileged = user && (user.role === 'admin' || user.role === 'reviewer' || user.id === assessment.created_by);

      const sanitizedQuestions = questions.map(q => {
        let options = [];
        try {
          options = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
        } catch {
          options = [];
        }

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options,
          points: q.points,
          display_order: q.display_order,
          // Hide correct answers and explanations from learners until submitted
          correct_answer: isPrivileged ? q.correct_answer : undefined,
          explanation: isPrivileged ? q.explanation : undefined
        };
      });

      // Fetch learner's past attempts if authenticated
      let pastAttempts = [];
      if (user) {
        const [results] = await db.query(
          'SELECT * FROM assessment_results WHERE assessment_id = ? AND learner_id = ? ORDER BY completed_at DESC',
          [assessment.id, user.id]
        );
        pastAttempts = results;
      }

      res.json({
        success: true,
        hasAssessment: true,
        assessment: {
          id: assessment.id,
          knowledge_id: assessment.knowledge_id,
          title: assessment.title,
          description: assessment.description,
          passing_score: assessment.passing_score,
          max_attempts: assessment.max_attempts,
          time_limit_minutes: assessment.time_limit_minutes,
          questions: sanitizedQuestions,
          pastAttempts
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Submit Assessment Answers and Receive Immediate Grade
   */
  static async submitAssessment(req, res, next) {
    try {
      const learnerId = req.session.user.id;
      const { id } = req.params; // assessment_id
      const { answers } = req.body; // { [questionId]: "Selected Answer" }

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ success: false, message: 'Assessment answers must be submitted.' });
      }

      const [assessments] = await db.query(
        `SELECT a.*, k.title as knowledge_title 
         FROM assessments a
         JOIN knowledge_records k ON a.knowledge_id = k.id
         WHERE a.id = ?`,
        [id]
      );

      if (!assessments.length) {
        return res.status(404).json({ success: false, message: 'Assessment not found.' });
      }

      const assessment = assessments[0];

      // Check max attempts
      const [priorAttempts] = await db.query(
        'SELECT COUNT(*) as count FROM assessment_results WHERE assessment_id = ? AND learner_id = ?',
        [id, learnerId]
      );
      const attemptCount = priorAttempts[0] ? priorAttempts[0].count : 0;

      if (attemptCount >= assessment.max_attempts) {
        return res.status(400).json({
          success: false,
          message: `Maximum attempt limit (${assessment.max_attempts}) reached for this practical assessment.`
        });
      }

      // Fetch all questions with correct answers
      const [questions] = await db.query(
        'SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY display_order ASC',
        [id]
      );

      let totalPoints = 0;
      let earnedPoints = 0;
      const questionBreakdown = [];

      for (const q of questions) {
        totalPoints += q.points;
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer && String(userAnswer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();

        if (isCorrect) {
          earnedPoints += q.points;
        }

        let options = [];
        try {
          options = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
        } catch {
          options = [];
        }

        questionBreakdown.push({
          id: q.id,
          question_text: q.question_text,
          options,
          userAnswer: userAnswer || null,
          correct_answer: q.correct_answer,
          isCorrect,
          pointsAwarded: isCorrect ? q.points : 0,
          pointsPossible: q.points,
          explanation: q.explanation
        });
      }

      const percentage = totalPoints > 0 ? parseFloat(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
      const passed = percentage >= assessment.passing_score;

      // Save result
      const [insertResult] = await db.query(
        `INSERT INTO assessment_results (
          assessment_id, learner_id, score, total_points, percentage, passed,
          answers_json, attempt_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          learnerId,
          earnedPoints,
          totalPoints,
          percentage,
          passed ? 1 : 0,
          JSON.stringify(answers),
          attemptCount + 1
        ]
      );

      const resultId = insertResult.insertId;

      // Notify learner
      await NotificationService.notify({
        userId: learnerId,
        title: `Assessment Completed: ${passed ? 'PASSED' : 'Did Not Pass'}`,
        message: `You scored ${percentage}% (${earnedPoints}/${totalPoints} pts) on "${assessment.title}". Passing threshold: ${assessment.passing_score}%.`,
        type: passed ? 'success' : 'warning',
        link: `/assessment.html?id=${id}`
      });

      // Try issuing certificate if passed
      let certResult = null;
      if (passed) {
        try {
          certResult = await CertificateService.issueCertificate(learnerId, assessment.knowledge_id, req);
        } catch (err) {
          console.log('[Certificate Check]', err.message);
        }
      }

      await AuditService.logRequest(req, {
        action: 'ASSESSMENT_COMPLETED',
        module: 'ASSESSMENT',
        recordId: resultId,
        details: { assessmentId: id, score: earnedPoints, totalPoints, percentage, passed }
      });

      res.json({
        success: true,
        score: earnedPoints,
        totalPoints,
        percentage,
        passed,
        passing_score: assessment.passing_score,
        attemptNumber: attemptCount + 1,
        questions: questionBreakdown,
        certificate: certResult ? certResult.certificate : null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert/Admin: Create New Assessment for Knowledge Record
   */
  static async createAssessment(req, res, next) {
    try {
      const creatorId = req.session.user.id;
      const {
        knowledge_id,
        title,
        description,
        passing_score = 75,
        max_attempts = 3,
        time_limit_minutes = 20,
        questions = []
      } = req.body;

      if (!knowledge_id || !title || !questions.length) {
        return res.status(400).json({
          success: false,
          message: 'Knowledge ID, Title, and at least one question are required.'
        });
      }

      // Check if knowledge record exists
      const [kRows] = await db.query('SELECT id, expert_id, title FROM knowledge_records WHERE id = ?', [knowledge_id]);
      if (!kRows.length) {
        return res.status(404).json({ success: false, message: 'Knowledge record not found.' });
      }

      // Insert assessment
      const [result] = await db.query(
        `INSERT INTO assessments (knowledge_id, title, description, passing_score, max_attempts, time_limit_minutes, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [knowledge_id, title.trim(), description || '', passing_score, max_attempts, time_limit_minutes, creatorId]
      );

      const assessmentId = result.insertId;

      // Insert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.question_text && q.correct_answer) {
          const optionsJson = JSON.stringify(q.options || []);
          await db.query(
            `INSERT INTO assessment_questions (assessment_id, question_text, question_type, options_json, correct_answer, explanation, points, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              assessmentId,
              q.question_text.trim(),
              q.question_type || 'multiple_choice',
              optionsJson,
              q.correct_answer.trim(),
              q.explanation || '',
              q.points || 10,
              i + 1
            ]
          );
        }
      }

      await AuditService.logRequest(req, {
        action: 'ASSESSMENT_CREATED',
        module: 'ASSESSMENT',
        recordId: assessmentId,
        details: { title, knowledge_id, questionsCount: questions.length }
      });

      res.status(201).json({
        success: true,
        message: 'Assessment created successfully.',
        assessmentId
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Get All Past Assessment Results
   */
  static async getMyResults(req, res, next) {
    try {
      const learnerId = req.session.user.id;

      const [rows] = await db.query(
        `SELECT ar.*, a.title as assessment_title, a.passing_score,
                k.id as knowledge_id, k.title as knowledge_title, k.slug as knowledge_slug
         FROM assessment_results ar
         JOIN assessments a ON ar.assessment_id = a.id
         JOIN knowledge_records k ON a.knowledge_id = k.id
         WHERE ar.learner_id = ?
         ORDER BY ar.completed_at DESC`,
        [learnerId]
      );

      res.json({
        success: true,
        results: rows
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AssessmentController;

