import ExamBody from '../models/ExamBody.js';
import ExamType from '../models/ExamType.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createExamBody(payload) {
  const doc = new ExamBody({
    name: payload.name.trim(),
    description: typeof payload.description === 'string' ? payload.description : '',
    country: typeof payload.country === 'string' ? payload.country : '',
    tags: Array.isArray(payload.tags) ? payload.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  });
  await doc.save();
  return doc.toObject();
}

export async function listActiveExamBodies({ search }) {
  const filter = { isActive: true };
  if (typeof search === 'string' && search.trim()) {
    const q = escapeRegex(search.trim());
    const re = new RegExp(q, 'i');
    filter.$or = [
      { name: re },
      { slug: re },
      { description: re },
      { country: re },
      { tags: re },
    ];
  }
  const [examBodies, total] = await Promise.all([
    ExamBody.find(filter).sort({ name: 1 }).lean(),
    ExamBody.countDocuments(filter),
  ]);
  return { examBodies, total };
}

/** Admin / tooling: all bodies matching search, including inactive. */
export async function listAllExamBodies({ search }) {
  const filter = {};
  if (typeof search === 'string' && search.trim()) {
    const q = escapeRegex(search.trim());
    const re = new RegExp(q, 'i');
    filter.$or = [
      { name: re },
      { slug: re },
      { description: re },
      { country: re },
      { tags: re },
    ];
  }
  const [examBodies, total] = await Promise.all([
    ExamBody.find(filter).sort({ name: 1 }).lean(),
    ExamBody.countDocuments(filter),
  ]);
  return { examBodies, total };
}

export async function getExamBodyBySlugWithTypes(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const examBody = await ExamBody.findOne({ slug: s, isActive: true }).lean();
  if (!examBody) return null;
  const examTypes = await ExamType.find({ examBodyId: examBody._id, isActive: true })
    .sort({ name: 1 })
    .lean();
  return { ...examBody, examTypes };
}

export async function updateExamBodyBySlug(slug, patch) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await ExamBody.findOne({ slug: s });
  if (!doc) return null;

  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.tags !== undefined) {
    doc.tags = patch.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;

  await doc.save();
  return doc.toObject();
}

export async function softDeleteExamBodyBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await ExamBody.findOne({ slug: s });
  if (!doc) return null;
  doc.isActive = false;
  await doc.save();
  return doc.toObject();
}
