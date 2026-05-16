import mongoose from 'mongoose';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/** POST /mcqs/internal/fetch-for-weak-area */
export function validateFetchMcqsForWeakArea(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(body);
  const allowed = new Set(['topicIds', 'difficulty', 'count']);
  const unknown = keys.filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  const { topicIds } = body;
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Field "topicIds" must be a non-empty array.',
    });
  }

  const oids = [];
  for (let i = 0; i < topicIds.length; i += 1) {
    const id = String(topicIds[i] ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `topicIds[${i}] must be a valid ObjectId.`,
      });
    }
    oids.push(new mongoose.Types.ObjectId(id));
  }

  if (body.difficulty !== undefined && body.difficulty !== null && String(body.difficulty).trim() !== '') {
    const d = String(body.difficulty).trim();
    if (!DIFFICULTIES.has(d)) {
      return res.status(400).json({
        success: false,
        message: 'Field "difficulty" must be one of: easy, medium, hard.',
      });
    }
  }

  const n = Number(body.count);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 200) {
    return res.status(400).json({
      success: false,
      message: 'Field "count" must be an integer between 1 and 200.',
    });
  }

  req.fetchForWeakAreaPayload = {
    topicObjectIds: oids,
    difficulty:
      body.difficulty !== undefined && body.difficulty !== null && String(body.difficulty).trim() !== ''
        ? String(body.difficulty).trim()
        : undefined,
    count: n,
  };

  next();
}
