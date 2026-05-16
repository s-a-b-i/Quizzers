export function getTaxonomyServiceBaseUrl() {
  return String(process.env.TAXONOMY_SERVICE_URL ?? 'http://localhost:3003').replace(/\/$/, '');
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Taxonomy service returned ${res.status}.`);
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  if (!data?.success) {
    const err = new Error(data?.message || 'Invalid response from taxonomy service.');
    err.statusCode = 502;
    throw err;
  }
  return data.data ?? {};
}

/**
 * @returns {Promise<Array<{ _id: string, name?: string, slug?: string }>>}
 */
export async function listExamBodies() {
  const base = getTaxonomyServiceBaseUrl();
  const res = await fetch(`${base}/taxonomy/exam-bodies`, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
  });
  const data = await parseJsonResponse(res);
  return Array.isArray(data.examBodies) ? data.examBodies : [];
}

/**
 * @param {string} subjectId
 */
export async function listTopicsForSubject(subjectId) {
  const base = getTaxonomyServiceBaseUrl();
  const url = `${base}/taxonomy/topics?subjectId=${encodeURIComponent(subjectId)}`;
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000) });
  const data = await parseJsonResponse(res);
  return Array.isArray(data.topics) ? data.topics : [];
}

/**
 * @param {string} topicId
 */
export async function listSubtopicsForTopic(topicId) {
  const base = getTaxonomyServiceBaseUrl();
  const url = `${base}/taxonomy/subtopics?topicId=${encodeURIComponent(topicId)}`;
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000) });
  const data = await parseJsonResponse(res);
  return Array.isArray(data.subtopics) ? data.subtopics : [];
}
