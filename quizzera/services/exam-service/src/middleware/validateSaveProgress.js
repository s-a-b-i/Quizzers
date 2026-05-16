import mongoose from 'mongoose';

/** PATCH /exams/sessions/:sessionId/progress */
export function validateSaveProgress(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || !keys.includes('answers')) {
    return res.status(400).json({
      success: false,
      message: 'Request body must only contain "answers".',
    });
  }

  const { answers } = body;
  if (!Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Field "answers" must be an array.',
    });
  }

  const parsed = [];
  for (let i = 0; i < answers.length; i += 1) {
    const item = answers[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return res.status(400).json({
        success: false,
        message: `answers[${i}] must be an object.`,
      });
    }

    const itemKeys = Object.keys(item);
    const allowed = new Set(['mcqId', 'selectedLabel']);
    const unknown = itemKeys.filter((k) => !allowed.has(k));
    if (unknown.length > 0) {
      return res.status(400).json({
        success: false,
        message: `answers[${i}] has unsupported field(s): ${unknown.join(', ')}.`,
      });
    }

    const rawId = item.mcqId;
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      return res.status(400).json({
        success: false,
        message: `answers[${i}].mcqId is required.`,
      });
    }
    const mcqId = String(rawId).trim();
    if (!mongoose.Types.ObjectId.isValid(mcqId)) {
      return res.status(400).json({
        success: false,
        message: `answers[${i}].mcqId must be a valid ObjectId.`,
      });
    }

    if (item.selectedLabel !== undefined && typeof item.selectedLabel !== 'string') {
      return res.status(400).json({
        success: false,
        message: `answers[${i}].selectedLabel must be a string.`,
      });
    }

    parsed.push({
      mcqId,
      selectedLabel: typeof item.selectedLabel === 'string' ? item.selectedLabel.trim() : '',
    });
  }

  req.saveProgressPayload = { answers: parsed };
  next();
}
