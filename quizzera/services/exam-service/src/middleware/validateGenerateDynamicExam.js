import mongoose from 'mongoose';
import { DIFFICULTIES } from '../models/Exam.js';

const MCQ_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function parsePositiveInt(raw, field, { min = 1, max = 200 } = {}) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    return {
      ok: false,
      message: `Field "${field}" must be an integer between ${min} and ${max}.`,
    };
  }
  return { ok: true, value: n };
}

/** POST /exams/dynamic/generate */
export function validateGenerateDynamicExam(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object.',
    });
  }

  const keys = Object.keys(body);
  const allowed = new Set([
    'subjectId',
    'topicIds',
    'difficulty',
    'totalQuestions',
    'durationMinutes',
  ]);
  const unknown = keys.filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Unsupported field(s): ${unknown.join(', ')}.`,
    });
  }

  const rawSubjectId = body.subjectId;
  if (rawSubjectId === undefined || rawSubjectId === null || String(rawSubjectId).trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Field "subjectId" is required.',
    });
  }
  const subjectId = String(rawSubjectId).trim();
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return res.status(400).json({
      success: false,
      message: 'Field "subjectId" must be a valid ObjectId.',
    });
  }

  const { topicIds } = body;
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Field "topicIds" must be a non-empty array.',
    });
  }

  const parsedTopicIds = [];
  for (let i = 0; i < topicIds.length; i += 1) {
    const id = String(topicIds[i] ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `topicIds[${i}] must be a valid ObjectId.`,
      });
    }
    parsedTopicIds.push(id);
  }

  const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
  if (!difficulty) {
    return res.status(400).json({
      success: false,
      message: 'Field "difficulty" is required.',
    });
  }
  if (!DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({
      success: false,
      message: `Field "difficulty" must be one of: ${DIFFICULTIES.join(', ')}.`,
    });
  }

  const totalQuestions = parsePositiveInt(body.totalQuestions, 'totalQuestions');
  if (!totalQuestions.ok) {
    return res.status(400).json({ success: false, message: totalQuestions.message });
  }

  const durationMinutes = parsePositiveInt(body.durationMinutes, 'durationMinutes', {
    max: 24 * 60,
  });
  if (!durationMinutes.ok) {
    return res.status(400).json({ success: false, message: durationMinutes.message });
  }

  req.generateDynamicExamPayload = {
    subjectId,
    topicIds: parsedTopicIds,
    difficulty,
    mcqDifficulty: MCQ_DIFFICULTIES.has(difficulty) ? difficulty : undefined,
    totalQuestions: totalQuestions.value,
    durationMinutes: durationMinutes.value,
  };

  next();
}
