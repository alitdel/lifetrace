/**
 * Authentication Middleware
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in to continue.'
  });
}

function optionalAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};

