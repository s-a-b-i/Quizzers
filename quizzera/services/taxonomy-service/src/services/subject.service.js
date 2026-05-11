import mongoose from 'mongoose';
import ExamBody from '../models/ExamBody.js';
import ExamType from '../models/ExamType.js';
import Subject from '../models/Subject.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

function toOptionalObjectId(value) {
  if (value === undefined || value === null) return null;
  const id = String(value).trim();
  if (id === '') return null;
  return id;
}

async function assertExamTypeMatchesBody(examBodyId, examTypeId) {
  if (!examTypeId) return;
  const t = await ExamType.findById(examTypeId).lean();
  if (!t) {
    const err = new Error('Exam type not found.');
    err.statusCode = 404;
    throw err;
  }
  if (examBodyId && String(t.examBodyId) !== String(examBodyId)) {
    const err = new Error('Exam type does not belong to the given exam body.');
    err.statusCode = 400;
    throw err;
  }
}

async function assertRefsExist({ examBodyId, examTypeId }) {
  if (examBodyId) {
    const b = await ExamBody.findById(examBodyId).lean();
    if (!b) {
      const err = new Error('Exam body not found.');
      err.statusCode = 404;
      throw err;
    }
  }
  if (examTypeId) {
    const t = await ExamType.findById(examTypeId).lean();
    if (!t) {
      const err = new Error('Exam type not found.');
      err.statusCode = 404;
      throw err;
    }
  }
  await assertExamTypeMatchesBody(examBodyId, examTypeId);
}

export async function createSubject(payload) {
  const examBodyId = toOptionalObjectId(payload.examBodyId);
  const examTypeId = toOptionalObjectId(payload.examTypeId);

  await assertRefsExist({ examBodyId, examTypeId });
  await assertExamTypeMatchesBody(examBodyId, examTypeId);

  const weightage =
    typeof payload.weightage === 'number' && !Number.isNaN(payload.weightage)
      ? payload.weightage
      : 0;

  const doc = new Subject({
    name: payload.name.trim(),
    examBodyId,
    examTypeId,
    description: typeof payload.description === 'string' ? payload.description : '',
    weightage,
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  });
  await doc.save();
  return doc.toObject();
}

export async function listActiveSubjects({ examBodyId, examTypeId }) {
  const filter = { isActive: true };

  if (examBodyId !== undefined && examBodyId !== null && String(examBodyId).trim() !== '') {
    const id = String(examBodyId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid examBodyId query parameter.');
      err.statusCode = 400;
      throw err;
    }
    filter.examBodyId = id;
  }

  if (examTypeId !== undefined && examTypeId !== null && String(examTypeId).trim() !== '') {
    const id = String(examTypeId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid examTypeId query parameter.');
      err.statusCode = 400;
      throw err;
    }
    filter.examTypeId = id;
  }

  const [subjects, total] = await Promise.all([
    Subject.find(filter).sort({ name: 1 }).lean(),
    Subject.countDocuments(filter),
  ]);
  return { subjects, total };
}

export async function listAllSubjects({ examBodyId, examTypeId }) {
  const filter = {};

  if (examBodyId !== undefined && examBodyId !== null && String(examBodyId).trim() !== '') {
    const id = String(examBodyId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid examBodyId query parameter.');
      err.statusCode = 400;
      throw err;
    }
    filter.examBodyId = id;
  }

  if (examTypeId !== undefined && examTypeId !== null && String(examTypeId).trim() !== '') {
    const id = String(examTypeId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid examTypeId query parameter.');
      err.statusCode = 400;
      throw err;
    }
    filter.examTypeId = id;
  }

  const [subjects, total] = await Promise.all([
    Subject.find(filter).sort({ name: 1 }).lean(),
    Subject.countDocuments(filter),
  ]);
  return { subjects, total };
}

export async function getSubjectBySlugWithRefs(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subject.findOne({ slug: s, isActive: true })
    .populate('examBodyId')
    .populate('examTypeId')
    .lean();
  return doc ?? null;
}

export async function updateSubjectBySlug(slug, patch) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subject.findOne({ slug: s });
  if (!doc) return null;

  let nextBodyId = doc.examBodyId ? String(doc.examBodyId) : null;
  let nextTypeId = doc.examTypeId ? String(doc.examTypeId) : null;

  if (patch.examBodyId !== undefined) {
    nextBodyId = patch.examBodyId === null ? null : toOptionalObjectId(patch.examBodyId);
  }
  if (patch.examTypeId !== undefined) {
    nextTypeId = patch.examTypeId === null ? null : toOptionalObjectId(patch.examTypeId);
  }

  await assertRefsExist({ examBodyId: nextBodyId, examTypeId: nextTypeId });
  await assertExamTypeMatchesBody(nextBodyId, nextTypeId);

  if (patch.examBodyId !== undefined) doc.examBodyId = nextBodyId;
  if (patch.examTypeId !== undefined) doc.examTypeId = nextTypeId;
  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.tags !== undefined) {
    doc.tags = patch.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;
  if (patch.weightage !== undefined) doc.weightage = patch.weightage;

  await doc.save();
  return doc.toObject();
}

export async function softDeleteSubjectBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subject.findOne({ slug: s });
  if (!doc) return null;
  doc.isActive = false;
  await doc.save();
  return doc.toObject();
}
