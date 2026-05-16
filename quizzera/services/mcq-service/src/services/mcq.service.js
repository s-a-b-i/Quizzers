import mongoose from 'mongoose';
import AnswerReveal from '../models/AnswerReveal.js';
import Bookmark from '../models/Bookmark.js';
import MCQ from '../models/MCQ.js';
import User, { USER_ROLES } from '../models/User.js';
import {
  ALLOWED_KEYS,
  getCreateMcqPayloadError,
} from '../lib/mcqPayloadValidation.js';

function stripPublicMcqFields(row) {
  if (!row || typeof row !== 'object') return row;
  const o = { ...row };
  delete o.correctAnswer;
  delete o.explanation;
  return o;
}

function stripCorrectAnswerOnly(row) {
  if (!row || typeof row !== 'object') return row;
  const o = { ...row };
  delete o.correctAnswer;
  return o;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Subject ids under an exam body from the taxonomy database (same Atlas cluster, different DB name).
 * Lets exam-body-only MCQ lists include questions with subjectId but empty examMappings.
 */
async function getSubjectIdsForExamBody(examBodyObjectId) {
  const dbName = (process.env.TAXONOMY_DB_NAME || 'quizzera_taxonomy').trim();
  try {
    const client = mongoose.connection.getClient();
    if (!client || !dbName) return [];
    const coll = client.db(dbName).collection('subjects');
    const docs = await coll
      .find({ examBodyId: examBodyObjectId, isActive: true })
      .project({ _id: 1 })
      .toArray();
    return docs.map((d) => d._id);
  } catch {
    return [];
  }
}

/**
 * List MCQs with filters and pagination.
 * @param {{ privileged: boolean, filters: object }} opts
 */
export async function listMcqs({ privileged, filters }) {
  const filter = {};

  if (!privileged) {
    filter.visibilityStatus = 'public';
    filter.reviewStatus = 'approved';
    filter.isActive = true;
  }

  if (filters.subjectId) {
    filter.subjectId = filters.subjectId;
  }
  if (filters.topicId) {
    filter.topicId = filters.topicId;
  }
  if (filters.subtopicId) {
    filter.subtopicId = filters.subtopicId;
  }
  if (filters.difficulties?.length === 1) {
    filter.difficulty = filters.difficulties[0];
  } else if (filters.difficulties?.length > 1) {
    filter.difficulty = { $in: filters.difficulties };
  }
  const taxonomyNarrowed = !!(
    filters.subjectId ||
    filters.topicId ||
    filters.subtopicId
  );
  if (filters.examBodyId && !taxonomyNarrowed) {
    const bodyOid = new mongoose.Types.ObjectId(filters.examBodyId);
    const subjectIds = await getSubjectIdsForExamBody(bodyOid);
    const orParts = [{ examMappings: { $elemMatch: { examBodyId: bodyOid } } }];
    if (subjectIds.length > 0) {
      orParts.push({ subjectId: { $in: subjectIds } });
    }
    filter.$and = Array.isArray(filter.$and) ? [...filter.$and] : [];
    filter.$and.push({ $or: orParts });
  }
  if (filters.reviewStatus) {
    filter.reviewStatus = filters.reviewStatus;
  }
  if (filters.visibilityStatus) {
    filter.visibilityStatus = filters.visibilityStatus;
  }
  if (filters.tags?.length) {
    filter.tags = { $in: filters.tags };
  }
  if (filters.searchText) {
    filter.questionStem = {
      $regex: escapeRegex(filters.searchText),
      $options: 'i',
    };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [rows, total] = await Promise.all([
    MCQ.find(filter).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
    MCQ.countDocuments(filter),
  ]);

  const mcqs = rows.map(stripPublicMcqFields);

  return {
    mcqs,
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

/**
 * Fetch one MCQ by Mongo `_id`. Returns `null` when missing, inactive, or not visible to the caller.
 * @param {string} id
 * @param {{ privileged: boolean }} opts
 */
export async function getMcqById(id, { privileged }) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const _id = new mongoose.Types.ObjectId(id);

  const filter = privileged
    ? { _id }
    : {
        _id,
        isActive: true,
        visibilityStatus: 'public',
        reviewStatus: 'approved',
      };

  const row = await MCQ.findOne(filter).lean();
  if (!row) return null;

  if (privileged) {
    return { ...row };
  }
  return stripPublicMcqFields(row);
}

const REVEAL_MCQ_FILTER = {
  isActive: true,
  visibilityStatus: 'public',
  reviewStatus: 'approved',
};

/** Resolves a Mongo `User` `_id` for `req.user` (mirror doc, lookup, or create). */
async function resolveMongoUserIdForActor(actor) {
  if (!actor) return null;
  if (actor._id) return actor._id;
  const uid = typeof actor.firebaseUid === 'string' ? actor.firebaseUid.trim() : '';
  if (!uid) return null;
  let doc = await User.findOne({ firebaseUid: uid }).select('_id').lean();
  if (doc?._id) return doc._id;

  const email = typeof actor.email === 'string' ? actor.email.trim().toLowerCase() : '';
  const role =
    typeof actor.role === 'string' && USER_ROLES.includes(actor.role) ? actor.role : 'student';
  if (!email) return null;
  try {
    const created = await User.create({ firebaseUid: uid, email, role });
    return created._id;
  } catch {
    doc = await User.findOne({ firebaseUid: uid }).select('_id').lean();
    return doc?._id ?? null;
  }
}

/**
 * Returns `{ correctAnswer, explanation }` for an entitled user reveal flow.
 * MCQ must be public, approved, and active. Logs to `AnswerReveal` when a local `User` id can be resolved.
 * @param {string} mcqId
 * @param {object} actor `req.user` from `verifyToken`
 */
export async function revealMcqAnswer(mcqId, actor) {
  if (!mongoose.Types.ObjectId.isValid(mcqId)) {
    return null;
  }

  const _id = new mongoose.Types.ObjectId(mcqId);
  const row = await MCQ.findOne({ _id, ...REVEAL_MCQ_FILTER })
    .select('correctAnswer explanation')
    .lean();

  if (!row) return null;

  const userId = await resolveMongoUserIdForActor(actor);
  const revealedAt = new Date();
  if (userId) {
    try {
      await AnswerReveal.create({ userId, mcqId: _id, revealedAt });
    } catch (err) {
      console.error('[mcq-service] AnswerReveal log failed:', err?.message ?? err);
    }
  } else {
    console.warn('[mcq-service] AnswerReveal skipped: could not resolve userId for actor');
  }

  return {
    correctAnswer: row.correctAnswer,
    explanation: typeof row.explanation === 'string' ? row.explanation : '',
  };
}

/**
 * Toggle bookmark for MCQ. Adding requires an active MCQ; removing only needs an existing bookmark row.
 * @returns {{ ok: true, bookmarked: boolean } | { ok: false, code: string }}
 */
export async function toggleBookmark(mcqId, actor) {
  if (!mongoose.Types.ObjectId.isValid(mcqId)) {
    return { ok: false, code: 'INVALID_MCQ_ID' };
  }

  const userId = await resolveMongoUserIdForActor(actor);
  if (!userId) {
    return { ok: false, code: 'NO_USER' };
  }

  const mcqOid = new mongoose.Types.ObjectId(mcqId);
  const existing = await Bookmark.findOne({ userId, mcqId: mcqOid }).select('_id').lean();

  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    return { ok: true, bookmarked: false };
  }

  const mcqExists = await MCQ.exists({ _id: mcqOid, isActive: true });
  if (!mcqExists) {
    return { ok: false, code: 'MCQ_NOT_FOUND' };
  }

  try {
    await Bookmark.create({ userId, mcqId: mcqOid, createdAt: new Date() });
  } catch (err) {
    if (err?.code === 11000) {
      return { ok: true, bookmarked: true };
    }
    throw err;
  }

  return { ok: true, bookmarked: true };
}

/**
 * Paginated bookmarked MCQs for the user (newest bookmark first). Omits `correctAnswer` only.
 * @returns {{ ok: true, mcqs, total, page, limit } | { ok: false, code: string }}
 */
export async function listBookmarksForUser(actor, { page, limit }) {
  const userId = await resolveMongoUserIdForActor(actor);
  if (!userId) {
    return { ok: false, code: 'NO_USER' };
  }

  const skip = (page - 1) * limit;
  const [marks, total] = await Promise.all([
    Bookmark.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Bookmark.countDocuments({ userId }),
  ]);

  if (!marks.length) {
    return { ok: true, mcqs: [], total, page, limit };
  }

  const ids = marks.map((m) => m.mcqId);
  const rows = await MCQ.find({ _id: { $in: ids } }).lean();
  const byId = new Map(rows.map((r) => [String(r._id), r]));

  const mcqs = marks
    .map((m) => byId.get(String(m.mcqId)))
    .filter(Boolean)
    .map(stripCorrectAnswerOnly);

  return { ok: true, mcqs, total, page, limit };
}

async function resolveCreatedBy(actor) {
  if (!actor) return null;
  if (actor._id) return actor._id;
  const uid = typeof actor.firebaseUid === 'string' ? actor.firebaseUid.trim() : '';
  if (!uid) return null;
  const u = await User.findOne({ firebaseUid: uid });
  return u?._id ?? null;
}

function normalizeFullMcqForSave(merged) {
  return {
    questionStem: String(merged.questionStem).trim(),
    options: merged.options.map((o) => ({
      label: String(o.label).trim(),
      text: String(o.text).trim(),
    })),
    correctAnswer: String(merged.correctAnswer).trim(),
    explanation:
      typeof merged.explanation === 'string' ? merged.explanation : '',
    subjectId: String(merged.subjectId).trim(),
    topicId: String(merged.topicId).trim(),
    subtopicId: String(merged.subtopicId).trim(),
    examMappings: Array.isArray(merged.examMappings)
      ? merged.examMappings.map((m) => ({
          examBodyId: String(m.examBodyId).trim(),
          examTypeId: String(m.examTypeId).trim(),
        }))
      : [],
    difficulty: merged.difficulty ?? 'medium',
    source: typeof merged.source === 'string' ? merged.source : '',
    tags: Array.isArray(merged.tags)
      ? merged.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    reviewStatus: merged.reviewStatus ?? 'draft',
    visibilityStatus: merged.visibilityStatus ?? 'hidden',
    isActive: typeof merged.isActive === 'boolean' ? merged.isActive : true,
  };
}

/**
 * DELETE /mcqs/:id — soft delete (sets `isActive: false`). Document remains in the DB.
 * @returns {{ code: 'OK' } | { code: 'NOT_FOUND' }}
 */
export async function softDeleteMcq(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { code: 'NOT_FOUND' };
  }

  const doc = await MCQ.findById(id);
  if (!doc) {
    return { code: 'NOT_FOUND' };
  }

  doc.isActive = false;
  await doc.save();
  return { code: 'OK' };
}

/**
 * Internal: random MCQs for exam generation (includes `correctAnswer` / `explanation`).
 * @param {{ subtopicObjectIds: import('mongoose').Types.ObjectId[], difficulty?: string, count: number }} opts
 */
export async function fetchMcqsForExam({ subtopicObjectIds, difficulty, count }) {
  const match = {
    isActive: true,
    reviewStatus: 'approved',
    visibilityStatus: 'public',
    subtopicId: { $in: subtopicObjectIds },
  };
  if (difficulty) {
    match.difficulty = difficulty;
  }

  const mcqs = await MCQ.aggregate([{ $match: match }, { $sample: { size: count } }]);

  return { mcqs };
}

/**
 * Internal: random MCQs for weak-area exams (filters by topicId).
 * @param {{ topicObjectIds: import('mongoose').Types.ObjectId[], difficulty?: string, count: number }} opts
 */
export async function fetchMcqsForWeakArea({ topicObjectIds, difficulty, count }) {
  const match = {
    isActive: true,
    reviewStatus: 'approved',
    visibilityStatus: 'public',
    topicId: { $in: topicObjectIds },
  };
  if (difficulty) {
    match.difficulty = difficulty;
  }

  const mcqs = await MCQ.aggregate([{ $match: match }, { $sample: { size: count } }]);

  return { mcqs };
}

/**
 * Internal: correct answers and topic ids for exam scoring.
 * @param {{ mcqObjectIds: import('mongoose').Types.ObjectId[] }} opts
 */
export async function fetchMcqAnswersForScoring({ mcqObjectIds }) {
  const rows = await MCQ.find({ _id: { $in: mcqObjectIds } })
    .select('_id correctAnswer topicId')
    .lean();

  const mcqs = rows.map((row) => ({
    _id: row._id,
    correctAnswer: String(row.correctAnswer ?? '').trim(),
    topicId: row.topicId,
  }));

  return { mcqs };
}

/**
 * Internal: full MCQ content for post-submit result review (includes answers).
 * @param {{ mcqObjectIds: import('mongoose').Types.ObjectId[] }} opts
 */
export async function fetchMcqsForResultReview({ mcqObjectIds }) {
  const rows = await MCQ.find({ _id: { $in: mcqObjectIds } })
    .select('_id questionStem options correctAnswer explanation')
    .lean();

  const mcqs = rows.map((row) => ({
    _id: row._id,
    questionStem: String(row.questionStem ?? ''),
    options: Array.isArray(row.options)
      ? row.options.map((o) => ({
          label: String(o?.label ?? '').trim(),
          text: String(o?.text ?? '').trim(),
        }))
      : [],
    correctAnswer: String(row.correctAnswer ?? '').trim(),
    explanation: String(row.explanation ?? ''),
  }));

  return { mcqs };
}

/**
 * PATCH /mcqs/:id — merge patch with existing doc, validate, save. `createdBy` unchanged.
 * When `patch.reviewStatus` becomes `approved` and visibility is still `hidden` (there is no `draft`
 * visibility in this schema; treat prompt “draft” as `hidden`), sets `visibilityStatus` to `public`.
 * @returns {{ code: 'OK', mcq: object } | { code: 'NOT_FOUND' } | { code: 'VALIDATION', message: string }}
 */
export async function updateMcq(id, patch, _actor) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { code: 'NOT_FOUND' };
  }

  const doc = await MCQ.findById(id);
  if (!doc) {
    return { code: 'NOT_FOUND' };
  }

  const base = doc.toObjectWithAnswers();
  const merged = {};
  for (const k of ALLOWED_KEYS) {
    if (patch[k] !== undefined) merged[k] = patch[k];
    else merged[k] = base[k];
  }

  if (
    patch.reviewStatus !== undefined &&
    String(patch.reviewStatus).trim() === 'approved' &&
    merged.visibilityStatus === 'hidden'
  ) {
    merged.visibilityStatus = 'public';
  }

  const fullErr = getCreateMcqPayloadError(merged);
  if (fullErr) {
    return { code: 'VALIDATION', message: fullErr };
  }

  const normalized = normalizeFullMcqForSave(merged);
  for (const key of Object.keys(normalized)) {
    doc.set(key, normalized[key]);
  }

  await doc.save();
  return { code: 'OK', mcq: doc.toObjectWithAnswers() };
}

/**
 * Create MCQ from validated body. `actor` is `req.user` from verifyToken.
 */
export async function createMcq(payload, actor) {
  const createdBy = await resolveCreatedBy(actor);

  const doc = new MCQ({
    questionStem: String(payload.questionStem).trim(),
    options: payload.options.map((o) => ({
      label: String(o.label).trim(),
      text: String(o.text).trim(),
    })),
    correctAnswer: String(payload.correctAnswer).trim(),
    explanation:
      typeof payload.explanation === 'string' ? payload.explanation : '',
    subjectId: String(payload.subjectId).trim(),
    topicId: String(payload.topicId).trim(),
    subtopicId: String(payload.subtopicId).trim(),
    examMappings: Array.isArray(payload.examMappings)
      ? payload.examMappings.map((m) => ({
          examBodyId: String(m.examBodyId).trim(),
          examTypeId: String(m.examTypeId).trim(),
        }))
      : [],
    difficulty: payload.difficulty ?? 'medium',
    source: typeof payload.source === 'string' ? payload.source : '',
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    reviewStatus: payload.reviewStatus ?? 'draft',
    visibilityStatus: payload.visibilityStatus ?? 'hidden',
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
    createdBy,
  });

  await doc.save();
  return doc.toObjectWithAnswers();
}

/**
 * Insert many MCQs; each row validated and saved independently.
 * @returns {{ inserted: number, errors: Array<{ index: number, message: string }> }}
 */
export async function bulkCreateMcqs(items, actor) {
  const errors = [];
  let inserted = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ index: i, message: 'Each MCQ must be a JSON object.' });
      continue;
    }

    const msg = getCreateMcqPayloadError(item);
    if (msg) {
      errors.push({ index: i, message: msg });
      continue;
    }

    try {
      await createMcq(item, actor);
      inserted += 1;
    } catch (e) {
      const message =
        typeof e?.message === 'string' && e.message ? e.message : 'Save failed.';
      errors.push({ index: i, message });
    }
  }

  return { inserted, errors };
}
