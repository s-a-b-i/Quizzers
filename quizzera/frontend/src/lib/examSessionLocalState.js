const STORAGE_PREFIX = 'quizzera-exam-session-';

export function examSessionStorageKey(sessionId) {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function readExamSessionLocal(sessionId) {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    const raw = window.localStorage.getItem(examSessionStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeExamSessionLocal(sessionId, payload) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    window.localStorage.setItem(examSessionStorageKey(sessionId), JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function clearExamSessionLocal(sessionId) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    window.localStorage.removeItem(examSessionStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}

export function answersMapFromList(list) {
  const map = {};
  if (!Array.isArray(list)) return map;
  for (const item of list) {
    const id = String(item?.mcqId ?? '');
    if (!id) continue;
    map[id] = typeof item.selectedLabel === 'string' ? item.selectedLabel.trim() : '';
  }
  return map;
}

export function answersListFromMap(mcqs, answersByMcqId) {
  if (!Array.isArray(mcqs)) return [];
  return mcqs.map((mcq) => {
    const mcqId = String(mcq._id ?? mcq.id ?? '');
    return {
      mcqId,
      selectedLabel: answersByMcqId[mcqId] ?? '',
    };
  });
}
