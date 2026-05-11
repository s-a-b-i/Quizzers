import mongoose from 'mongoose';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

async function assertSubjectExists(subjectId) {
  const s = await Subject.findById(subjectId).lean();
  if (!s) {
    const err = new Error('Subject not found.');
    err.statusCode = 404;
    throw err;
  }
}

export async function createTopic(payload) {
  const subjectId = String(payload.subjectId).trim();
  await assertSubjectExists(subjectId);

  const doc = new Topic({
    name: payload.name.trim(),
    subjectId,
    description: typeof payload.description === 'string' ? payload.description : '',
    weightage:
      typeof payload.weightage === 'number' && !Number.isNaN(payload.weightage)
        ? payload.weightage
        : undefined,
    syllabusItem: typeof payload.syllabusItem === 'string' ? payload.syllabusItem : '',
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  });
  await doc.save();
  return doc.toObject();
}

export async function listActiveTopics({ subjectId }) {
  const filter = { isActive: true };

  if (subjectId !== undefined && subjectId !== null && String(subjectId).trim() !== '') {
    const id = String(subjectId).trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid subjectId query parameter.');
      err.statusCode = 400;
      throw err;
    }
    filter.subjectId = id;
  }

  const [topics, total] = await Promise.all([
    Topic.find(filter).sort({ name: 1 }).lean(),
    Topic.countDocuments(filter),
  ]);
  return { topics, total };
}

export async function getTopicBySlugWithSubject(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Topic.findOne({ slug: s, isActive: true })
    .populate('subjectId')
    .lean();
  return doc ?? null;
}

export async function updateTopicBySlug(slug, patch) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Topic.findOne({ slug: s });
  if (!doc) return null;

  if (patch.subjectId !== undefined) {
    const sid = String(patch.subjectId).trim();
    await assertSubjectExists(sid);
    doc.subjectId = sid;
  }

  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.tags !== undefined) {
    doc.tags = patch.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;
  if (patch.weightage !== undefined) doc.weightage = patch.weightage;
  if (patch.syllabusItem !== undefined) doc.syllabusItem = patch.syllabusItem;

  await doc.save();
  return doc.toObject();
}

export async function softDeleteTopicBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Topic.findOne({ slug: s });
  if (!doc) return null;
  doc.isActive = false;
  await doc.save();
  return doc.toObject();
}
