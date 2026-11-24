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
    const caPath = process.env.DB_CA_PATH || process.env.DB_SSL_CA;
    if (caPath && fs.existsSync(caPath)) {
      sslOptions.ca = fs.readFileSync(caPath, 'utf8');
    } else if (process.env.DB_CA) {
      sslOptions.ca = process.env.DB_CA;
    }

    return sslOptions;
  }

  return undefined;
}

/**
 * Initialize Database Connection
 * Production strictly enforces TiDB/MySQL with TLS.
 * SQLite is available only in development when explicitly configured (DB_ENGINE=sqlite).
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
        end: () => new Promise((resolve) => sqliteDb.close(resolve))
      };

      activeEngine = 'sqlite';
      console.log('[Database] Connected to embedded SQLite for local development.');
      return;
    }

    // 2. TiDB Cloud / MySQL Engine
    const mysql = require('mysql2/promise');

    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '4000', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'lifetrace_db';
    const ssl = getSslConfig();

    const poolConfig = {
      host,
      port,
      user,
      password,
      database,
      ssl,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000
    };

    try {
      const pool = mysql.createPool(poolConfig);

      // Verify connectivity
      const connection = await pool.getConnection();
      connection.release();

      dbClient = pool;
      activeEngine = 'mysql';

      const isTiDB = host.includes('tidbcloud.com') || port === 4000;
      console.log(`[Database] Connected to ${isTiDB ? 'TiDB Cloud (MySQL)' : 'MySQL'} on ${host}:${port}/${database} (TLS: ${ssl ? 'Active' : 'Disabled'})`);

    } catch (error) {
      console.error(`[Database Error] Failed to connect to ${host}:${port}/${database}`);
      console.error(`[Database Error] Details: ${error.message}`);

      // Strict production requirement: Never silently fallback to SQLite in production
      if (process.env.NODE_ENV === 'production' || process.env.STRICT_MYSQL === 'true') {
        throw new Error(
          `FATAL: Could not connect to production database (${host}:${port}/${database}). ` +
          `Falling back to SQLite is strictly forbidden in production. Fix connection credentials. Error: ${error.message}`
        );
      }

      console.warn('[Database Warning] Falling back to embedded SQLite for local offline development.');

      const sqlite3 = require('sqlite3').verbose();
      const dbDir = path.resolve(__dirname, '../database');

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, 'lifetrace.sqlite');
      const sqliteDb = new sqlite3.Database(dbPath);

      await new Promise((resolve, reject) => {
        sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      dbClient = {
        query: (sql, params = []) =>
          new Promise((resolve, reject) => {
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
                resolve([{
                  insertId: this.lastID,
                  affectedRows: this.changes
                }, null]);
              });
            }
          }),

        execute: (sql, params = []) => dbClient.query(sql, params),
        end: () => new Promise((resolve) => sqliteDb.close(resolve))
      };

      activeEngine = 'sqlite';
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
 * Execute query on active database
 */
async function query(sql, params = []) {
  if (!dbClient) {
    await initializeDatabase();
  }

  try {
    return await dbClient.query(sql, params);
  } catch (error) {
    // If pool lost connection, attempt re-initialization once
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNRESET') {
      console.warn('[Database Warning] Connection lost. Attempting to re-establish connection pool...');
      dbClient = null;
      initializationPromise = null;
      await initializeDatabase();
      return await dbClient.query(sql, params);
    }
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
