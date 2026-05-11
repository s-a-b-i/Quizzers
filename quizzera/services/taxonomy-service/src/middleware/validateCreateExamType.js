import mongoose from 'mongoose';

/** POST /taxonomy/exam-types */
export function validateCreateExamType(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const allowed = new Set(['name', 'examBodyId', 'description']);
  const keys = Object.keys(req.body);
  const unknown = keys.filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Field "name" is required.',
    });
  }

  const rawId = req.body.examBodyId;
  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Field "examBodyId" is required.',
    });
  }

  const examBodyId = String(rawId).trim();
  if (!mongoose.Types.ObjectId.isValid(examBodyId)) {
    return res.status(400).json({
      success: false,
      message: 'Field "examBodyId" must be a valid ObjectId.',
    });
  }

  if (req.body.description !== undefined && typeof req.body.description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Field "description" must be a string.',
    });
  }

  next();
}
