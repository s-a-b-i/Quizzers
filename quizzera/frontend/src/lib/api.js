/**
 * USAGE RULES:
 * - Never call axios directly in a page or component.
 * - Never manually attach Authorization header in a component.
 * - Never handle 401 manually in a component.
 * - Always use apiGet, apiPost, apiPatch, apiDelete from this file.
 */

import axios from 'axios';

/**
 * Always same-origin `/api/*` in the browser. `next.config.js` rewrites those to the
 * gateway (see `NEXT_PUBLIC_GATEWAY_URL` there). Do not point axios at the gateway
 * host here: e.g. Next on :3006 and gateway on :3000 is cross-origin and triggers CORS.
 */
const apiInstance = axios.create({
  baseURL: undefined,
});

let getAccessToken = () => null;
let onUnauthorized = async () => {};

/** Wired from AuthProvider so interceptors can read the latest Firebase ID token and react to 401. */
export function registerApiAuth({ getAccessToken: getToken, onUnauthorized: on401 }) {
  if (typeof getToken === 'function') getAccessToken = getToken;
  if (typeof on401 === 'function') onUnauthorized = on401;
}

let handling401 = false;

apiInstance.interceptors.request.use((config) => {
  const skipAuthHeader = config.skipAuthHeader === true;
  const token = getAccessToken?.();
  if (!skipAuthHeader && token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const cfg = error?.config ?? {};
    if (
      status === 401 &&
      cfg.skip401Logout !== true &&
      !handling401
    ) {
      handling401 = true;
      try {
        await onUnauthorized?.();
      } catch {
        /* ignore */
      } finally {
        handling401 = false;
      }
    }
    return Promise.reject(error);
  }
);

export async function apiGet(url, config) {
  return apiInstance.get(url, config);
}

export async function apiPost(url, body, config) {
  return apiInstance.post(url, body, config);
}

export async function apiPatch(url, body, config) {
  return apiInstance.patch(url, body, config);
}

export async function apiDelete(url, config) {
  return apiInstance.delete(url, config);
}
