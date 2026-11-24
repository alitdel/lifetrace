/**
 * LifeTrace Database Schema Initialization
 * Safe, idempotent setup for TiDB Cloud & MySQL 8 (with dev SQLite support)
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../../.env')
});

async function runInit() {
  console.log('====================================================');
  console.log('   LifeTrace Database Schema Initialization         ');
  console.log('====================================================');

  const preferredEngine = (process.env.DB_ENGINE || 'mysql').toLowerCase();

  // 1. SQLite Initialization (Development only)
  if (preferredEngine === 'sqlite') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: SQLite cannot be initialized in production. Use TiDB Cloud (MySQL).');
    }

    console.log('[Init] Initializing local SQLite database...');
    const sqlite3 = require('sqlite3').verbose();
    const dbDir = path.resolve(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'lifetrace.sqlite');
    const sqliteDb = new sqlite3.Database(dbPath);

    const runSql = (sql) => new Promise((resolve, reject) => {
      sqliteDb.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await runSql('PRAGMA foreign_keys = ON;');

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'learner',
        full_name TEXT NOT NULL,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        avatar_url TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS expert_profiles (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS learner_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        bio TEXT,
        education_level TEXT,
        primary_interest TEXT,
        location TEXT NOT NULL DEFAULT 'Uganda',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT NOT NULL DEFAULT 'fa-tools',
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_records (
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
        approved_at DATETIME,
        published_at DATETIME,
        view_count INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        step_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        instruction TEXT NOT NULL,
        safety_warning TEXT,
        tip TEXT,
        image_url TEXT,
        video_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        local_name TEXT,
        specification TEXT,
        optional INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        local_name TEXT,
        quantity TEXT NOT NULL,
        unit TEXT,
        source_location TEXT,
        optional INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'image',
        file_path TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        caption TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_visibility (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL UNIQUE,
        visibility_level TEXT NOT NULL DEFAULT 'public',
        allow_comments INTEGER NOT NULL DEFAULT 1,
        allow_assessments INTEGER NOT NULL DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        decision TEXT NOT NULL,
        completeness_score INTEGER NOT NULL DEFAULT 5,
        clarity_score INTEGER NOT NULL DEFAULT 5,
        safety_score INTEGER NOT NULL DEFAULT 5,
        comments TEXT NOT NULL,
        internal_notes TEXT,
        reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS review_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        reviewer_id INTEGER,
        previous_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        action TEXT NOT NULL,
        feedback_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        knowledge_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, knowledge_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS learning_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        objectives TEXT NOT NULL,
        instructions TEXT NOT NULL,
        estimated_duration TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS learning_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        knowledge_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        current_step INTEGER NOT NULL DEFAULT 1,
        completed_steps_count INTEGER NOT NULL DEFAULT 0,
        total_steps_count INTEGER NOT NULL DEFAULT 1,
        completion_percentage NUMERIC NOT NULL DEFAULT 0.00,
        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (learner_id, knowledge_id),
        FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS learning_step_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        progress_id INTEGER NOT NULL,
        step_id INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (progress_id, step_id),
        FOREIGN KEY (progress_id) REFERENCES learning_progress(id) ON DELETE CASCADE,
        FOREIGN KEY (step_id) REFERENCES knowledge_steps(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS practical_submissions (
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
        grade_score NUMERIC,
        assessor_feedback TEXT,
        assessor_id INTEGER,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluated_at DATETIME,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assessor_id) REFERENCES users(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        passing_score INTEGER NOT NULL DEFAULT 75,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        time_limit_minutes INTEGER NOT NULL DEFAULT 20,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS assessment_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL DEFAULT 'multiple_choice',
        options_json TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        points INTEGER NOT NULL DEFAULT 10,
        display_order INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS assessment_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL,
        learner_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_points INTEGER NOT NULL,
        percentage NUMERIC NOT NULL,
        passed INTEGER NOT NULL DEFAULT 0,
        answers_json TEXT,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_code TEXT NOT NULL UNIQUE,
        learner_id INTEGER NOT NULL,
        knowledge_id INTEGER NOT NULL,
        assessment_result_id INTEGER,
        issue_date DATE NOT NULL,
        title TEXT NOT NULL,
        learner_name TEXT NOT NULL,
        issuer_name TEXT NOT NULL DEFAULT 'LifeTrace Knowledge Verification Council',
        status TEXT NOT NULL DEFAULT 'valid',
        verification_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (learner_id, knowledge_id),
        FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        link TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      );`,
      `CREATE TABLE IF NOT EXISTS reviewer_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        qualification TEXT NOT NULL,
        specialization_domains TEXT NOT NULL,
        institution_or_guild TEXT,
        assigned_reviews_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_access_grants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        granted_by INTEGER NOT NULL,
        access_type TEXT NOT NULL DEFAULT 'read',
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        author_or_source TEXT NOT NULL,
        reference_url TEXT,
        year_or_context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS knowledge_review_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        reviewer_id INTEGER NOT NULL,
        assigned_by INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        due_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_records(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
      );`,
      `CREATE TABLE IF NOT EXISTS submission_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        evidence_type TEXT NOT NULL DEFAULT 'photo',
        step_number INTEGER,
        caption TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES practical_submissions(id) ON DELETE CASCADE
      );`
    ];

    for (const ddl of tables) {
      await runSql(ddl);
    }

    console.log(`[Init] SQLite schema initialization complete (29 tables verified).`);
    await new Promise(resolve => sqliteDb.close(resolve));
    return true;
  }

  // 2. TiDB Cloud / MySQL Schema Initialization
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error('schema.sql was not found.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const mysql = require('mysql2/promise');

  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = Number(process.env.DB_PORT || (dbHost.includes('tidbcloud.com') ? 4000 : 3306));
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'lifetrace_db';

  const isTiDB = dbHost.includes('tidbcloud.com') || dbPort === 4000;
  const isProd = process.env.NODE_ENV === 'production';
  const useSsl = process.env.DB_SSL === 'false' ? false : (isTiDB || isProd || process.env.DB_SSL === 'true');

  const sslConfig = useSsl ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined;

  let connection;

  try {
    console.log(`[Init] Connecting to TiDB/MySQL at ${dbHost}:${dbPort} (TLS: ${Boolean(sslConfig)})...`);

    // First attempt: Connect directly to the target database
    try {
      connection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        multipleStatements: true,
        ssl: sslConfig
      });
      console.log(`[Init] Connected directly to database '${dbName}'.`);
    } catch (directConnErr) {
      // If database doesn't exist, connect to server without database and create it
      if (directConnErr.code === 'ER_BAD_DB_ERROR' || directConnErr.message.includes('Unknown database')) {
        console.log(`[Init] Database '${dbName}' not found. Connecting to server to create it...`);
        connection = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          multipleStatements: true,
          ssl: sslConfig
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.query(`USE \`${dbName}\`;`);
        console.log(`[Init] Database '${dbName}' created and selected.`);
      } else {
        throw directConnErr;
      }
    }

    console.log('[Init] Applying 29 relational tables from schema.sql...');
    await connection.query(schemaSql);

    // Verify all 29 tables exist
    const [tableRows] = await connection.query('SHOW TABLES;');
    const tableNames = tableRows.map(r => Object.values(r)[0]);
    console.log(`[Init] Schema applied successfully. Detected ${tableNames.length} tables in database.`);

    const requiredTables = [
      'users', 'expert_profiles', 'learner_profiles', 'categories',
      'knowledge_records', 'knowledge_steps', 'knowledge_tools', 'knowledge_materials',
      'knowledge_media', 'knowledge_visibility', 'reviews', 'review_history',
      'bookmarks', 'learning_activities', 'learning_progress', 'learning_step_completions',
      'practical_submissions', 'assessments', 'assessment_questions', 'assessment_results',
      'certificates', 'notifications', 'audit_logs', 'system_settings',
      'reviewer_profiles', 'knowledge_access_grants', 'knowledge_references',
      'knowledge_review_assignments', 'submission_evidence'
    ];

    const missing = requiredTables.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      console.warn(`[Init Warning] Missing tables: ${missing.join(', ')}`);
    } else {
      console.log(`[Init] Verification passed: All 29 LifeTrace tables are present and ready.`);
    }

    return true;
  } catch (error) {
    console.error(`[Init Error] Failed to initialize database:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

if (require.main === module) {
  runInit()
    .then(() => {
      console.log('====================================================');
      console.log('   Database Initialization Completed Successfully!   ');
      console.log('====================================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal initialization error:', err.message);
      process.exit(1);
    });
}

module.exports = runInit;
