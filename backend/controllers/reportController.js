const db = require('../config/db');

class ReportController {
  /**
   * Platform Overview Statistics
   */
  static async getStats(req, res, next) {
    try {
      // 1. User stats
      const [usersTotalRows] = await db.query('SELECT COUNT(*) as total FROM users');
      const [rolesRows] = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');

      const rolesMap = { expert: 0, learner: 0, reviewer: 0, admin: 0 };
      rolesRows.forEach(r => {
        rolesMap[r.role] = r.count;
      });

      // 2. Knowledge stats
      const [statusRows] = await db.query('SELECT status, COUNT(*) as count FROM knowledge_records GROUP BY status');
      const statusMap = { draft: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, published: 0 };
      statusRows.forEach(s => {
        statusMap[s.status] = s.count;
      });

      // 3. Learning stats
      const [enrollmentRows] = await db.query('SELECT COUNT(*) as total FROM learning_progress');
      const [completedCoursesRows] = await db.query('SELECT COUNT(*) as total FROM learning_progress WHERE status = "completed"');
      const [submissionsRows] = await db.query('SELECT COUNT(*) as total FROM practical_submissions');
      const [passedSubsRows] = await db.query('SELECT COUNT(*) as total FROM practical_submissions WHERE status = "passed"');

      // 4. Assessment stats
      const [assessmentsTakenRows] = await db.query('SELECT COUNT(*) as total FROM assessment_results');
      const [assessmentsPassedRows] = await db.query('SELECT COUNT(*) as total FROM assessment_results WHERE passed = 1');

      // 5. Certificate stats
      const [certsRows] = await db.query('SELECT COUNT(*) as total FROM certificates WHERE status = "valid"');

      res.json({
        success: true,
        stats: {
          users: {
            total: usersTotalRows[0] ? usersTotalRows[0].total : 0,
            experts: rolesMap.expert || 0,
            learners: rolesMap.learner || 0,
            reviewers: rolesMap.reviewer || 0,
            admins: rolesMap.admin || 0
          },
          knowledge: {
            total: Object.values(statusMap).reduce((a, b) => a + b, 0),
            published: statusMap.published || 0,
            pending: (statusMap.submitted || 0) + (statusMap.under_review || 0),
            drafts: statusMap.draft || 0,
            rejected: statusMap.rejected || 0
          },
          learning: {
            totalEnrollments: enrollmentRows[0] ? enrollmentRows[0].total : 0,
            completedCourses: completedCoursesRows[0] ? completedCoursesRows[0].total : 0,
            practicalSubmissions: submissionsRows[0] ? submissionsRows[0].total : 0,
            passedPracticalSubmissions: passedSubsRows[0] ? passedSubsRows[0].total : 0
          },
          assessments: {
            totalTaken: assessmentsTakenRows[0] ? assessmentsTakenRows[0].total : 0,
            totalPassed: assessmentsPassedRows[0] ? assessmentsPassedRows[0].total : 0
          },
          certificates: {
            issued: certsRows[0] ? certsRows[0].total : 0
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Visual Analytics Data Formatted for Chart.js
   */
  static async getAnalytics(req, res, next) {
    try {
      // 1. Records by Category
      const [categoryRows] = await db.query(
        `SELECT c.name as category_name, COUNT(k.id) as count
         FROM categories c
         LEFT JOIN knowledge_records k ON c.id = k.category_id
         GROUP BY c.id
         ORDER BY count DESC
         LIMIT 8`
      );

      // 2. Records by Status
      const [statusRows] = await db.query(
        `SELECT status, COUNT(*) as count FROM knowledge_records GROUP BY status`
      );

      // 3. User Role Distribution
      const [roleRows] = await db.query(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
      );

      // 4. Top Most Viewed Knowledge Records
      const [popularRows] = await db.query(
        `SELECT title, view_count FROM knowledge_records WHERE status = 'published' ORDER BY view_count DESC LIMIT 5`
      );

      res.json({
        success: true,
        chartData: {
          categories: {
            labels: categoryRows.map(r => r.category_name),
            data: categoryRows.map(r => r.count)
          },
          statuses: {
            labels: statusRows.map(r => r.status.toUpperCase()),
            data: statusRows.map(r => r.count)
          },
          roles: {
            labels: roleRows.map(r => r.role.toUpperCase()),
            data: roleRows.map(r => r.count)
          },
          popular: {
            labels: popularRows.map(r => r.title.length > 25 ? r.title.substring(0, 22) + '...' : r.title),
            data: popularRows.map(r => r.view_count)
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;

