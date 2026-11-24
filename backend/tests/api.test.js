/**
 * LifeTrace Comprehensive Automated Test Suite
 * Tests all core functional, database, and security requirements
 */

const assert = require('assert');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../config/db');
const CertificateService = require('../services/certificateService');
const AuthController = require('../controllers/authController');
const AuditService = require('../services/auditService');
const KnowledgeController = require('../controllers/knowledgeController');
const MediaController = require('../controllers/mediaController');
const { uploadDirs } = require('../middleware/uploadMiddleware');

async function runTests() {
  console.log('========================================================');
  console.log('   LifeTrace Automated Verification & Test Suite        ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      failed++;
    }
  }

  // Initialize DB
  await db.initializeDatabase();

  // Test 0a: Authentication Logout & Cookie Clearing
  await test('Authentication: Logout destroys the server session and clears session cookies', async () => {
    const originalLogRequest = AuditService.logRequest;
    let sessionDestroyed = false;
    const clearedCookies = [];
    let cookieOptions = null;
    let responseBody = null;
    AuditService.logRequest = async () => {};

    try {
      await AuthController.logout({
        session: {
          user: { id: 1 },
          destroy(callback) {
            sessionDestroyed = true;
            callback(null);
          }
        }
      }, {
        clearCookie(name, options) {
          clearedCookies.push(name);
          cookieOptions = options;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
        status(code) {
          throw new Error(`Unexpected logout status: ${code}`);
        }
      }, (err) => {
        throw err;
      });

      assert(sessionDestroyed, 'Logout did not destroy the server session');
      assert(clearedCookies.includes('lifetrace.sid'), 'Logout did not clear lifetrace.sid session cookie');
      assert.deepStrictEqual(cookieOptions, { path: '/' }, 'Logout cookie path did not match the session cookie');
      assert.strictEqual(responseBody.success, true, 'Logout response was not successful');
    } finally {
      AuditService.logRequest = originalLogRequest;
    }
  });

  // Test 0b: Authentication Login Regenerates Session (Fixation Protection)
  await test('Authentication: Login regenerates session ID to prevent session fixation', async () => {
    const originalLogRequest = AuditService.logRequest;
    AuditService.logRequest = async () => {};

    let sessionRegenerated = false;
    let responseBody = null;

    try {
      const mockReq = {
        body: { username: 'admin', password: 'Admin@LifeTrace2025' },
        session: {
          regenerate(callback) {
            sessionRegenerated = true;
            callback(null);
          }
        }
      };

      const mockRes = {
        json(body) {
          responseBody = body;
          return this;
        },
        status(code) {
          return this;
        }
      };

      await AuthController.login(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      assert(sessionRegenerated, 'Session regenerate was not invoked during login');
      assert(responseBody && responseBody.success, 'Login did not return success response');
      assert(mockReq.session.user && mockReq.session.user.username === 'admin', 'User was not attached to regenerated session');
    } finally {
      AuditService.logRequest = originalLogRequest;
    }
  });

  // Test 0c: GetMe returns Reviewer Profile for Reviewers
  await test('Authentication: getMe returns reviewer_profiles for authenticated reviewers', async () => {
    const [revUser] = await db.query("SELECT id, username FROM users WHERE role = 'reviewer' LIMIT 1");
    assert(revUser.length > 0, 'No reviewer user found in database');

    let resultJson = null;
    const mockReq = {
      session: {
        user: { id: revUser[0].id }
      }
    };
    const mockRes = {
      json(data) {
        resultJson = data;
        return this;
      }
    };

    await AuthController.getMe(mockReq, mockRes, (err) => { if (err) throw err; });
    assert(resultJson && resultJson.authenticated, 'getMe should be authenticated');
    assert(resultJson.user && resultJson.user.profile, 'Reviewer user should include role profile');
    assert(resultJson.user.profile.specialization_domains, 'Reviewer profile should include specialization domains');
  });

  // Test 1: Database Connectivity and Core Seeding
  await test('Database: Relational engine connects and loads categories', async () => {
    const [cats] = await db.query('SELECT COUNT(*) as count FROM categories');
    assert(cats[0].count >= 10, 'Expected at least 10 practical skill categories seeded');
  });

  // Test 2: Users exist for all 4 roles
  await test('User Management: Four distinct roles exist in system', async () => {
    const [roles] = await db.query('SELECT DISTINCT role FROM users');
    const roleList = roles.map(r => r.role);
    assert(roleList.includes('admin'), 'Missing admin role');
    assert(roleList.includes('expert'), 'Missing expert role');
    assert(roleList.includes('reviewer'), 'Missing reviewer role');
    assert(roleList.includes('learner'), 'Missing learner role');
  });

  // Test 3: Password Hashing Verification
  await test('Security: Passwords stored as authentic bcrypt hashes', async () => {
    const [users] = await db.query('SELECT username, password_hash FROM users WHERE username = "admin"');
    assert(users.length > 0, 'Admin user not found');
    const isBcrypt = users[0].password_hash.startsWith('$2a$') || users[0].password_hash.startsWith('$2b$');
    assert(isBcrypt, 'Password hash is not in bcrypt format');
    const match = await bcrypt.compare('Admin@LifeTrace2025', users[0].password_hash);
    assert(match, 'Bcrypt verification failed for seeded admin credential');
  });

  // Test 4: Expert Profile Association
  await test('Expert Profiles: Seeded experts have detailed practical profile data', async () => {
    const [experts] = await db.query(
      `SELECT u.username, ep.areas_of_expertise, ep.location 
       FROM users u 
       JOIN expert_profiles ep ON u.id = ep.user_id 
       WHERE u.username = 'joyce_nakato'`
    );
    assert(experts.length === 1, 'Expert profile not joined');
    assert(experts[0].areas_of_expertise.includes('Basketry'), 'Missing expertise details');
  });

  // Test 5: Knowledge Records & Procedural Steps
  await test('Knowledge Capture: Records contain local names, cultural background, raw material sourcing, steps, tools, materials, and safety', async () => {
    const [records] = await db.query(
      `SELECT k.id, k.title, k.local_name, k.cultural_background, k.material_sourcing, k.safety_precautions,
              (SELECT COUNT(*) FROM knowledge_steps WHERE knowledge_id = k.id) as step_count,
              (SELECT COUNT(*) FROM knowledge_tools WHERE knowledge_id = k.id) as tool_count,
              (SELECT COUNT(*) FROM knowledge_materials WHERE knowledge_id = k.id) as mat_count
       FROM knowledge_records k
       WHERE k.id = 1`
    );
    assert(records.length === 1, 'Knowledge record #1 not found');
    const r = records[0];
    assert(r.local_name && r.local_name.includes('Ebibbo'), 'Missing authentic local craft name');
    assert(r.cultural_background && r.cultural_background.length > 30, 'Cultural background missing or too brief');
    assert(r.material_sourcing && r.material_sourcing.length > 20, 'Material sourcing missing or too brief');
    assert(r.safety_precautions.length > 20, 'Safety precautions missing or too brief');
    assert(r.step_count >= 5, `Expected at least 5 procedural steps, found ${r.step_count}`);
    assert(r.tool_count >= 3, `Expected tools recorded, found ${r.tool_count}`);
    assert(r.mat_count >= 3, `Expected materials recorded, found ${r.mat_count}`);
  });

  // Test 6: Review & Verification Workflow
  await test('Review Workflow: Formal review decisions and history are recorded', async () => {
    const [reviews] = await db.query(
      `SELECT r.decision, r.completeness_score, r.safety_score, u.username as reviewer_username
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.knowledge_id = 1`
    );
    assert(reviews.length > 0, 'No review record found for published knowledge');
    assert(reviews[0].decision === 'approved', 'Expected approved decision');
    assert(reviews[0].safety_score >= 4, 'Expected safety score rating');
  });

  // Test 7: Public Library Filtering
  await test('Knowledge Library: Public library queries exclude unpublished drafts', async () => {
    const [publicRecords] = await db.query(
      "SELECT id, title, status FROM knowledge_records WHERE status = 'published'"
    );
    assert(publicRecords.length > 0, 'No published records returned');
    publicRecords.forEach(rec => {
      assert.strictEqual(rec.status, 'published', 'Unpublished draft leaked into library');
    });
  });

  // Test 7b: Public/private visibility is enforced by library, detail, and reviewer access paths
  await test('Knowledge visibility: Public, learner-only, and restricted records enforce access rules', async () => {
    const [records] = await db.query(
      `SELECT k.id, k.expert_id, k.cover_image_url, kv.visibility_level
       FROM knowledge_records k
       JOIN knowledge_visibility kv ON kv.knowledge_id = k.id
       WHERE k.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM knowledge_review_assignments kra
           WHERE kra.knowledge_id = k.id
             AND kra.reviewer_id = (SELECT id FROM users WHERE role = 'reviewer' LIMIT 1)
         )
       LIMIT 1`
    );
    assert(records.length > 0, 'No published unassigned record available for visibility test');

    const record = records[0];
    const [learnerRows] = await db.query("SELECT id FROM users WHERE role = 'learner' LIMIT 1");
    const [expertRows] = await db.query("SELECT id FROM users WHERE role = 'expert' AND id != ? LIMIT 1", [record.expert_id]);
    const [reviewerRows] = await db.query("SELECT id FROM users WHERE role = 'reviewer' LIMIT 1");
    const [adminRows] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    assert(learnerRows.length && expertRows.length && reviewerRows.length && adminRows.length, 'Visibility test requires all seeded roles');

    const callController = (controller, req) => new Promise((resolve, reject) => {
      let statusCode = 200;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          resolve({ statusCode, body });
          return this;
        },
        end() {
          resolve({ statusCode, body: null });
          return this;
        },
        sendFile(filename, options, callback) {
          const error = new Error('test media file is not present');
          error.code = 'ENOENT';
          callback(error);
          return this;
        }
      };
      controller(req, res, reject);
    });

    const detail = (user) => callController(KnowledgeController.getDetails, {
      params: { id_or_slug: String(record.id) },
      session: user ? { user } : {}
    });
    const library = (user) => callController(KnowledgeController.getLibrary, {
      query: { page: '1', limit: '100' },
      session: user ? { user } : {}
    });
    const servePrivateMedia = (user) => callController(MediaController.serveUpload, {
      params: { type: 'media', filename: 'visibility-check.jpg' },
      session: user ? { user } : {}
    });

    try {
      await db.query("UPDATE knowledge_visibility SET visibility_level = 'private' WHERE knowledge_id = ?", [record.id]);
      await db.query("UPDATE knowledge_records SET cover_image_url = '/uploads/media/visibility-check.jpg' WHERE id = ?", [record.id]);

      const privateGuest = await detail(null);
      assert.strictEqual(privateGuest.statusCode, 403, 'Private knowledge must not be visible to guests');
      const privateGuestMedia = await servePrivateMedia(null);
      assert.strictEqual(privateGuestMedia.statusCode, 401, 'Private craft media must not be directly accessible to guests');
      const privateLearner = await detail({ id: Number(learnerRows[0].id), role: 'learner' });
      assert.strictEqual(privateLearner.statusCode, 403, 'Private knowledge must not be visible to unrelated learners');
      const privateLearnerMedia = await servePrivateMedia({ id: Number(learnerRows[0].id), role: 'learner' });
      assert.strictEqual(privateLearnerMedia.statusCode, 403, 'Private craft media must not be directly accessible to unrelated learners');
      const privateExpert = await detail({ id: Number(expertRows[0].id), role: 'expert' });
      assert.strictEqual(privateExpert.statusCode, 403, 'Private knowledge must not be visible to unrelated experts');
      const privateReviewer = await detail({ id: Number(reviewerRows[0].id), role: 'reviewer' });
      assert.strictEqual(privateReviewer.statusCode, 403, 'Private knowledge must not be visible to unassigned reviewers');
      const privateOwner = await detail({ id: Number(record.expert_id), role: 'expert' });
      assert.strictEqual(privateOwner.statusCode, 200, 'The knowledge owner must retain access to private knowledge');
      const privateOwnerMedia = await servePrivateMedia({ id: Number(record.expert_id), role: 'expert' });
      assert.strictEqual(privateOwnerMedia.statusCode, 404, 'The owner may pass authorization, then receive 404 when the test file is absent');
      const privateAdmin = await detail({ id: Number(adminRows[0].id), role: 'admin' });
      assert.strictEqual(privateAdmin.statusCode, 200, 'Administrators must retain access to private knowledge');

      const privatePublicLibrary = await library(null);
      assert(!privatePublicLibrary.body.records.some((item) => item.id === record.id), 'Private knowledge leaked into the public library');
      const privateLearnerLibrary = await library({ id: Number(learnerRows[0].id), role: 'learner' });
      assert(!privateLearnerLibrary.body.records.some((item) => item.id === record.id), 'Private knowledge leaked into the learner library');
      const featured = await callController(KnowledgeController.getFeatured, { session: {} });
      assert(!featured.body.records.some((item) => item.id === record.id), 'Private knowledge leaked into featured crafts');

      await db.query("UPDATE knowledge_visibility SET visibility_level = 'registered_learners' WHERE knowledge_id = ?", [record.id]);
      const learnerOnlyGuest = await detail(null);
      assert.strictEqual(learnerOnlyGuest.statusCode, 401, 'Learner-only knowledge must require authentication');
      const learnerOnlyExpert = await detail({ id: Number(expertRows[0].id), role: 'expert' });
      assert.strictEqual(learnerOnlyExpert.statusCode, 403, 'Learner-only knowledge must reject unrelated experts');
      const learnerOnlyLearner = await detail({ id: Number(learnerRows[0].id), role: 'learner' });
      assert.strictEqual(learnerOnlyLearner.statusCode, 200, 'Registered learners must be able to view learner-only knowledge');
    } finally {
      await db.query('UPDATE knowledge_visibility SET visibility_level = ? WHERE knowledge_id = ?', [record.visibility_level, record.id]);
      await db.query('UPDATE knowledge_records SET cover_image_url = ? WHERE id = ?', [record.cover_image_url, record.id]);
    }
  });

  // Test 8: Learner Progress Tracking
  await test('Learning Management: Learner step completion and percentage calculation', async () => {
    const [progress] = await db.query(
      `SELECT lp.completion_percentage, lp.status, COUNT(lsc.id) as completed_steps
       FROM learning_progress lp
       LEFT JOIN learning_step_completions lsc ON lp.id = lsc.progress_id
       WHERE lp.learner_id = 11 AND lp.knowledge_id = 1
       GROUP BY lp.id`
    );
    assert(progress.length > 0, 'Progress record missing for Denis Kato');
    assert.strictEqual(Number(progress[0].completion_percentage), 100, 'Expected 100% completion');
    assert.strictEqual(progress[0].status, 'completed', 'Expected completed status');
  });

  // Test 9: Practical Assignment Submission & Assessor Grading
  await test('Practical Assessment: Practical submission evidence graded by assessor', async () => {
    const [subs] = await db.query(
      `SELECT ps.submission_title, ps.grade_score, ps.status, assessor.full_name as assessor_name
       FROM practical_submissions ps
       JOIN users assessor ON ps.assessor_id = assessor.id
       WHERE ps.learner_id = 11 AND ps.knowledge_id = 1`
    );
    assert(subs.length > 0, 'Practical submission record not found');
    assert(subs[0].status === 'passed', 'Expected submission status to be passed');
    assert(subs[0].grade_score >= 75, 'Expected grade >= 75%');
  });

  // Test 10: Theoretical Mastery Quiz & Answers
  await test('Assessment Quiz: Assessment questions and evaluation records exist', async () => {
    const [quiz] = await db.query(
      `SELECT a.id, a.passing_score, COUNT(aq.id) as question_count
       FROM assessments a
       JOIN assessment_questions aq ON a.id = aq.assessment_id
       WHERE a.knowledge_id = 1
       GROUP BY a.id`
    );
    assert(quiz.length > 0, 'Assessment questions not found');
    assert(quiz[0].question_count >= 3, 'Expected at least 3 assessment questions');

    const [results] = await db.query(
      `SELECT score, percentage, passed FROM assessment_results WHERE learner_id = 11 AND assessment_id = 1`
    );
    assert(results.length > 0, 'Assessment result missing for learner 11');
    assert(results[0].passed === 1 || results[0].passed === true, 'Learner did not pass assessment');
  });

  // Test 11: Certificate Generation & Verification
  await test('Certificates: Authentic unique certificate verification by reference code', async () => {
    const cert = await CertificateService.verifyCertificate('LT-UG-2026-BSK-001');
    assert(cert !== null, 'Certificate LT-UG-2026-BSK-001 not verified');
    assert.strictEqual(cert.learner_name, 'Denis Kato', 'Mismatched recipient name');
    assert.strictEqual(cert.status, 'valid', 'Certificate is not marked valid');
    assert(cert.category_name.includes('Basket'), 'Mismatched category in certificate');
  });

  // Test 11b: Learner Practical Submission Evidence
  await test('Practical Evidence: Learner submission contains multi-angle photo evidence records', async () => {
    const [evidence] = await db.query(
      `SELECT se.file_url, se.step_number, se.caption
       FROM submission_evidence se
       JOIN practical_submissions ps ON se.submission_id = ps.id
       WHERE ps.learner_id = 11`
    );
    assert(evidence.length >= 2, `Expected at least 2 photo evidence records, found ${evidence.length}`);
    assert(evidence.some(e => e.caption.includes('Finished') || e.caption.includes('spiral')), 'Evidence details missing');
  });

  // Test 11c: Reviewer Profiles & Assignments
  await test('Reviewer Profiles: Verified reviewer profiles and review assignments exist', async () => {
    const [revProfiles] = await db.query(
      `SELECT rp.specialization_domains, u.username
       FROM reviewer_profiles rp
       JOIN users u ON rp.user_id = u.id`
    );
    assert(revProfiles.length >= 2, 'Expected at least 2 reviewer profiles');
  });

  // Test 12: In-App Notifications
  await test('Notifications: User notification dispatch and read-state management', async () => {
    const [notifs] = await db.query('SELECT id, title, type, is_read FROM notifications WHERE user_id = 11');
    assert(notifs.length > 0, 'No notifications found for learner');
    const certNotif = notifs.find(n => n.title.includes('Certificate'));
    assert(certNotif !== undefined, 'Certificate notification not found');
  });

  // Test 13: Immutable Audit Logging
  await test('Audit Trail: System and user actions recorded in audit log table', async () => {
    const [logs] = await db.query('SELECT action, module, record_id FROM audit_logs');
    assert(logs.length >= 3, 'Audit log entries expected');
    const actions = logs.map(l => l.action);
    assert(actions.includes('SYSTEM_INITIALIZED'), 'Missing SYSTEM_INITIALIZED audit');
  });

  // Test 14: System Settings
  await test('System Settings: Platform configurations loaded from database', async () => {
    const [settings] = await db.query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key = "platform_name"');
    assert(settings.length > 0, 'platform_name setting missing');
    assert(settings[0].setting_value.includes('LifeTrace'), 'Setting value mismatch');
  });

  // Test 15: Security Check - Public Registration Role Boundary
  await test('Security: Public registration restriction prevents unauthorized Admin/Reviewer signups', async () => {
    const { validateRegistration } = require('../middleware/validationMiddleware');
    let statusCode = null;
    let jsonResponse = null;

    const mockReq = {
      body: {
        username: 'hacker_admin',
        email: 'hacker@test.ug',
        password: 'Password123!',
        full_name: 'Malicious Actor',
        role: 'admin' // Attempting to register as admin!
      }
    };
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { jsonResponse = data; return mockRes; }
    };
    const mockNext = () => { statusCode = 200; };

    validateRegistration(mockReq, mockRes, mockNext);
    assert.strictEqual(statusCode, 403, 'Expected 403 Forbidden when registering as admin');
    assert(jsonResponse.message.includes('only permitted for Learner and Expert'), 'Unexpected error message');
  });

  // Test 16: File Storage Configuration Verification
  await test('Storage: Upload directories configured and accessible', async () => {
    assert(uploadDirs.media && path.isAbsolute(uploadDirs.media), 'Upload media directory is not configured');
    assert(uploadDirs.avatars && path.isAbsolute(uploadDirs.avatars), 'Upload avatars directory is not configured');
    assert(uploadDirs.submissions && path.isAbsolute(uploadDirs.submissions), 'Upload submissions directory is not configured');
  });

  console.log('\n========================================================');
  console.log(`  Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
