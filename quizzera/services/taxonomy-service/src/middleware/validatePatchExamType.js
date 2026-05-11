import mongoose from 'mongoose';

/** PATCH /taxonomy/exam-types/:slug */
export function validatePatchExamType(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const allowed = new Set(['name', 'description', 'examBodyId', 'isActive']);
  const keys = Object.keys(req.body);
  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one field is required.',
    });
  }

  const unknown = keys.filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  if (req.body.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Field "name" must be a non-empty string.',
      });
    }
  }

  if (req.body.description !== undefined && typeof req.body.description !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Field "description" must be a string.',
    });
  }

  if (req.body.examBodyId !== undefined) {
    const id = String(req.body.examBodyId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Field "examBodyId" must be a valid ObjectId.',
      });
    }
  }

  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Field "isActive" must be a boolean.',
    });
  }

  next();
}
