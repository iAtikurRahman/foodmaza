"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/utils/axiosInstance";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, isAdmin, login, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Where to go after a successful admin login (?next=/admin/orders etc.)
  const requested = searchParams.get("next");
  const destination = requested && requested.startsWith("/") ? requested : "/admin";

  // Already an admin (e.g. bookmarked this page) -> straight to the dashboard
  useEffect(() => {
    if (!loading && isAdmin) router.replace("/admin");
  }, [loading, isAdmin, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const logged = await login(email, password);
      if (logged.role !== "ADMIN") {
        logout(); // never leave a customer session sitting on an admin screen
        setError("This account doesn't have admin access. Please sign in with a staff account.");
        return;
      }
      router.replace(destination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          Food<span className="text-orange-600">maza</span>
        </Link>
        <h1 className="mt-4 text-lg font-bold">Staff sign in</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Admin access only — customers sign in on the{" "}
          <Link href="/login" className="font-medium text-orange-600 hover:underline">
            regular login page
          </Link>
          .
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@foodmaza.com"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:focus:ring-orange-950"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:focus:ring-orange-950"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
