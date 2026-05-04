export function validateGoogleAuth(req, res, next) {
  const { idToken } = req.body ?? {};

  if (typeof idToken !== 'string' || idToken.trim().length === 0) {
    return res.status(422).json({
      success: false,
      message: 'Valid idToken is required.',
    });
  }

  req.validatedGoogle = { idToken: idToken.trim() };
  next();
}
