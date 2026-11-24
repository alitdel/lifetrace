/**
 * Input Validation & Sanitization Middleware
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateRegistration(req, res, next) {
  const { username, email, password, full_name, role } = req.body;

  if (!username || !email || !password || !full_name) {
    return res.status(400).json({
      success: false,
      message: 'All required fields (username, email, password, full_name) must be provided.'
    });
  }

  const cleanUser = sanitizeString(username);
  if (cleanUser.length < 3 || cleanUser.length > 50 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
    return res.status(400).json({
      success: false,
      message: 'Username must be between 3 and 50 characters and contain only letters, numbers, dots, dashes, or underscores.'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long.'
    });
  }

  // Security check: Only 'expert' and 'learner' can register publicly!
  // Reviewer and Admin roles are strictly created through administrator controls or CLI.
  if (role && !['learner', 'expert'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Public registration is only permitted for Learner and Expert accounts. Reviewer and Administrator roles require official platform invitation.'
    });
  }

  req.body.username = cleanUser;
  req.body.email = email.trim().toLowerCase();
  req.body.full_name = sanitizeString(full_name);
  req.body.role = role || 'learner';

  next();
}

function validateLogin(req, res, next) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please enter both username/email and password.'
    });
  }

  req.body.username = sanitizeString(username);
  next();
}

function validateKnowledge(req, res, next) {
  const { title, category_id, short_summary, detailed_description, safety_precautions, expected_results } = req.body;

  if (!title || !category_id || !short_summary || !detailed_description) {
    return res.status(400).json({
      success: false,
      message: 'Title, Category, Short Summary, and Detailed Description are required fields.'
    });
  }

  if (title.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Knowledge title must be at least 5 characters long.'
    });
  }

  // Safety precautions are mandatory for practical knowledge
  if (!safety_precautions || safety_precautions.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Safety precautions are mandatory for practical knowledge preservation to prevent accidents or injury.'
    });
  }

  next();
}

module.exports = {
  sanitizeString,
  isValidEmail,
  validateRegistration,
  validateLogin,
  validateKnowledge
};

