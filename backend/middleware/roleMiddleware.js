/**
 * Role-Based Access Control (RBAC) Middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This function requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};

