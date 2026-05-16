import { getCreateExamPayloadError } from '../lib/examPayloadValidation.js';

/** POST /exams */
export function validateCreateExam(req, res, next) {
  const msg = getCreateExamPayloadError(req.body);
  if (msg) {
    return res.status(400).json({
      success: false,
      message: msg,
    });
  }
  next();
}
