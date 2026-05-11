import mongoose from 'mongoose';

/** PATCH /taxonomy/subjects/:slug */
export function validatePatchSubject(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const allowed = new Set([
    'name',
    'description',
    'tags',
    'isActive',
    'weightage',
    'examBodyId',
    'examTypeId',
  ]);
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

  if (req.body.tags !== undefined) {
    if (!Array.isArray(req.body.tags)) {
      return res.status(400).json({
        success: false,
        message: 'Field "tags" must be an array of strings.',
      });
    }
    if (!req.body.tags.every((t) => typeof t === 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Each tag must be a string.',
      });
    }
  }

  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Field "isActive" must be a boolean.',
    });
  }

  if (req.body.weightage !== undefined) {
    if (typeof req.body.weightage !== 'number' || Number.isNaN(req.body.weightage)) {
      return res.status(400).json({
        success: false,
        message: 'Field "weightage" must be a number.',
      });
    }
  }

  for (const field of ['examBodyId', 'examTypeId']) {
    if (req.body[field] === undefined) continue;
    if (req.body[field] === null) continue;
    const id = String(req.body[field]).trim();
    if (id === '') {
      return res.status(400).json({
        success: false,
        message: `Field "${field}" must be null or a valid ObjectId.`,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Field "${field}" must be null or a valid ObjectId.`,
      });
    }
  }

  next();
}
