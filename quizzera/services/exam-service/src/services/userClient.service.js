export function getUserServiceBaseUrl() {
  return String(process.env.USER_SERVICE_URL ?? 'http://localhost:3002').replace(/\/$/, '');
}

/**
 * @param {string|undefined} authorization
 */
export async function fetchUserProfile(authorization) {
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const base = getUserServiceBaseUrl();
  const res = await fetch(`${base}/users/me`, {
    method: 'GET',
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !data?.data?.user) {
    return null;
  }
  return data.data.user;
}
