import mongoose from 'mongoose';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const REVIEW = new Set(['draft', 'reviewed', 'approved']);
const VISIBILITY = new Set(['public', 'premium', 'hidden']);

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

/** GET /mcqs — parse and validate list query; attach `req.mcqListQuery`. */
export function validateListMcqQuery(req, res, next) {
  const privileged = req.mcqListPrivileged === true;

  const subject = optionalObjectIdQuery(req, res, 'subjectId');
  if (!subject.ok) return;
  const topic = optionalObjectIdQuery(req, res, 'topicId');
  if (!topic.ok) return;
  const subtopic = optionalObjectIdQuery(req, res, 'subtopicId');
  if (!subtopic.ok) return;
  const examBody = optionalObjectIdQuery(req, res, 'examBodyId');
  if (!examBody.ok) return;

  const diffRaw = firstQuery(req.query.difficulty);
  if (diffRaw !== undefined && diffRaw !== null && String(diffRaw).trim() !== '') {
    const d = String(diffRaw).trim();
    if (!DIFFICULTIES.has(d)) {
      return res.status(400).json({
        success: false,
        message: 'Query "difficulty" must be one of: easy, medium, hard.',
      });
    }
  }

  const reviewRaw = firstQuery(req.query.reviewStatus);
  if (reviewRaw !== undefined && reviewRaw !== null && String(reviewRaw).trim() !== '') {
    if (!privileged) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators may filter by reviewStatus.',
      });
    }
    const r = String(reviewRaw).trim();
    if (!REVIEW.has(r)) {
      return res.status(400).json({
        success: false,
        message: 'Query "reviewStatus" must be one of: draft, reviewed, approved.',
      });
    }
  }

  const visRaw = firstQuery(req.query.visibilityStatus);
  if (visRaw !== undefined && visRaw !== null && String(visRaw).trim() !== '') {
    if (!privileged) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators may filter by visibilityStatus.',
      });
    }
    const v = String(visRaw).trim();
    if (!VISIBILITY.has(v)) {
      return res.status(400).json({
        success: false,
        message: 'Query "visibilityStatus" must be one of: public, premium, hidden.',
      });
    }
  }

  const page = parsePositiveInt(req.query.page, 1, 1_000_000);
  const limit = parsePositiveInt(req.query.limit, 20, 100);

  req.mcqListQuery = {
    subjectId: subject.value,
    topicId: topic.value,
    subtopicId: subtopic.value,
    examBodyId: examBody.value,
    difficulty:
      diffRaw !== undefined && diffRaw !== null && String(diffRaw).trim() !== ''
        ? String(diffRaw).trim()
        : undefined,
    tags: parseTags(req.query.tags),
    reviewStatus:
      reviewRaw !== undefined && reviewRaw !== null && String(reviewRaw).trim() !== ''
        ? String(reviewRaw).trim()
        : undefined,
    visibilityStatus:
      visRaw !== undefined && visRaw !== null && String(visRaw).trim() !== ''
        ? String(visRaw).trim()
        : undefined,
    page,
    limit,
  };

  next();
}
