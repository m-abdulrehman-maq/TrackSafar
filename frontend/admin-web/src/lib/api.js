/** API client: normalized errors, bearer session, no silent mock fallbacks. */

const TOKEN_KEY = "tracksafar.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function parseError(status, payload) {
  if (payload && payload.error) {
    return new ApiError(status, payload.error.code || "error", payload.error.message || "Request failed", payload.error.details || {});
  }
  if (payload && Array.isArray(payload.detail)) {
    const first = payload.detail[0] || {};
    return new ApiError(status, "validation_failed", first.msg ? `${first.loc?.[1] || "input"}: ${first.msg}` : "Validation failed", {});
  }
  if (typeof payload?.detail === "string") {
    return new ApiError(status, "error", payload.detail, {});
  }
  return new ApiError(status, status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "error", `Request failed (${status})`, {});
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection and retry.");
  }

  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const error = parseError(res.status, payload);
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("tracksafar:session-expired"));
    }
    throw error;
  }
  return payload;
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body, opts) => api(path, { ...opts, method: "POST", body });
export const patch = (path, body, opts) => api(path, { ...opts, method: "PATCH", body });
export const put = (path, body, opts) => api(path, { ...opts, method: "PUT", body });
export const del = (path, opts) => api(path, { ...opts, method: "DELETE" });
