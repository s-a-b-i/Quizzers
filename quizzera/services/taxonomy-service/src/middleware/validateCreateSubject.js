import mongoose from 'mongoose';

/** POST /taxonomy/subjects */
export function validateCreateSubject(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const allowed = new Set(['name', 'examBodyId', 'examTypeId', 'description', 'tags', 'weightage']);
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

  for (const field of ['examBodyId', 'examTypeId']) {
    if (req.body[field] === undefined || req.body[field] === null) continue;
    const id = String(req.body[field]).trim();
    if (id === '') continue;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Field "${field}" must be a valid ObjectId.`,
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

  if (req.body.weightage !== undefined) {
    if (typeof req.body.weightage !== 'number' || Number.isNaN(req.body.weightage)) {
      return res.status(400).json({
        success: false,
        message: 'Field "weightage" must be a number.',
      });
    }
  }

  next();
}
