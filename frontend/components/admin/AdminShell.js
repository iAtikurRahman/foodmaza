"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";

const LOGIN_PATH = "/admin/login";

/**
 * Guards the whole (admin) route group: while the session restores we show a
 * spinner, and anyone who isn't ADMIN is sent to the admin login page.
 * The staff login screen itself renders standalone — without the sidebar and
 * without the bounce — so a logged-out admin can actually sign in.
 */
export default function AdminShell({ children }) {
  const { loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLoginPage || loading || isAdmin) return;
    router.replace(`/login?next=${encodeURIComponent("/admin")}`);
  }, [isLoginPage, loading, isAdmin, router]);

  if (isLoginPage) return children;

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 lg:flex-row dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
