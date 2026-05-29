const DEFAULT_API_BASE = "/api";
const DEFAULT_ERROR_MESSAGE = "Loi may chu";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function createApi(baseUrl = DEFAULT_API_BASE) {
  return async function api(path, opts = {}) {
    const response = await fetch(baseUrl + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (typeof window !== "undefined" && (response.status === 401 || response.status === 403)) {
        window.dispatchEvent(new CustomEvent("nowayhome:auth-error", { detail: { status: response.status, path } }));
      }
      const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || data.error || DEFAULT_ERROR_MESSAGE);
      throw new ApiError(msg, response.status, data);
    }
    return data;
  };
}

export const api = createApi();
