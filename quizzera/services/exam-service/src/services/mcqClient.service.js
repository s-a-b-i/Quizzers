export function getMcqServiceBaseUrl() {
  return String(process.env.MCQ_SERVICE_URL ?? 'http://localhost:3004').replace(/\/$/, '');
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
