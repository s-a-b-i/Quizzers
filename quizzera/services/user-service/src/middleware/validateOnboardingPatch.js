/** PATCH /users/me/onboarding — body must be `{ onboardingCompleted: boolean }` only. */
export function validateOnboardingPatch(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(req.body);
  if (keys.length !== 1 || keys[0] !== 'onboardingCompleted') {
    return res.status(400).json({
      success: false,
      message: 'Body must contain only the "onboardingCompleted" boolean field.',
    });
  }

  if (typeof req.body.onboardingCompleted !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'onboardingCompleted must be a boolean.',
    });
  }

  next();
}
