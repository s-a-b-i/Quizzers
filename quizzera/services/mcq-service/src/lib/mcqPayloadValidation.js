import mongoose from 'mongoose';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const REVIEW = new Set(['draft', 'reviewed', 'approved']);
const VISIBILITY = new Set(['public', 'premium', 'hidden']);

/** Updatable MCQ fields (excludes `createdBy`). */
export const ALLOWED_KEYS = new Set([
  'questionStem',
  'options',
  'correctAnswer',
  'explanation',
  'subjectId',
  'topicId',
  'subtopicId',
  'examMappings',
  'difficulty',
  'source',
  'tags',
  'reviewStatus',
  'visibilityStatus',
  'isActive',
]);

function objectIdFieldMessage(body, field) {
  const raw = body[field];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return `Field "${field}" is required.`;
  }
  const id = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return `Field "${field}" must be a valid ObjectId.`;
  }
  return null;
}

/**
 * @param {unknown} body - single MCQ payload object
 * @returns {string | null} error message or null if valid
 */
export function getCreateMcqPayloadError(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Each MCQ must be a JSON object.';
  }

  const keys = Object.keys(body);
  const unknown = keys.filter((k) => !ALLOWED_KEYS.has(k));
  if (unknown.length > 0) {
    return `Unsupported field(s): ${unknown.join(', ')}.`;
  }

  const stem = typeof body.questionStem === 'string' ? body.questionStem.trim() : '';
  if (!stem) {
    return 'Field "questionStem" is required.';
  }

  if (!Array.isArray(body.options)) {
    return 'Field "options" must be an array.';
  }
  if (body.options.length < 2) {
    return 'Field "options" must contain at least 2 entries.';
  }
  if (body.options.length > 6) {
    return 'Field "options" must contain at most 6 entries.';
  }
  for (let i = 0; i < body.options.length; i += 1) {
    const o = body.options[i];
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      return `options[${i}] must be an object with "label" and "text".`;
    }
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    if (!label || !text) {
      return `options[${i}] must have non-empty "label" and "text".`;
    }
  }

  const labels = body.options.map((o) => (typeof o.label === 'string' ? o.label.trim() : ''));
  const rawAnswer = body.correctAnswer;
  if (rawAnswer === undefined || rawAnswer === null || String(rawAnswer).trim() === '') {
    return 'Field "correctAnswer" is required.';
  }
  const correctAnswer = String(rawAnswer).trim();
  if (!labels.includes(correctAnswer)) {
    return 'Field "correctAnswer" must match one of the option labels.';
  }

  for (const field of ['subjectId', 'topicId', 'subtopicId']) {
    const oidErr = objectIdFieldMessage(body, field);
    if (oidErr) return oidErr;
  }

  if (body.explanation !== undefined && typeof body.explanation !== 'string') {
    return 'Field "explanation" must be a string.';
  }

  if (body.examMappings !== undefined) {
    if (!Array.isArray(body.examMappings)) {
      return 'Field "examMappings" must be an array.';
    }
    for (let i = 0; i < body.examMappings.length; i += 1) {
      const m = body.examMappings[i];
      if (!m || typeof m !== 'object' || Array.isArray(m)) {
        return `examMappings[${i}] must be an object.`;
      }
      for (const f of ['examBodyId', 'examTypeId']) {
        const v = m[f];
        if (v === undefined || v === null || String(v).trim() === '') {
          return `examMappings[${i}].${f} is required.`;
        }
        if (!mongoose.Types.ObjectId.isValid(String(v).trim())) {
          return `examMappings[${i}].${f} must be a valid ObjectId.`;
        }
      }
    }
  }

  if (body.difficulty !== undefined) {
    const d = String(body.difficulty).trim();
    if (!DIFFICULTIES.has(d)) {
      return 'Field "difficulty" must be one of: easy, medium, hard.';
    }
  }

  if (body.source !== undefined && typeof body.source !== 'string') {
    return 'Field "source" must be a string.';
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return 'Field "tags" must be an array of strings.';
    }
    if (!body.tags.every((t) => typeof t === 'string')) {
      return 'Each tag must be a string.';
    }
  }

  if (body.reviewStatus !== undefined) {
    const r = String(body.reviewStatus).trim();
    if (!REVIEW.has(r)) {
      return 'Field "reviewStatus" must be one of: draft, reviewed, approved.';
    }
  }

  if (body.visibilityStatus !== undefined) {
    const v = String(body.visibilityStatus).trim();
    if (!VISIBILITY.has(v)) {
      return 'Field "visibilityStatus" must be one of: public, premium, hidden.';
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return 'Field "isActive" must be a boolean.';
  }

  return null;
}

/**
 * PATCH /mcqs/:id — shallow body checks only (no merge). `createdBy` is rejected.
 * @param {unknown} patch
 * @returns {string | null}
 */
export function getUpdateMcqPatchError(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return 'Request body must be a JSON object.';
  }
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    return 'At least one field is required.';
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'createdBy')) {
    return 'Field "createdBy" cannot be updated.';
  }
  const unknown = keys.filter((k) => !ALLOWED_KEYS.has(k));
  if (unknown.length > 0) {
    return `Unsupported field(s): ${unknown.join(', ')}.`;
  }
  return null;
}
