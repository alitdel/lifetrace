const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function initAdmin() {
  console.log('=== LifeTrace Secure Administrator Initialization ===');
  await db.initializeDatabase();

  const args = process.argv.slice(2);
  const getArg = (name, fallback) => {
    const found = args.find(a => a.startsWith(`--${name}=`));
    if (found) return found.split('=')[1];
    return fallback;
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const username = getArg('username', process.env.ADMIN_USERNAME || 'admin');
  const email = getArg('email', process.env.ADMIN_EMAIL || 'admin@lifetrace.ug');
  const fullName = getArg('fullname', 'System Administrator');
  const phone = getArg('phone', '+256700000001');

  let password = getArg('password', process.env.ADMIN_PASSWORD);

  if (!password) {
    if (isProduction) {
      console.error('[Security Error] In production, ADMIN_PASSWORD environment variable or --password=<secret> argument is strictly required.');
      await db.close().catch(() => {});
      process.exit(1);
    } else {
      password = 'Admin@LifeTrace2025';
      console.warn('[Security Warning] Using default development admin password. DO NOT USE IN PRODUCTION.');
    }
  }

  if (!username || !email) {
    console.error('Error: Administrator username and email are required.');
    await db.close().catch(() => {});
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Security Policy: Administrator password must be at least 8 characters long.');
    await db.close().catch(() => {});
    process.exit(1);
  }

  try {
    // Check if user already exists
    const [existing] = await db.query(
      'SELECT id, username, email, role FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing && existing.length > 0) {
      const user = existing[0];
      if (user.role === 'admin') {
        console.log(`Administrator account '${user.username}' already exists (ID: ${user.id}).`);
        // Update password securely
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?", [hash, user.id]);
        console.log(`Password for administrator '${user.username}' has been securely refreshed.`);
        await db.close().catch(() => {});
        process.exit(0);
      } else {
        console.error(`Conflict: A user with username/email '${user.username}' already exists with role '${user.role}'.`);
        await db.close().catch(() => {});
        process.exit(1);
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert administrator
    const [result] = await db.query(
      "INSERT INTO users (username, email, password_hash, role, full_name, phone, status) VALUES (?, ?, ?, 'admin', ?, ?, 'active')",
      [username, email, passwordHash, fullName, phone]
    );

    const adminId = result.insertId;
    console.log(`Administrator successfully created!`);
    console.log(`ID: ${adminId}`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);

    // Record audit log
    await db.query(
      "INSERT INTO audit_logs (user_id, username, role, action, module, record_id, ip_address, details_json) VALUES (?, ?, 'admin', 'ADMIN_CLI_INITIALIZATION', 'AUTH', ?, '127.0.0.1', ?)",
      [adminId, username, String(adminId), JSON.stringify({ event: 'Admin account created via secure CLI tool' })]
    );

    console.log('Audit log entry created.');
    await db.close().catch(() => {});
    process.exit(0);
  } catch (err) {
    console.error('Failed to initialize administrator:', err.message);
    await db.close().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  initAdmin().catch(err => {
    console.error('Fatal admin initialization error:', err);
    process.exit(1);
  });
}

module.exports = initAdmin;
