import { getCreateMcqPayloadError } from '../lib/mcqPayloadValidation.js';

/** POST /mcqs */
export function validateCreateMcq(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const msg = getCreateMcqPayloadError(req.body);
  if (msg) {
    return res.status(400).json({
      success: false,
      message: msg,
    });
  }

  next();
}
