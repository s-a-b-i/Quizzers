/** PATCH /users/me — body must include only `preferences` (object). Role, accountStatus, firebaseUid, email cannot be updated here. */
export function validatePreferencesPatch(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(req.body);

  if (!keys.includes('preferences')) {
    return res.status(400).json({
      success: false,
      message: 'Field "preferences" is required.',
    });
  }

  const unknown = keys.filter((k) => k !== 'preferences');
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  if (req.body.preferences === null || typeof req.body.preferences !== 'object' || Array.isArray(req.body.preferences)) {
    return res.status(400).json({
      success: false,
      message: 'preferences must be a JSON object.',
    });
  }

  next();
}
