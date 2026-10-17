"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/reviews", label: "Reviews" },
];

/** Vertical sidebar on large screens, scrollable top strip on mobile. */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <aside className="flex shrink-0 flex-col gap-3 border-b border-zinc-800 bg-zinc-900 p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2">
        <Link href="/admin" className="text-lg font-extrabold tracking-tight">
          Food<span className="text-orange-500">maza</span>
          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
            Admin
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 lg:hidden"
        >
          Logout
        </button>
      </div>

      {/* Mobile: 2×2 grid so all four items always fit · tablet: 4 across · lg: vertical list */}
      <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:mt-4 lg:flex lg:flex-col lg:gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-orange-600 text-white"
                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto hidden border-t border-zinc-800 pt-4 lg:block">
        <p className="text-xs text-zinc-500">Signed in as</p>
        <p className="truncate text-sm font-semibold">{user?.name}</p>
        <p className="truncate text-xs text-zinc-400">{user?.email}</p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/"
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            View site
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
