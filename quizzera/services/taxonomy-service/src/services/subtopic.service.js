import mongoose from 'mongoose';
import Topic from '../models/Topic.js';
import Subtopic from '../models/Subtopic.js';

function normalizeSlug(slug) {
  return String(slug ?? '').trim().toLowerCase();
}

async function assertTopicExists(topicId) {
  const t = await Topic.findById(topicId).lean();
  if (!t) {
    const err = new Error('Topic not found.');
    err.statusCode = 404;
    throw err;
  }
}

/**
 * @param {{ topicId: string, includeInactive?: boolean }} opts
 */
export async function listSubtopics({ topicId, includeInactive = false }) {
  if (topicId === undefined || topicId === null || String(topicId).trim() === '') {
    const err = new Error('Query "topicId" is required.');
    err.statusCode = 400;
    throw err;
  }

  const id = String(topicId).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid topicId query parameter.');
    err.statusCode = 400;
    throw err;
  }

  await assertTopicExists(id);

  const filter = { topicId: id };
  if (!includeInactive) {
    filter.isActive = true;
  }

  const [subtopics, total] = await Promise.all([
    Subtopic.find(filter).sort({ name: 1 }).lean(),
    Subtopic.countDocuments(filter),
  ]);
  return { subtopics, total };
}

export async function createSubtopic(payload) {
  const topicId = String(payload.topicId).trim();
  await assertTopicExists(topicId);

  const doc = new Subtopic({
    name: payload.name.trim(),
    topicId,
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

export async function getSubtopicBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subtopic.findOne({ slug: s }).populate('topicId').lean();
  return doc ?? null;
}

export async function updateSubtopicBySlug(slug, patch) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subtopic.findOne({ slug: s });
  if (!doc) return null;

  if (patch.topicId !== undefined) {
    const tid = String(patch.topicId).trim();
    await assertTopicExists(tid);
    doc.topicId = tid;
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

export async function softDeleteSubtopicBySlug(slug) {
  const s = normalizeSlug(slug);
  if (!s) return null;
  const doc = await Subtopic.findOne({ slug: s });
  if (!doc) return null;
  doc.isActive = false;
  await doc.save();
  return doc.toObject();
}
