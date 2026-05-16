import mongoose from 'mongoose';
import Exam from '../models/Exam.js';
import { resolveSubtopicIdsFromTopics } from '../lib/resolveExamSubtopics.js';
import * as taxonomyClient from './taxonomyClient.service.js';
import { fetchUserProfile } from './userClient.service.js';

const RECOMMENDED_EXAM_TYPES = ['mock', 'topic-quiz', 'timed-practice', 'sectional', 'syllabus-weighted'];

function toObjectId(value) {
  if (value === undefined || value === null) return undefined;
  const id = String(value).trim();
  if (id === '') return undefined;
  return new mongoose.Types.ObjectId(id);
}

function toObjectIdArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((id) => new mongoose.Types.ObjectId(String(id).trim()));
}

function resolveCreatedBy(user) {
  const id = user?._id;
  if (id === undefined || id === null) return undefined;
  const s = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return undefined;
  return new mongoose.Types.ObjectId(s);
}

async function resolveSubtopicIdsForPayload(payload) {
  const explicit = toObjectIdArray(payload.subtopicIds);
  if (explicit.length > 0) return explicit;
  const topicIds = toObjectIdArray(payload.topicIds);
  if (topicIds.length === 0) return [];
  const resolved = await resolveSubtopicIdsFromTopics(topicIds.map((id) => String(id)));
  return toObjectIdArray(resolved);
}

export async function createExam(payload, user) {
  const topicIds = toObjectIdArray(payload.topicIds);
  const subtopicIds = await resolveSubtopicIdsForPayload(payload);

  const doc = new Exam({
    title: payload.title.trim(),
    description: typeof payload.description === 'string' ? payload.description : '',
    examType: payload.examType.trim(),
    examBodyId: toObjectId(payload.examBodyId),
    examTypeId: toObjectId(payload.examTypeId),
    subjectIds: toObjectIdArray(payload.subjectIds),
    topicIds,
    subtopicIds,
    difficulty: payload.difficulty ?? 'mixed',
    totalQuestions: payload.totalQuestions,
    durationMinutes: payload.durationMinutes,
    passingScore:
      typeof payload.passingScore === 'number' && !Number.isNaN(payload.passingScore)
        ? payload.passingScore
        : 50,
    visibilityStatus: payload.visibilityStatus ?? 'public',
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    createdBy: resolveCreatedBy(user),
  });

  await doc.save();
  return doc.toObject();
}

/**
 * @param {{ privileged: boolean, filters: object }} opts
 */
export async function listExams({ privileged, filters }) {
  const filter = {};

  if (!privileged) {
    filter.visibilityStatus = 'public';
    filter.isActive = true;
  }

  if (filters.examBodyId) {
    filter.examBodyId = new mongoose.Types.ObjectId(filters.examBodyId);
  }
  if (filters.examTypeId) {
    filter.examTypeId = new mongoose.Types.ObjectId(filters.examTypeId);
  }
  if (filters.examType) {
    filter.examType = filters.examType;
  }
  if (filters.difficulty) {
    filter.difficulty = filters.difficulty;
  }
  if (filters.tags?.length) {
    filter.tags = { $in: filters.tags };
  }

  const skip = (filters.page - 1) * filters.limit;

  const [exams, total] = await Promise.all([
    Exam.find(filter).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
    Exam.countDocuments(filter),
  ]);

  return {
    exams,
    total,
    page: filters.page,
    limit: filters.limit,
  };
}

async function resolveExamBodyIdFromOnboardingTarget(targetExamId) {
  const key = String(targetExamId ?? '').trim().toLowerCase();
  if (!key) return undefined;

  const bodies = await taxonomyClient.listExamBodies();
  for (const body of bodies) {
    const slug = String(body.slug ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim().toLowerCase();
    if (slug === key || slug.includes(key) || name.includes(key.replace(/_/g, ' '))) {
      return String(body._id);
    }
  }
  return undefined;
}

/**
 * Up to `limit` public predefined exams matched to onboarding exam body (fallback: latest).
 */
export async function listRecommendedExams({ authorization, limit = 3 }) {
  const cap = Math.min(Math.max(1, limit), 10);
  const profile = await fetchUserProfile(authorization);
  const targetExamId = profile?.preferences?.onboarding?.targetExamId;

  const baseFilter = {
    visibilityStatus: 'public',
    isActive: true,
    examType: { $in: RECOMMENDED_EXAM_TYPES },
  };

  let filter = { ...baseFilter };
  if (targetExamId) {
    const examBodyId = await resolveExamBodyIdFromOnboardingTarget(targetExamId);
    if (examBodyId && mongoose.Types.ObjectId.isValid(examBodyId)) {
      filter.examBodyId = new mongoose.Types.ObjectId(examBodyId);
    }
  }

  let exams = await Exam.find(filter).sort({ createdAt: -1 }).limit(cap).lean();

  if (exams.length < cap && filter.examBodyId) {
    const fallback = await Exam.find(baseFilter).sort({ createdAt: -1 }).limit(cap).lean();
    const seen = new Set(exams.map((e) => String(e._id)));
    for (const row of fallback) {
      if (exams.length >= cap) break;
      const id = String(row._id);
      if (!seen.has(id)) {
        seen.add(id);
        exams.push(row);
      }
    }
  }

  return {
    exams,
    total: exams.length,
    page: 1,
    limit: cap,
  };
}

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

/**
 * Exam metadata by slug (no MCQ content). Returns null when not found or not visible.
 * Inactive exams always return null (404).
 * @param {{ privileged: boolean }} opts
 */
export async function getExamBySlug(slug, { privileged }) {
  const s = normalizeSlug(slug);
  if (!s) return null;

  const filter = { slug: s, isActive: true };
  if (!privileged) {
    filter.visibilityStatus = 'public';
  }

  const exam = await Exam.findOne(filter).lean();
  return exam ?? null;
}

/**
 * Exam metadata by id. Same visibility rules as getExamBySlug.
 */
export async function getExamById(examId, { privileged }) {
  const id = String(examId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const filter = { _id: new mongoose.Types.ObjectId(id), isActive: true };
  if (!privileged) {
    filter.visibilityStatus = 'public';
  }

  const exam = await Exam.findOne(filter).lean();
  return exam ?? null;
}

function applyExamPatch(doc, patch) {
  if (patch.title !== undefined) doc.title = patch.title.trim();
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.examType !== undefined) doc.examType = patch.examType.trim();
  if (patch.examBodyId !== undefined) {
    doc.examBodyId = patch.examBodyId === null ? undefined : toObjectId(patch.examBodyId);
  }
  if (patch.examTypeId !== undefined) {
    doc.examTypeId = patch.examTypeId === null ? undefined : toObjectId(patch.examTypeId);
  }
  if (patch.subjectIds !== undefined) doc.subjectIds = toObjectIdArray(patch.subjectIds);
  if (patch.topicIds !== undefined) doc.topicIds = toObjectIdArray(patch.topicIds);
  if (patch.subtopicIds !== undefined) doc.subtopicIds = toObjectIdArray(patch.subtopicIds);
  if (patch.difficulty !== undefined) doc.difficulty = patch.difficulty.trim();
  if (patch.totalQuestions !== undefined) doc.totalQuestions = patch.totalQuestions;
  if (patch.durationMinutes !== undefined) doc.durationMinutes = patch.durationMinutes;
  if (patch.passingScore !== undefined) doc.passingScore = patch.passingScore;
  if (patch.visibilityStatus !== undefined) {
    doc.visibilityStatus = patch.visibilityStatus.trim();
  }
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;
  if (patch.tags !== undefined) {
    doc.tags = patch.tags.map((t) => String(t).trim()).filter(Boolean);
  }
}

/**
 * @returns {{ code: 'OK', exam: object } | { code: 'NOT_FOUND' }}
 */
export async function updateExamById(examId, patch) {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return { code: 'NOT_FOUND' };
  }

  const doc = await Exam.findById(examId);
  if (!doc) {
    return { code: 'NOT_FOUND' };
  }

  applyExamPatch(doc, patch);
  if (doc.subtopicIds.length === 0 && doc.topicIds.length > 0) {
    const resolved = await resolveSubtopicIdsFromTopics(doc.topicIds.map((id) => String(id)));
    doc.subtopicIds = toObjectIdArray(resolved);
  }
  await doc.save();
  return { code: 'OK', exam: doc.toObject() };
}

/**
 * @returns {{ code: 'OK' } | { code: 'NOT_FOUND' }}
 */
export async function softDeleteExamById(examId) {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return { code: 'NOT_FOUND' };
  }

  const doc = await Exam.findById(examId);
  if (!doc) {
    return { code: 'NOT_FOUND' };
  }

  doc.isActive = false;
  await doc.save();
  return { code: 'OK' };
}
