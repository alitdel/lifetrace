/**
 * LifeTrace Database Configuration & Connection Pool
 * Optimized for TiDB Cloud (MySQL compatible) & Local Development
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({
  path: path.join(__dirname, '../../.env')
});

let dbClient = null;
let activeEngine = null;
let initializationPromise = null;

/**
 * Build SSL configuration for MySQL/TiDB
 */
function getSslConfig() {
  // If explicitly disabled in local dev
  if (process.env.DB_SSL === 'false') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database SSL cannot be disabled in production environment.');
    }
    return undefined;
  }

  // TiDB Cloud or production requires TLS
  const isTiDB = (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')) ||
                 Number(process.env.DB_PORT) === 4000;
  const isProd = process.env.NODE_ENV === 'production';
  const forceSsl = process.env.DB_SSL === 'true';

  if (isTiDB || isProd || forceSsl) {
    const sslOptions = {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    };

    // If custom CA certificate is provided
    if (process.env.DB_CA_PATH && fs.existsSync(process.env.DB_CA_PATH)) {
      sslOptions.ca = fs.readFileSync(process.env.DB_CA_PATH, 'utf8');
    } else if (process.env.DB_CA) {
      sslOptions.ca = process.env.DB_CA;
    }

    return sslOptions;
  }

  return undefined;
}

/**
 * Initialize Database Connection
 * Production strictly enforces TiDB/MySQL.
 * SQLite is available only in development when explicitly configured.
 */
async function initializeDatabase() {
  if (dbClient) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const preferredEngine = (process.env.DB_ENGINE || 'mysql').toLowerCase();

    // 1. SQLite Engine (Development only)
    if (preferredEngine === 'sqlite') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: SQLite is strictly forbidden in production. Configure TiDB Cloud (MySQL).');
      }

      const sqlite3 = require('sqlite3').verbose();
      const dbDir = path.resolve(__dirname, '../database');

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, 'lifetrace.sqlite');
      const sqliteDb = new sqlite3.Database(dbPath);

      await new Promise((resolve, reject) => {
        sqliteDb.run('PRAGMA foreign_keys = ON;', (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      dbClient = {
        query: (sql, params = []) =>
          new Promise((resolve, reject) => {
            const trimmed = sql.trim();
            const isSelect = /^(SELECT|PRAGMA|SHOW)/i.test(trimmed);

            if (isSelect) {
              sqliteDb.all(sql, params, (error, rows) => {
                if (error) return reject(error);
                resolve([rows, null]);
              });
            } else {
              sqliteDb.run(sql, params, function (error) {
                if (error) return reject(error);
                resolve([{
                  insertId: this.lastID,
                  affectedRows: this.changes
                }, null]);
              });
            }
          }),

        execute: (sql, params = []) => dbClient.query(sql, params),
        rawDb: sqliteDb,
        end: () => new Promise(resolve => sqliteDb.close(resolve))
      };

      activeEngine = 'sqlite';
      console.log('[Database] Connected to embedded SQLite for local development.');
      return;
    }

    // 2. TiDB Cloud / MySQL Engine
    if (preferredEngine !== 'mysql') {
      throw new Error(`Unsupported database engine: ${preferredEngine}. Supported: mysql, sqlite`);
    }

    const mysql = require('mysql2/promise');
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = Number(process.env.DB_PORT || (dbHost.includes('tidbcloud.com') ? 4000 : 3306));
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'lifetrace_db';
    const sslConfig = getSslConfig();

    const poolConfig = {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000
    };

    const pool = mysql.createPool(poolConfig);

    try {
      const [rows] = await pool.query('SELECT 1 AS connected');

      if (!rows || rows[0].connected !== 1) {
        throw new Error('Database ping failed.');
      }

      dbClient = pool;
      activeEngine = 'mysql';

      console.log(`[Database] Connected successfully to TiDB/MySQL (${dbHost}:${dbPort}/${dbName}, TLS: ${Boolean(sslConfig)})`);
    } catch (error) {
      await pool.end().catch(() => {});

      // Safe error output without leaking passwords
      console.error(`[Database Error] Connection failed to TiDB/MySQL at ${dbHost}:${dbPort}/${dbName}:`, error.message);

      // Never silently fall back to SQLite in production or when strict mode is active
      throw error;
    }
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

/**
 * Standard database query helper
 */
async function query(sql, params = []) {
  if (!dbClient) {
    await initializeDatabase();
  }

  try {
    return await dbClient.query(sql, params);
  } catch (error) {
    console.error(
      '[Database Query Error]',
      error.message,
      `| SQL: ${sql.substring(0, 120)}...`
    );
    throw error;
  }
}

/**
 * Execute query alias
 */
async function execute(sql, params = []) {
  return query(sql, params);
}

/**
 * Return the active engine ('mysql' or 'sqlite')
 */
function getEngine() {
  return activeEngine;
}

/**
 * Close database pool
 */
async function close() {
  if (dbClient) {
    await dbClient.end();
    dbClient = null;
    activeEngine = null;
    initializationPromise = null;
  }
}

module.exports = {
  initializeDatabase,
  query,
  execute,
  getEngine,
  close
};
