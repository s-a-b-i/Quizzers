import mongoose from 'mongoose';
import ExamBody from '../models/ExamBody.js';
import ExamType from '../models/ExamType.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

export async function createExamType(payload) {
  const examBodyId = String(payload.examBodyId).trim();
  const body = await ExamBody.findById(examBodyId).lean();
  if (!body) {
    const err = new Error('Exam body not found.');
    err.statusCode = 404;
    throw err;
  }

  const doc = new ExamType({
    name: payload.name.trim(),
    examBodyId,
    description: typeof payload.description === 'string' ? payload.description : '',
  });
  await doc.save();
  return doc.toObject();
}

export async function listActiveExamTypes({ examBodyId }) {
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

  const [examTypes, total] = await Promise.all([
    ExamType.find(filter).sort({ name: 1 }).lean(),
    ExamType.countDocuments(filter),
  ]);
  return { examTypes, total };
}

export async function listAllExamTypes({ examBodyId }) {
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

  const [examTypes, total] = await Promise.all([
    ExamType.find(filter).sort({ name: 1 }).lean(),
    ExamType.countDocuments(filter),
  ]);
  return { examTypes, total };
}

export async function getExamTypeBySlugWithBody(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await ExamType.findOne({ slug: s, isActive: true })
    .populate('examBodyId')
    .lean();
  return doc ?? null;
}

export async function updateExamTypeBySlug(slug, patch) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await ExamType.findOne({ slug: s });
  if (!doc) return null;

  if (patch.examBodyId !== undefined) {
    const id = String(patch.examBodyId).trim();
    const body = await ExamBody.findById(id).lean();
    if (!body) {
      const err = new Error('Exam body not found.');
      err.statusCode = 404;
      throw err;
    }
    doc.examBodyId = id;
  }

  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;

  await doc.save();
  return doc.toObject();
}

export async function softDeleteExamTypeBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await ExamType.findOne({ slug: s });
  if (!doc) return null;
  doc.isActive = false;
  await doc.save();
  return doc.toObject();
}
