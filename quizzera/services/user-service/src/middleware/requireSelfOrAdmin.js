const PRIVILEGED = new Set(['admin', 'superAdmin']);

/** Caller may read the user if admin/superAdmin or if :userId matches their own Mongo _id. */
export function requireSelfOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    if (PRIVILEGED.has(req.user?.role)) {
      return next();
    }

    const raw = req.params[paramName];
    const selfId = req.user?._id?.toString?.();
    if (!raw || !selfId || raw !== selfId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    next();
  };
}
