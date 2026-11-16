const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let dbClient = null;
let activeEngine = 'mysql';

/**
 * Clean and adapt SQL queries for dual-engine compatibility
 */
function adaptSql(sql, engine) {
  if (engine === 'sqlite') {
    // Convert MySQL specific constructs to SQLite
    return sql
      .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
      .replace(/INT UNSIGNED/gi, 'INTEGER')
      .replace(/TINYINT\(1\)/gi, 'INTEGER')
      .replace(/TINYINT UNSIGNED/gi, 'INTEGER')
      .replace(/MEDIUMTEXT/gi, 'TEXT')
      .replace(/DATETIME/gi, 'TEXT')
      .replace(/CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP')
      .replace(/ENGINE\s*=\s*InnoDB[^;]*/gi, '')
      .replace(/DEFAULT CHARSET[^;]*/gi, '')
      .replace(/COLLATE[^;]*/gi, '')
      .replace(/ON DUPLICATE KEY UPDATE[\s\S]*?;/gi, ';');
  }
  return sql;
}

/**
 * Initialize Database Connection
 */
async function initializeDatabase() {
  const preferredEngine = (process.env.DB_ENGINE || 'mysql').toLowerCase();
  
  if (preferredEngine === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lifetrace_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      // Test connection
      const [rows] = await pool.query('SELECT 1 as connected');
      if (rows && rows[0].connected) {
        console.log(`[Database] Successfully connected to MySQL 8 on ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}`);
        dbClient = pool;
        activeEngine = 'mysql';
        return;
      }
    } catch (err) {
      console.warn(`[Database Warning] MySQL connection failed (${err.message}).`);
      if (process.env.STRICT_MYSQL === 'true') {
        throw err;
      }
      console.log(`[Database] Falling back to high-fidelity embedded SQLite relational engine for seamless execution...`);
    }
  }

  // Fallback to SQLite
  activeEngine = 'sqlite';
  const sqlite3 = require('sqlite3').verbose();
  const dbDir = path.resolve(__dirname, '../database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'lifetrace.sqlite');
  
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON;');

  dbClient = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const trimmed = sql.trim();
        const isSelect = /^(SELECT|PRAGMA|SHOW)/i.test(trimmed);
        
        if (isSelect) {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve([rows, null]);
          });
        } else {
          sqliteDb.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve([{ insertId: this.lastID, affectedRows: this.changes }, null]);
          });
        }
      });
    },
    execute: (sql, params = []) => dbClient.query(sql, params),
    rawDb: sqliteDb
  };

  console.log(`[Database] Connected to embedded SQLite at ${dbPath}`);
}

/**
 * Standardized query function
 */
async function query(sql, params = []) {
  if (!dbClient) {
    await initializeDatabase();
  }
  
  try {
    return await dbClient.query(sql, params);
  } catch (error) {
    console.error(`[Database Query Error]`, error.message, `SQL: ${sql.substring(0, 100)}...`);
    throw error;
  }
}

/**
 * Execute statement
 */
async function execute(sql, params = []) {
  return query(sql, params);
}

/**
 * Get active engine
 */
function getEngine() {
  return activeEngine;
}

module.exports = {
  initializeDatabase,
  query,
  execute,
  getEngine
};

