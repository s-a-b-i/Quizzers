import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import ExamSession, { SESSION_STATUSES } from '../models/ExamSession.js';
import { toPracticeMcqList } from '../lib/mcqPracticeShape.js';
import { resolveSubtopicIdsFromTopics } from '../lib/resolveExamSubtopics.js';
import * as mcqClient from './mcqClient.service.js';

const IN_PROGRESS_STATUSES = ['started', 'in-progress'];
const TERMINAL_SESSION_STATUSES = new Set(['submitted', 'evaluated']);
const RESULT_AVAILABLE_STATUSES = new Set(['submitted', 'evaluated']);
const MCQ_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function resolveUserObjectId(user) {
  const id = user?._id;
  if (id === undefined || id === null) return null;
  const s = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function mcqDifficultyForExam(examDifficulty) {
  const d = typeof examDifficulty === 'string' ? examDifficulty.trim() : '';
  if (MCQ_DIFFICULTIES.has(d)) return d;
  return undefined;
}

function sessionPayload(session, mcqs) {
  return {
    sessionId: String(session._id),
    expiresAt: session.expiresAt,
    mcqs,
  };
}

async function findReusableSession(examId, userId) {
  const now = new Date();
  return ExamSession.findOne({
    examId,
    userId,
    status: { $in: IN_PROGRESS_STATUSES },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .exec();
}

/**
 * Start or resume an exam session for the authenticated user.
 * @param {{ examId: string, user: object, authorization?: string }} opts
 */
export async function startExamSession({ examId, user, authorization }) {
  const examOid = String(examId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(examOid)) {
    const err = new Error('Invalid examId.');
    err.statusCode = 400;
    throw err;
  }

  const userId = resolveUserObjectId(user);
  if (!userId) {
    const err = new Error('User identity required.');
    err.statusCode = 401;
    throw err;
  }

  const examObjectId = new mongoose.Types.ObjectId(examOid);

  const existing = await findReusableSession(examObjectId, userId);
  if (existing) {
    const mcqs = await mcqClient.fetchMcqsByIdsForPractice(existing.mcqIds, authorization);
    return { created: false, ...sessionPayload(existing, mcqs) };
  }

  const exam = await Exam.findOne({
    _id: examObjectId,
    isActive: true,
    visibilityStatus: 'public',
  }).lean();

  if (!exam) {
    const err = new Error('Exam not found.');
    err.statusCode = 404;
    throw err;
  }

  return beginSessionForExam(exam, user, authorization);
}

/**
 * Draw MCQs and create a new session for an exam document (no resume lookup).
 * @param {object} exam — Exam document or lean object
 */
export async function beginSessionForExam(exam, user, authorization) {
  const userId = resolveUserObjectId(user);
  if (!userId) {
    const err = new Error('User identity required.');
    err.statusCode = 401;
    throw err;
  }

  const examId = exam._id ?? exam.id;
  const examObjectId =
    examId instanceof mongoose.Types.ObjectId
      ? examId
      : new mongoose.Types.ObjectId(String(examId));

  let subtopicIds = Array.isArray(exam.subtopicIds)
    ? exam.subtopicIds.map((id) => String(id)).filter(Boolean)
    : [];

  if (subtopicIds.length === 0) {
    const topicIds = Array.isArray(exam.topicIds)
      ? exam.topicIds.map((id) => String(id)).filter(Boolean)
      : [];
    if (topicIds.length > 0) {
      subtopicIds = await resolveSubtopicIdsFromTopics(topicIds);
    }
  }

  if (subtopicIds.length === 0) {
    const err = new Error(
      'Exam has no subtopics configured for question generation. Edit the exam in Admin → Exams and select at least one topic or subtopic.'
    );
    err.statusCode = 400;
    throw err;
  }

  const mcqs = await mcqClient.fetchMcqsForExam({
    subtopicIds,
    difficulty: mcqDifficultyForExam(exam.difficulty),
    count: exam.totalQuestions,
  });

  return beginSessionWithMcqs(exam, userId, mcqs);
}

/**
 * Create a session when MCQs are already drawn (e.g. weak-area flow).
 * @param {object} exam
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {Array<object>} mcqs — practice-safe MCQ shapes
 */
export async function beginSessionWithMcqs(exam, userId, mcqs) {
  const examId = exam._id ?? exam.id;
  const examObjectId =
    examId instanceof mongoose.Types.ObjectId
      ? examId
      : new mongoose.Types.ObjectId(String(examId));

  if (mcqs.length === 0) {
    const err = new Error('Could not draw any questions for this exam. Try again later.');
    err.statusCode = 503;
    throw err;
  }

  const now = new Date();
  const durationMs = Number(exam.durationMinutes) * 60 * 1000;
  const expiresAt = new Date(now.getTime() + durationMs);

  const mcqObjectIds = mcqs.map((m) => new mongoose.Types.ObjectId(String(m._id)));

  const session = await ExamSession.create({
    examId: examObjectId,
    userId,
    status: 'started',
    startedAt: now,
    expiresAt,
    mcqIds: mcqObjectIds,
    answers: [],
  });

  return { created: true, ...sessionPayload(session, mcqs) };
}

/**
 * Merge answer selections into the session without scoring.
 * @param {import('mongoose').Document} session — from checkSessionOwner
 * @param {{ answers: Array<{ mcqId: string, selectedLabel: string }> }} payload
 */
export async function saveSessionProgress(session, payload) {
  if (TERMINAL_SESSION_STATUSES.has(session.status)) {
    const err = new Error('Session has already been submitted.');
    err.statusCode = 409;
    throw err;
  }

  if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
    const err = new Error('Session has expired.');
    err.statusCode = 403;
    throw err;
  }

  const allowedMcqIds = new Set(session.mcqIds.map((id) => String(id)));

  for (let i = 0; i < payload.answers.length; i += 1) {
    const { mcqId } = payload.answers[i];
    if (!allowedMcqIds.has(mcqId)) {
      const err = new Error(`answers[${i}].mcqId is not part of this exam session.`);
      err.statusCode = 400;
      throw err;
    }
  }

  const byMcqId = new Map();
  for (const existing of session.answers ?? []) {
    const key = String(existing.mcqId);
    const entry = {
      mcqId: existing.mcqId,
      selectedLabel: String(existing.selectedLabel ?? ''),
    };
    if (existing.isCorrect !== undefined) entry.isCorrect = existing.isCorrect;
    if (existing.timeTakenSeconds !== undefined) {
      entry.timeTakenSeconds = existing.timeTakenSeconds;
    }
    byMcqId.set(key, entry);
  }

  for (const item of payload.answers) {
    byMcqId.set(item.mcqId, {
      mcqId: new mongoose.Types.ObjectId(item.mcqId),
      selectedLabel: item.selectedLabel,
    });
  }

  session.answers = Array.from(byMcqId.values());
  session.status = 'in-progress';
  session.markModified('answers');
  await session.save();
}

function toTopicPerformanceDto(rows) {
  return rows.map((t) => ({
    topicId: String(t.topicId),
    correct: t.correct,
    total: t.total,
  }));
}

/**
 * Score and finalize an exam session (manual submit or auto-submit after expiry).
 * @param {import('mongoose').Document} session — from checkSessionOwner
 */
export async function submitExamSession(session) {
  if (TERMINAL_SESSION_STATUSES.has(session.status)) {
    const err = new Error('Session has already been submitted.');
    err.statusCode = 409;
    throw err;
  }

  const exam = await Exam.findById(session.examId).lean();
  if (!exam) {
    const err = new Error('Exam not found.');
    err.statusCode = 404;
    throw err;
  }

  const mcqIdStrings = session.mcqIds.map((id) => String(id));
  const mcqRows = await mcqClient.fetchMcqAnswersForScoring(mcqIdStrings);

  const mcqMetaById = new Map();
  for (const row of mcqRows) {
    mcqMetaById.set(String(row._id), row);
  }

  if (mcqMetaById.size !== mcqIdStrings.length) {
    const err = new Error('Could not load scoring data for all questions.');
    err.statusCode = 503;
    throw err;
  }

  const existingByMcq = new Map();
  for (const answer of session.answers ?? []) {
    existingByMcq.set(String(answer.mcqId), answer);
  }

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;
  const topicStats = new Map();
  const scoredAnswers = [];

  for (const mcqOid of session.mcqIds) {
    const id = String(mcqOid);
    const meta = mcqMetaById.get(id);
    const existing = existingByMcq.get(id);
    const selectedLabel =
      existing && typeof existing.selectedLabel === 'string'
        ? existing.selectedLabel.trim()
        : '';
    const correctAnswer = String(meta.correctAnswer).trim();

    let isCorrect = false;
    if (selectedLabel === '') {
      totalUnattempted += 1;
    } else if (selectedLabel === correctAnswer) {
      totalCorrect += 1;
      isCorrect = true;
    } else {
      totalWrong += 1;
    }

    const entry = {
      mcqId: new mongoose.Types.ObjectId(id),
      selectedLabel,
      isCorrect,
    };
    if (existing?.timeTakenSeconds !== undefined) {
      entry.timeTakenSeconds = existing.timeTakenSeconds;
    }
    scoredAnswers.push(entry);

    const topicKey = String(meta.topicId);
    const topicOid = mongoose.Types.ObjectId.isValid(topicKey)
      ? new mongoose.Types.ObjectId(topicKey)
      : meta.topicId;
    const stat = topicStats.get(topicKey) ?? {
      topicId: topicOid,
      correct: 0,
      total: 0,
    };
    stat.total += 1;
    if (isCorrect) stat.correct += 1;
    topicStats.set(topicKey, stat);
  }

  const totalQuestions = session.mcqIds.length;
  const score =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const passingScore =
    typeof exam.passingScore === 'number' && !Number.isNaN(exam.passingScore)
      ? exam.passingScore
      : 50;
  const passed = score >= passingScore;

  const topicWisePerformance = Array.from(topicStats.values());
  const weakAreas = topicWisePerformance
    .filter((row) => row.total > 0 && row.correct / row.total < 0.5)
    .map((row) => row.topicId);

  const submittedAt = new Date();
  let timeTakenMinutes;
  if (session.startedAt) {
    const elapsedMs = submittedAt.getTime() - new Date(session.startedAt).getTime();
    timeTakenMinutes = Math.max(0, Math.round(elapsedMs / 60000));
  }

  session.answers = scoredAnswers;
  session.status = 'submitted';
  session.submittedAt = submittedAt;
  session.score = score;
  session.totalCorrect = totalCorrect;
  session.totalWrong = totalWrong;
  session.totalUnattempted = totalUnattempted;
  session.topicWisePerformance = topicWisePerformance;
  session.weakAreas = weakAreas;
  session.markModified('answers');
  session.markModified('topicWisePerformance');
  await session.save();

  await ExamResult.create({
    sessionId: session._id,
    userId: session.userId,
    examId: session.examId,
    score,
    passed,
    totalCorrect,
    totalWrong,
    totalUnattempted,
    timeTakenMinutes,
    topicWisePerformance,
    weakAreas,
  });

  return {
    score,
    passed,
    totalCorrect,
    totalWrong,
    totalUnattempted,
    topicWisePerformance: toTopicPerformanceDto(topicWisePerformance),
    weakAreas: weakAreas.map((topicId) => String(topicId)),
  };
}

function countStatsFromReview(review) {
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnattempted = 0;
  for (const item of review) {
    const selected = typeof item.selectedLabel === 'string' ? item.selectedLabel.trim() : '';
    if (!selected) {
      totalUnattempted += 1;
    } else if (item.isCorrect) {
      totalCorrect += 1;
    } else {
      totalWrong += 1;
    }
  }
  return { totalCorrect, totalWrong, totalUnattempted };
}

function resolveResultStats(session, resultRow, review) {
  const fromResult = {
    totalCorrect: resultRow?.totalCorrect,
    totalWrong: resultRow?.totalWrong,
    totalUnattempted: resultRow?.totalUnattempted,
  };
  const resultSum =
    Number(fromResult.totalCorrect ?? 0) +
    Number(fromResult.totalWrong ?? 0) +
    Number(fromResult.totalUnattempted ?? 0);
  if (resultSum > 0) {
    return {
      totalCorrect: fromResult.totalCorrect,
      totalWrong: fromResult.totalWrong,
      totalUnattempted: fromResult.totalUnattempted,
    };
  }

  const fromSession = {
    totalCorrect: session.totalCorrect,
    totalWrong: session.totalWrong,
    totalUnattempted: session.totalUnattempted,
  };
  const sessionSum =
    Number(fromSession.totalCorrect ?? 0) +
    Number(fromSession.totalWrong ?? 0) +
    Number(fromSession.totalUnattempted ?? 0);
  if (sessionSum > 0) {
    return fromSession;
  }

  return countStatsFromReview(review);
}

function formatExamResultDto(row, stats = {}) {
  return {
    sessionId: String(row.sessionId),
    userId: String(row.userId),
    examId: String(row.examId),
    score: row.score,
    passed: Boolean(row.passed),
    totalCorrect: stats.totalCorrect ?? row.totalCorrect ?? 0,
    totalWrong: stats.totalWrong ?? row.totalWrong ?? 0,
    totalUnattempted: stats.totalUnattempted ?? row.totalUnattempted ?? 0,
    timeTakenMinutes: row.timeTakenMinutes,
    topicWisePerformance: toTopicPerformanceDto(row.topicWisePerformance ?? []),
    weakAreas: (row.weakAreas ?? []).map((id) => String(id)),
    recommendations: row.recommendations ?? [],
    createdAt: row.createdAt,
  };
}

/**
 * ExamResult plus per-question review (answers revealed only after submit).
 * @param {import('mongoose').Document} session — from checkSessionOwner
 */
function toHistorySessionDto(doc) {
  const exam = doc.examId;
  const examId =
    exam && typeof exam === 'object' && exam._id != null
      ? String(exam._id)
      : String(doc.examId);
  const examTitle =
    exam && typeof exam === 'object' && typeof exam.title === 'string' ? exam.title : '';

  return {
    sessionId: String(doc._id),
    examId,
    examTitle,
    userId: String(doc.userId),
    status: doc.status,
    startedAt: doc.startedAt ?? null,
    submittedAt: doc.submittedAt ?? null,
    expiresAt: doc.expiresAt ?? null,
    mcqIds: (doc.mcqIds ?? []).map((id) => String(id)),
    score: doc.score,
    totalCorrect: doc.totalCorrect,
    totalWrong: doc.totalWrong,
    totalUnattempted: doc.totalUnattempted,
    weakAreas: (doc.weakAreas ?? []).map((id) => String(id)),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Paginated exam sessions for the authenticated user.
 * @param {{ user: object, page: number, limit: number }} opts
 */
function toAdminSessionDto(doc) {
  const exam = doc.examId;
  const userRef = doc.userId;
  const examId =
    exam && typeof exam === 'object' && exam._id != null
      ? String(exam._id)
      : String(doc.examId);
  const examTitle =
    exam && typeof exam === 'object' && typeof exam.title === 'string' ? exam.title : '';
  const userEmail =
    userRef && typeof userRef === 'object' && typeof userRef.email === 'string'
      ? userRef.email
      : undefined;

  return {
    sessionId: String(doc._id),
    examId,
    examTitle,
    userId: String(doc.userId?._id ?? doc.userId),
    userEmail,
    status: doc.status,
    startedAt: doc.startedAt ?? null,
    submittedAt: doc.submittedAt ?? null,
    expiresAt: doc.expiresAt ?? null,
    score: doc.score,
    totalCorrect: doc.totalCorrect,
    totalWrong: doc.totalWrong,
    totalUnattempted: doc.totalUnattempted,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Admin: paginated exam sessions across all users.
 */
export async function listAdminExamSessions({ userId, examId, status, page, limit }) {
  const filter = {};
  if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
  if (examId) filter.examId = new mongoose.Types.ObjectId(examId);
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    ExamSession.find(filter)
      .sort({ startedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('examId', 'title')
      .populate('userId', 'email')
      .lean(),
    ExamSession.countDocuments(filter),
  ]);

  return {
    sessions: rows.map(toAdminSessionDto),
    total,
    page,
    limit,
  };
}

export async function listMyExamHistory({ user, page, limit }) {
  const userId = resolveUserObjectId(user);
  if (!userId) {
    const err = new Error('User identity required.');
    err.statusCode = 401;
    throw err;
  }

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    ExamSession.find({ userId })
      .sort({ startedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('examId', 'title')
      .lean(),
    ExamSession.countDocuments({ userId }),
  ]);

  return {
    sessions: rows.map(toHistorySessionDto),
    total,
    page,
    limit,
  };
}

/**
 * Active session payload for the exam-taking UI.
 * @param {import('mongoose').Document} session
 */
export async function getSessionState(session, authorization) {
  if (TERMINAL_SESSION_STATUSES.has(session.status)) {
    const err = new Error('Session has already been submitted.');
    err.statusCode = 400;
    throw err;
  }

  const exam = await Exam.findById(session.examId).select('title durationMinutes').lean();
  if (!exam) {
    const err = new Error('Exam not found.');
    err.statusCode = 404;
    throw err;
  }

  const mcqs = await mcqClient.fetchMcqsByIdsForPractice(session.mcqIds, authorization);
  if (mcqs.length === 0) {
    const err = new Error('Could not load exam questions.');
    err.statusCode = 503;
    throw err;
  }

  const answers = (session.answers ?? []).map((a) => ({
    mcqId: String(a.mcqId),
    selectedLabel: typeof a.selectedLabel === 'string' ? a.selectedLabel.trim() : '',
  }));

  return {
    sessionId: String(session._id),
    examId: String(session.examId),
    examTitle: exam.title,
    durationMinutes: exam.durationMinutes,
    expiresAt: session.expiresAt,
    status: session.status,
    mcqs,
    answers,
  };
}

export async function getSessionResult(session) {
  if (!RESULT_AVAILABLE_STATUSES.has(session.status)) {
    const err = new Error('Exam not submitted yet.');
    err.statusCode = 400;
    throw err;
  }

  const result = await ExamResult.findOne({ sessionId: session._id }).lean();
  if (!result) {
    const err = new Error('Result not found.');
    err.statusCode = 404;
    throw err;
  }

  const mcqIdStrings = session.mcqIds.map((id) => String(id));
  const mcqRows = await mcqClient.fetchMcqsForResultReview(mcqIdStrings);

  const mcqById = new Map();
  for (const row of mcqRows) {
    mcqById.set(String(row._id), row);
  }

  if (mcqById.size !== mcqIdStrings.length) {
    const err = new Error('Could not load review data for all questions.');
    err.statusCode = 503;
    throw err;
  }

  const answerByMcq = new Map();
  for (const answer of session.answers ?? []) {
    answerByMcq.set(String(answer.mcqId), answer);
  }

  const review = session.mcqIds.map((mcqOid) => {
    const mcqId = String(mcqOid);
    const mcq = mcqById.get(mcqId);
    const answer = answerByMcq.get(mcqId);
    return {
      mcqId,
      questionStem: mcq.questionStem,
      options: mcq.options,
      selectedLabel:
        answer && typeof answer.selectedLabel === 'string'
          ? answer.selectedLabel.trim()
          : '',
      correctAnswer: mcq.correctAnswer,
      explanation: mcq.explanation,
      isCorrect: Boolean(answer?.isCorrect),
    };
  });

  const stats = resolveResultStats(session, result, review);

  return {
    ...formatExamResultDto(result, stats),
    review,
  };
}

export { IN_PROGRESS_STATUSES, SESSION_STATUSES };
