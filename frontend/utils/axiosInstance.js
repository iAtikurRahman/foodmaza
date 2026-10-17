import axios from "axios";

/**
 * Single Axios instance used by the whole app.
 *
 * - `baseURL` comes from .env (NEXT_PUBLIC_API_URL = http://localhost:5001/api)
 * - The JWT is attached automatically to every request
 * - A 401 caused by a stored token means the token expired/is invalid,
 *   so we clear it and broadcast an event AuthContext listens to.
 */

export const TOKEN_KEY = "foodmaza_token";

/** Read the JWT. Safe to call during SSR (always returns null there). */
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Base URL shared by axios and the raw-fetch SSE stream client. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ---------- attach Bearer token automatically ---------- */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------- react to expired/invalid tokens ---------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const tokenWasSent = Boolean(getToken());

    // 401 from a plain login attempt = wrong credentials, not an expired
    // session, so only act when a token actually exists.
    if (status === 401 && tokenWasSent) {
      clearToken();
      window.dispatchEvent(new Event("foodmaza:unauthorized"));
    }
    return Promise.reject(error);
  }
);

/** Pull the backend's `{ error: "..." }` message out of any failed call. */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.error || error?.message || fallback;
}

export default api;
