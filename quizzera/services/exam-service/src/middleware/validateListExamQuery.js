import mongoose from 'mongoose';
import { DIFFICULTIES, EXAM_TYPES } from '../models/Exam.js';

function firstQuery(val) {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val[0];
  return val;
}

function parseTags(raw) {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((t) => String(t).split(',')).map((t) => t.trim()).filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parsePositiveInt(raw, fallback, max) {
  const v = firstQuery(raw);
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function optionalObjectIdQuery(req, res, paramName) {
  const raw = firstQuery(req.query[paramName]);
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, value: undefined };
  }
  const id = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false,
      response: res.status(400).json({
        success: false,
        message: `Query "${paramName}" must be a valid ObjectId.`,
      }),
    };
  }
  return { ok: true, value: id };
}

/** GET /exams — parse and validate list query; attach `req.examListQuery`. */
export function validateListExamQuery(req, res, next) {
  const examBody = optionalObjectIdQuery(req, res, 'examBodyId');
  if (!examBody.ok) return;
  const examTypeId = optionalObjectIdQuery(req, res, 'examTypeId');
  if (!examTypeId.ok) return;

  const examTypeRaw = firstQuery(req.query.examType);
  let examType;
  if (examTypeRaw !== undefined && examTypeRaw !== null && String(examTypeRaw).trim() !== '') {
    examType = String(examTypeRaw).trim();
    if (!EXAM_TYPES.includes(examType)) {
      return res.status(400).json({
        success: false,
        message: `Query "examType" must be one of: ${EXAM_TYPES.join(', ')}.`,
      });
    }
  }

  const difficultyRaw = firstQuery(req.query.difficulty);
  let difficulty;
  if (difficultyRaw !== undefined && difficultyRaw !== null && String(difficultyRaw).trim() !== '') {
    difficulty = String(difficultyRaw).trim();
    if (!DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Query "difficulty" must be one of: ${DIFFICULTIES.join(', ')}.`,
      });
    }
  }

  const page = parsePositiveInt(req.query.page, 1, 1_000_000);
  const limit = parsePositiveInt(req.query.limit, 20, 100);

  const recommendedRaw = firstQuery(req.query.recommended);
  const recommended =
    recommendedRaw !== undefined &&
    recommendedRaw !== null &&
    String(recommendedRaw).trim().toLowerCase() === 'true';

  req.examListQuery = {
    examBodyId: examBody.value,
    examTypeId: examTypeId.value,
    examType,
    difficulty,
    tags: parseTags(req.query.tags),
    recommended,
    page,
    limit,
  };

  next();
}
