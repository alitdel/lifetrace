const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runInit() {
  console.log('=== LifeTrace Database Initialization ===');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const preferredEngine = (process.env.DB_ENGINE || 'mysql').toLowerCase();

  if (preferredEngine === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      console.log(`Connecting to MySQL at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}...`);
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
      });

      console.log('Connected! Executing schema.sql for lifetrace_db...');
      await connection.query(schemaSql);
      console.log('MySQL schema imported successfully!');
      await connection.end();
      return true;
    } catch (err) {
      console.warn(`MySQL init failed: ${err.message}`);
      if (process.env.STRICT_MYSQL === 'true') {
        throw err;
      }
      console.log('Initializing embedded SQLite database instead...');
    }
  }

  // SQLite initialization
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'lifetrace.sqlite');
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath); // clean recreate for fresh init
  }
  
  const db = new sqlite3.Database(dbPath);
  
  const sqliteSchema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'learner',
      full_name TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      avatar_url TEXT,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expert_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      bio TEXT,
      areas_of_expertise TEXT NOT NULL,
      experience_years INTEGER DEFAULT 1,
      organization_or_trade TEXT,
      location TEXT NOT NULL DEFAULT 'Uganda',
      contact_email TEXT,
      contact_phone TEXT,
      public_profile_visible INTEGER NOT NULL DEFAULT 1,
      verified_expert INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      bio TEXT,
      education_level TEXT,
      primary_interest TEXT,
      location TEXT NOT NULL DEFAULT 'Uganda',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT NOT NULL DEFAULT 'fa-tools',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS knowledge_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expert_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      local_name TEXT,
      community_region TEXT,
      slug TEXT NOT NULL UNIQUE,
      short_summary TEXT NOT NULL,
      detailed_description TEXT NOT NULL,
      cultural_background TEXT,
      estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
      skill_level TEXT NOT NULL DEFAULT 'beginner',
      preparation_instructions TEXT,
      material_sourcing TEXT,
      safety_precautions TEXT NOT NULL,
      common_mistakes TEXT,
      mistake_solutions TEXT,
      troubleshooting TEXT,
      expected_results TEXT NOT NULL,
      references_sources TEXT,
      attribution_consent TEXT,
      cover_image_url TEXT,
      demo_video_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      rejection_reason TEXT,
      review_comments TEXT,
      reviewer_id INTEGER,
      approved_at TEXT,
      published_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expert_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      safety_warning TEXT,
      tip TEXT,
      image_url TEXT,
      video_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      local_name TEXT,
      specification TEXT,
      optional INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      local_name TEXT,
      quantity TEXT NOT NULL,
      unit TEXT,
      source_location TEXT,
      optional INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'image',
      file_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      caption TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_visibility (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL UNIQUE,
      visibility_level TEXT NOT NULL DEFAULT 'public',
      allow_comments INTEGER NOT NULL DEFAULT 1,
      allow_assessments INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      decision TEXT NOT NULL,
      completeness_score INTEGER NOT NULL DEFAULT 5,
      clarity_score INTEGER NOT NULL DEFAULT 5,
      safety_score INTEGER NOT NULL DEFAULT 5,
      comments TEXT NOT NULL,
      internal_notes TEXT,
      reviewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      reviewer_id INTEGER,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      action TEXT NOT NULL,
      feedback_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      knowledge_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, knowledge_id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      objectives TEXT NOT NULL,
      instructions TEXT NOT NULL,
      estimated_duration TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id INTEGER NOT NULL,
      knowledge_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      current_step INTEGER NOT NULL DEFAULT 1,
      completed_steps_count INTEGER NOT NULL DEFAULT 0,
      total_steps_count INTEGER NOT NULL DEFAULT 1,
      completion_percentage REAL NOT NULL DEFAULT 0.00,
      enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      last_accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (learner_id, knowledge_id),
      FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_step_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      progress_id INTEGER NOT NULL,
      step_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (progress_id, step_id),
      FOREIGN KEY (progress_id) REFERENCES learning_progress (id) ON DELETE CASCADE,
      FOREIGN KEY (step_id) REFERENCES knowledge_steps (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS practical_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      learner_id INTEGER NOT NULL,
      submission_title TEXT NOT NULL,
      submission_text TEXT NOT NULL,
      file_url TEXT,
      original_filename TEXT,
      file_size INTEGER,
      mime_type TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      grade_score REAL,
      assessor_feedback TEXT,
      assessor_id INTEGER,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      evaluated_at TEXT,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (assessor_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      passing_score INTEGER NOT NULL DEFAULT 75,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      time_limit_minutes INTEGER NOT NULL DEFAULT 20,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS assessment_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'multiple_choice',
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      points INTEGER NOT NULL DEFAULT 10,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      learner_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_points INTEGER NOT NULL,
      percentage REAL NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      answers_json TEXT,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
      FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_code TEXT NOT NULL UNIQUE,
      learner_id INTEGER NOT NULL,
      knowledge_id INTEGER NOT NULL,
      assessment_result_id INTEGER,
      issue_date TEXT NOT NULL,
      title TEXT NOT NULL,
      learner_name TEXT NOT NULL,
      issuer_name TEXT NOT NULL DEFAULT 'LifeTrace Knowledge Verification Council',
      status TEXT NOT NULL DEFAULT 'valid',
      verification_url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (learner_id, knowledge_id),
      FOREIGN KEY (learner_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (assessment_result_id) REFERENCES assessment_results (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL DEFAULT 'SYSTEM',
      role TEXT NOT NULL DEFAULT 'ANONYMOUS',
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviewer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      qualification TEXT NOT NULL,
      specialization_domains TEXT NOT NULL,
      institution_or_guild TEXT,
      assigned_reviews_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_access_grants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      granted_by INTEGER NOT NULL,
      access_type TEXT NOT NULL DEFAULT 'read',
      granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author_or_source TEXT NOT NULL,
      reference_url TEXT,
      year_or_context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_review_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge_records (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS submission_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      evidence_type TEXT NOT NULL DEFAULT 'photo',
      step_number INTEGER,
      caption TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES practical_submissions (id) ON DELETE CASCADE
    );
  `;

  return new Promise((resolve, reject) => {
    db.exec(sqliteSchema, (err) => {
      if (err) {
        console.error('Error creating SQLite schema:', err);
        return reject(err);
      }
      console.log('SQLite schema successfully initialized at ' + dbPath);
      db.close();
      resolve(true);
    });
  });
}

if (require.main === module) {
  runInit()
    .then(() => {
      console.log('Database initialization completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Initialization failed:', err);
      process.exit(1);
    });
}

module.exports = runInit;

