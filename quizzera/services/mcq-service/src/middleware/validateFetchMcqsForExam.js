import mongoose from 'mongoose';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/** POST /mcqs/internal/fetch-for-exam */
export function validateFetchMcqsForExam(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const { subtopicIds, difficulty, count } = body;

  if (!Array.isArray(subtopicIds)) {
    return res.status(400).json({
      success: false,
      message: 'Field "subtopicIds" must be an array.',
    });
  }
  if (subtopicIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Field "subtopicIds" must contain at least one ObjectId.',
    });
  }

  const oids = [];
  for (let i = 0; i < subtopicIds.length; i += 1) {
    const raw = subtopicIds[i];
    const id = String(raw ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `subtopicIds[${i}] must be a valid ObjectId.`,
      });
    }
    oids.push(new mongoose.Types.ObjectId(id));
  }

  if (difficulty !== undefined && difficulty !== null && String(difficulty).trim() !== '') {
    const d = String(difficulty).trim();
    if (!DIFFICULTIES.has(d)) {
      return res.status(400).json({
        success: false,
        message: 'Field "difficulty" must be one of: easy, medium, hard.',
      });
    }
  }

  const n = Number(count);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 200) {
    return res.status(400).json({
      success: false,
      message: 'Field "count" must be an integer between 1 and 200.',
    });
  }

  req.fetchForExamPayload = {
    subtopicObjectIds: oids,
    difficulty:
      difficulty !== undefined && difficulty !== null && String(difficulty).trim() !== ''
        ? String(difficulty).trim()
        : undefined,
    count: n,
  };

  next();
}
