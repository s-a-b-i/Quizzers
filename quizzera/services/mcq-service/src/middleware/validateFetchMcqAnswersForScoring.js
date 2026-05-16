import mongoose from 'mongoose';

const MAX_IDS = 200;

/** POST /mcqs/internal/answers-for-scoring */
export function validateFetchMcqAnswersForScoring(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || !keys.includes('mcqIds')) {
    return res.status(400).json({
      success: false,
      message: 'Request body must only contain "mcqIds".',
    });
  }

  const { mcqIds } = body;
  if (!Array.isArray(mcqIds)) {
    return res.status(400).json({
      success: false,
      message: 'Field "mcqIds" must be an array.',
    });
  }
  if (mcqIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Field "mcqIds" must contain at least one ObjectId.',
    });
  }
  if (mcqIds.length > MAX_IDS) {
    return res.status(400).json({
      success: false,
      message: `Field "mcqIds" may contain at most ${MAX_IDS} entries.`,
    });
  }

  const oids = [];
  for (let i = 0; i < mcqIds.length; i += 1) {
    const id = String(mcqIds[i] ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `mcqIds[${i}] must be a valid ObjectId.`,
      });
    }
    oids.push(new mongoose.Types.ObjectId(id));
  }

  req.answersForScoringPayload = { mcqObjectIds: oids };
  next();
}
