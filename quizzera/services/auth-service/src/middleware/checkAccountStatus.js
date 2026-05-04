export function checkAccountStatus(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized.',
    });
  }

  const status = req.user.accountStatus;

  if (status === 'suspended' || status === 'inactive') {
    return res.status(403).json({
      success: false,
      message: 'Account is not active.',
    });
  }

  next();
}
