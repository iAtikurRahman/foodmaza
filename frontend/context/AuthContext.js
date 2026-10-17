"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { clearToken, getToken, setToken } from "@/utils/axiosInstance";

const AuthContext = createContext(null);

/**
 * Holds the current user + token for the whole app.
 *
 * Backend contract:
 *   POST /api/auth/login    -> { token, user: { id, name, email, role } }
 *   POST /api/auth/register -> { token, user }   (201)
 *   GET  /api/auth/me       -> { user }
 *
 * Errors are NOT swallowed by login/register — they reject so the calling
 * form can show `getErrorMessage(err)`.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  // true until the saved session (if any) has been verified with the API.
  // Starts as `true` on BOTH server and client so hydration matches — SSR
  // cannot see localStorage, so it always renders the "checking session" UI.
  const [loading, setLoading] = useState(true);

  /* Restore the session on first load: localStorage -> GET /api/auth/me */
  useEffect(() => {
    const stored = getToken();

    if (!stored) {
      // No token: resolve on the next tick so the first client commit still
      // matches the server-rendered HTML before `loading` flips to false.
      queueMicrotask(() => setLoading(false));
      return;
    }

    let active = true;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (!active) return;
        setTokenState(stored);
        setUser(data.user);
      })
      .catch(() => {
        // 401 -> the axios interceptor already cleared the token and fired
        // "foodmaza:unauthorized" (handled below). Any other failure (e.g.
        // backend unreachable) keeps the token and retries on the next load.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /* Axios fires this when ANY request fails with 401 + a stored token */
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setTokenState(null);
    };
    window.addEventListener("foodmaza:unauthorized", onUnauthorized);
    return () => window.removeEventListener("foodmaza:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  /** Re-read the profile (e.g. after an edit). */
  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** const { user, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
