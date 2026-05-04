export function validateRefreshToken(req, res, next) {
  const { refreshToken } = req.body ?? {};

  if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    return res.status(422).json({
      success: false,
      message: 'Valid refreshToken is required.',
    });
  }

  req.validatedRefresh = { refreshToken: refreshToken.trim() };
  next();
}
