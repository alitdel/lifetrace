const bcrypt = require('bcryptjs');
const db = require('../config/db');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

class AuthController {
  /**
   * User Registration (Expert or Learner)
   */
  static async register(req, res, next) {
    try {
      const {
        username,
        email,
        password,
        full_name,
        role,
        phone,
        areas_of_expertise,
        organization_or_trade,
        location,
        education_level,
        primary_interest
      } = req.body;

      // Check uniqueness
      const [existing] = await db.query(
        'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existing && existing.length > 0) {
        const match = existing[0];
        const field = match.username === username ? 'Username' : 'Email';
        return res.status(409).json({
          success: false,
          message: `${field} is already registered. Please use a different one or log in.`
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Default avatar based on role
      const avatarUrl = `/assets/avatars/${role === 'expert' ? 'sarah.png' : 'denis.png'}`;

      // Insert user
      const [userResult] = await db.query(
        `INSERT INTO users (username, email, password_hash, role, full_name, phone, status, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        [username, email, passwordHash, role, full_name, phone || null, avatarUrl]
      );

      const userId = userResult.insertId;

      // Insert role profile
      if (role === 'expert') {
        await db.query(
          `INSERT INTO expert_profiles (user_id, bio, areas_of_expertise, organization_or_trade, location)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            'Practitioner and knowledge contributor at LifeTrace.',
            areas_of_expertise || 'General Practical Trade',
            organization_or_trade || 'Independent Artisan / Practitioner',
            location || 'Uganda'
          ]
        );
      } else if (role === 'learner') {
        await db.query(
          `INSERT INTO learner_profiles (user_id, bio, education_level, primary_interest, location)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            'Active learner acquiring verified practical vocational competencies.',
            education_level || 'Vocational Student',
            primary_interest || 'Practical Skills',
            location || 'Uganda'
          ]
        );
      }

      // Welcome notification
      await NotificationService.notify({
        userId,
        title: 'Welcome to LifeTrace Uganda!',
        message: `Hello ${full_name}! Your ${role.toUpperCase()} account is now active. Explore our verified practical knowledge library or begin documenting skills.`,
        type: 'success',
        link: role === 'expert' ? '/create-knowledge.html' : '/knowledge-library.html'
      });

      // Audit Log
      await AuditService.logRequest(req, {
        action: 'USER_REGISTERED',
        module: 'AUTH',
        recordId: userId,
        details: { username, email, role, full_name }
      });

      // Automatically log the new user into session with session regeneration
      const sessionUser = {
        id: userId,
        username,
        email,
        full_name,
        role,
        avatar_url: avatarUrl,
        phone: phone || null
      };

      const finalizeRegistration = () => {
        req.session.user = sessionUser;
        return res.status(201).json({
          success: true,
          message: 'Account successfully created!',
          user: req.session.user
        });
      };

      if (req.session && typeof req.session.regenerate === 'function') {
        req.session.regenerate((err) => {
          if (err) return next(err);
          finalizeRegistration();
        });
      } else {
        finalizeRegistration();
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * User Login (Protects against session fixation via regenerate)
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Look up user by username or email
      const [rows] = await db.query(
        `SELECT id, username, email, password_hash, role, full_name, phone, status, avatar_url
         FROM users
         WHERE username = ? OR email = ?`,
        [username, username.toLowerCase()]
      );

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your username/email and password.'
        });
      }

      const user = rows[0];

      // Check account status
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Your account is currently ${user.status}. Please contact the platform administrator.`
        });
      }

      // Verify bcrypt hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your username/email and password.'
        });
      }

      // Update last_login
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.query('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

      const sessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        phone: user.phone
      };

      const finalizeLogin = async () => {
        req.session.user = sessionUser;

        // Audit Log
        await AuditService.logRequest(req, {
          action: 'USER_LOGIN',
          module: 'AUTH',
          recordId: user.id,
          details: { username: user.username, role: user.role }
        });

        return res.json({
          success: true,
          message: `Welcome back, ${user.full_name}!`,
          user: req.session.user
        });
      };

      // Regenerate session ID to prevent Session Fixation attacks
      if (req.session && typeof req.session.regenerate === 'function') {
        req.session.regenerate((err) => {
          if (err) return next(err);
          finalizeLogin();
        });
      } else {
        await finalizeLogin();
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * User Logout
   */
  static async logout(req, res, next) {
    try {
      if (req.session && req.session.user) {
        await AuditService.logRequest(req, {
          action: 'USER_LOGOUT',
          module: 'AUTH',
          recordId: req.session.user.id
        });
      }

      const clearSessionCookies = () => {
        return res
          .clearCookie('lifetrace.sid', { path: '/' })
          .clearCookie('connect.sid', { path: '/' })
          .json({ success: true, message: 'Successfully logged out.' });
      };

      if (!req.session) {
        return clearSessionCookies();
      }

      req.session.destroy(err => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Could not log out.' });
        }
        return clearSessionCookies();
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Current Session User (Me)
   */
  static async getMe(req, res, next) {
    try {
      if (!req.session || !req.session.user) {
        return res.json({ success: true, authenticated: false, user: null });
      }

      const userId = req.session.user.id;
      const [userRows] = await db.query(
        `SELECT id, username, email, role, full_name, phone, status, avatar_url, created_at, last_login
         FROM users WHERE id = ?`,
        [userId]
      );

      if (!userRows || userRows.length === 0) {
        if (req.session && typeof req.session.destroy === 'function') {
          req.session.destroy();
        }
        return res.json({ success: true, authenticated: false, user: null });
      }

      const user = userRows[0];
      let profile = null;

      if (user.role === 'expert') {
        const [p] = await db.query('SELECT * FROM expert_profiles WHERE user_id = ?', [userId]);
        profile = p[0] || null;
      } else if (user.role === 'learner') {
        const [p] = await db.query('SELECT * FROM learner_profiles WHERE user_id = ?', [userId]);
        profile = p[0] || null;
      } else if (user.role === 'reviewer') {
        const [p] = await db.query('SELECT * FROM reviewer_profiles WHERE user_id = ?', [userId]);
        profile = p[0] || null;
      }

      // Update session in case role or status changed
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        phone: user.phone
      };

      res.json({
        success: true,
        authenticated: true,
        user: { ...user, profile }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Change Password
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both current password and new password are required.'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.'
        });
      }

      const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password does not match our records.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

      await AuditService.logRequest(req, {
        action: 'PASSWORD_CHANGED',
        module: 'AUTH',
        recordId: userId
      });

      res.json({
        success: true,
        message: 'Your password has been securely updated.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
