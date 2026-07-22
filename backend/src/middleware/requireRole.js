export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.profile.role)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to perform this action', errors: [] });
    }
    next();
  };
}
