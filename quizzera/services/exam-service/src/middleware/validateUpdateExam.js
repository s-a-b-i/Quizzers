import { getUpdateExamPatchError } from '../lib/examPayloadValidation.js';

/** PATCH /exams/:examId */
export function validateUpdateExam(req, res, next) {
  const msg = getUpdateExamPatchError(req.body);
  if (msg) {
    return res.status(400).json({
      success: false,
      message: msg,
    });
  }
  next();
}
