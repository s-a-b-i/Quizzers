import { toPracticeMcqList, toPracticeMcqShape } from '../lib/mcqPracticeShape.js';

export function getMcqServiceBaseUrl() {
  return String(process.env.MCQ_SERVICE_URL ?? 'http://localhost:3004').replace(/\/$/, '');
}

function internalSecretOrThrow() {
  const secret = process.env.INTERNAL_SECRET;
  if (typeof secret !== 'string' || secret.length === 0) {
    const err = new Error('INTERNAL_SECRET is not configured.');
    err.statusCode = 503;
    throw err;
  }
  return secret;
}

/**
 * POST /mcqs/internal/fetch-for-exam
 * @param {{ subtopicIds: string[], difficulty?: string, count: number }} payload
 */
export async function fetchMcqsForExam({ subtopicIds, difficulty, count }) {
  const secret = internalSecretOrThrow();
  const base = getMcqServiceBaseUrl();
  const body = {
    subtopicIds: subtopicIds.map((id) => String(id)),
    count,
  };
  if (difficulty) {
    body.difficulty = difficulty;
  }

  const res = await fetch(`${base}/mcqs/internal/fetch-for-exam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `MCQ service returned ${res.status}.`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
    const err = new Error('Invalid response from MCQ service.');
    err.statusCode = 502;
    throw err;
  }

  return toPracticeMcqList(data.data.mcqs);
}

/**
 * POST /mcqs/internal/fetch-for-weak-area
 * @param {{ topicIds: string[], difficulty?: string, count: number }} payload
 */
export async function fetchMcqsForWeakArea({ topicIds, difficulty, count }) {
  const secret = internalSecretOrThrow();
  const base = getMcqServiceBaseUrl();
  const body = {
    topicIds: topicIds.map((id) => String(id)),
    count,
  };
  if (difficulty) {
    body.difficulty = difficulty;
  }

  const res = await fetch(`${base}/mcqs/internal/fetch-for-weak-area`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `MCQ service returned ${res.status}.`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
    const err = new Error('Invalid response from MCQ service.');
    err.statusCode = 502;
    throw err;
  }

  return toPracticeMcqList(data.data.mcqs);
}

/**
 * POST /mcqs/internal/answers-for-scoring
 * @param {string[]} mcqIds
 * @returns {Promise<Array<{ _id: unknown, correctAnswer: string, topicId: unknown }>>}
 */
export async function fetchMcqAnswersForScoring(mcqIds) {
  const secret = internalSecretOrThrow();
  const base = getMcqServiceBaseUrl();
  const ids = mcqIds.map((id) => String(id));

  const res = await fetch(`${base}/mcqs/internal/answers-for-scoring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ mcqIds: ids }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `MCQ service returned ${res.status}.`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
    const err = new Error('Invalid response from MCQ service.');
    err.statusCode = 502;
    throw err;
  }

  return data.data.mcqs;
}

/**
 * POST /mcqs/internal/fetch-for-result-review
 * @param {string[]} mcqIds
 */
export async function fetchMcqsForResultReview(mcqIds) {
  const secret = internalSecretOrThrow();
  const base = getMcqServiceBaseUrl();
  const ids = mcqIds.map((id) => String(id));

  const res = await fetch(`${base}/mcqs/internal/fetch-for-result-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ mcqIds: ids }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `MCQ service returned ${res.status}.`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  if (!data?.success || !Array.isArray(data?.data?.mcqs)) {
    const err = new Error('Invalid response from MCQ service.');
    err.statusCode = 502;
    throw err;
  }

  return data.data.mcqs;
}

/**
 * Hydrate practice MCQs by id via public GET /mcqs/:id (strips answers server-side).
 */
export async function fetchMcqsByIdsForPractice(mcqIds, authorization) {
  const base = getMcqServiceBaseUrl();
  const headers = {};
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    headers.Authorization = authorization;
  }

  const settled = await Promise.all(
    mcqIds.map(async (id) => {
      const mid = String(id);
      try {
        const res = await fetch(`${base}/mcqs/${encodeURIComponent(mid)}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.data?.mcq) {
          return null;
        }
        return toPracticeMcqShape(data.data.mcq);
      } catch {
        return null;
      }
    })
  );

  return settled.filter(Boolean);
}

/**
 * Lightweight connectivity check to mcq-service (for readiness / internal probes).
 */
export async function pingMcqHealth() {
  const base = getMcqServiceBaseUrl();
  const url = `${base}/mcqs/health`;
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e?.message ?? 'fetch failed' };
  }
}
