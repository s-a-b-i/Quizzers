export function requireRole(allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (typeof role !== 'string' || !allowed.has(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }
    next();
  };
}
