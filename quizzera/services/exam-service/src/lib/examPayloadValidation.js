import mongoose from 'mongoose';
import { DIFFICULTIES, EXAM_TYPES, VISIBILITY } from '../models/Exam.js';

export const CREATE_EXAM_ALLOWED_KEYS = new Set([
  'title',
  'description',
  'examType',
  'examBodyId',
  'examTypeId',
  'subjectIds',
  'topicIds',
  'subtopicIds',
  'difficulty',
  'totalQuestions',
  'durationMinutes',
  'passingScore',
  'visibilityStatus',
  'isActive',
  'tags',
]);

function isValidObjectId(value) {
  if (value === undefined || value === null) return false;
  const id = String(value).trim();
  return id !== '' && mongoose.Types.ObjectId.isValid(id);
}

function validateObjectIdArray(field, value) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    return `Field "${field}" must be an array.`;
  }
  for (let i = 0; i < value.length; i += 1) {
    if (!isValidObjectId(value[i])) {
      return `${field}[${i}] must be a valid ObjectId.`;
    }
  }
  return null;
}

function parsePositiveInt(field, raw, { required = false } = {}) {
  if (raw === undefined || raw === null) {
    return required ? `Field "${field}" is required.` : { ok: true, value: undefined };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, message: `Field "${field}" must be a positive integer.` };
  }
  return { ok: true, value: n };
}

/** @returns {string|null} error message */
export function getCreateExamPayloadError(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const unknown = Object.keys(body).filter((k) => !CREATE_EXAM_ALLOWED_KEYS.has(k));
  if (unknown.length > 0) {
    return `Unsupported field(s): ${unknown.join(', ')}.`;
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return 'Field "title" is required.';
  }

  const examType = typeof body.examType === 'string' ? body.examType.trim() : '';
  if (!examType) {
    return 'Field "examType" is required.';
  }
  if (!EXAM_TYPES.includes(examType)) {
    return `Field "examType" must be one of: ${EXAM_TYPES.join(', ')}.`;
  }

  const totalQ = parsePositiveInt('totalQuestions', body.totalQuestions, { required: true });
  if (typeof totalQ === 'string') return totalQ;
  if (!totalQ.ok) return totalQ.message;

  const duration = parsePositiveInt('durationMinutes', body.durationMinutes, { required: true });
  if (typeof duration === 'string') return duration;
  if (!duration.ok) return duration.message;

  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'Field "description" must be a string.';
  }

  for (const field of ['examBodyId', 'examTypeId']) {
    if (body[field] === undefined || body[field] === null) continue;
    if (!isValidObjectId(body[field])) {
      return `Field "${field}" must be a valid ObjectId.`;
    }
  }

  for (const field of ['subjectIds', 'topicIds', 'subtopicIds']) {
    const err = validateObjectIdArray(field, body[field]);
    if (err) return err;
  }

  if (body.difficulty !== undefined) {
    const d = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
    if (!DIFFICULTIES.includes(d)) {
      return `Field "difficulty" must be one of: ${DIFFICULTIES.join(', ')}.`;
    }
  }

  if (body.passingScore !== undefined) {
    const ps = Number(body.passingScore);
    if (Number.isNaN(ps) || ps < 0 || ps > 100) {
      return 'Field "passingScore" must be a number between 0 and 100.';
    }
  }

  if (body.visibilityStatus !== undefined) {
    const v = typeof body.visibilityStatus === 'string' ? body.visibilityStatus.trim() : '';
    if (!VISIBILITY.includes(v)) {
      return `Field "visibilityStatus" must be one of: ${VISIBILITY.join(', ')}.`;
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return 'Field "isActive" must be a boolean.';
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return 'Field "tags" must be an array of strings.';
    }
    if (!body.tags.every((t) => typeof t === 'string')) {
      return 'Each tag must be a string.';
    }
  }

  return null;
}

/** @returns {string|null} error message */
export function getUpdateExamPatchError(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return 'Request body must include at least one field to update.';
  }

  const unknown = keys.filter((k) => !CREATE_EXAM_ALLOWED_KEYS.has(k));
  if (unknown.length > 0) {
    return `Unsupported field(s): ${unknown.join(', ')}.`;
  }

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return 'Field "title" cannot be empty.';
    }
  }

  if (body.examType !== undefined) {
    const examType = typeof body.examType === 'string' ? body.examType.trim() : '';
    if (!examType) {
      return 'Field "examType" cannot be empty.';
    }
    if (!EXAM_TYPES.includes(examType)) {
      return `Field "examType" must be one of: ${EXAM_TYPES.join(', ')}.`;
    }
  }

  if (body.totalQuestions !== undefined) {
    const totalQ = parsePositiveInt('totalQuestions', body.totalQuestions);
    if (typeof totalQ === 'string') return totalQ;
    if (!totalQ.ok) return totalQ.message;
  }

  if (body.durationMinutes !== undefined) {
    const duration = parsePositiveInt('durationMinutes', body.durationMinutes);
    if (typeof duration === 'string') return duration;
    if (!duration.ok) return duration.message;
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'Field "description" must be a string.';
  }

  for (const field of ['examBodyId', 'examTypeId']) {
    if (body[field] === undefined || body[field] === null) continue;
    if (!isValidObjectId(body[field])) {
      return `Field "${field}" must be a valid ObjectId.`;
    }
  }

  for (const field of ['subjectIds', 'topicIds', 'subtopicIds']) {
    if (body[field] === undefined) continue;
    const err = validateObjectIdArray(field, body[field]);
    if (err) return err;
  }

  if (body.difficulty !== undefined) {
    const d = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
    if (!DIFFICULTIES.includes(d)) {
      return `Field "difficulty" must be one of: ${DIFFICULTIES.join(', ')}.`;
    }
  }

  if (body.passingScore !== undefined) {
    const ps = Number(body.passingScore);
    if (Number.isNaN(ps) || ps < 0 || ps > 100) {
      return 'Field "passingScore" must be a number between 0 and 100.';
    }
  }

  if (body.visibilityStatus !== undefined) {
    const v = typeof body.visibilityStatus === 'string' ? body.visibilityStatus.trim() : '';
    if (!VISIBILITY.includes(v)) {
      return `Field "visibilityStatus" must be one of: ${VISIBILITY.join(', ')}.`;
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return 'Field "isActive" must be a boolean.';
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return 'Field "tags" must be an array of strings.';
    }
    if (!body.tags.every((t) => typeof t === 'string')) {
      return 'Each tag must be a string.';
    }
  }

  return null;
}
