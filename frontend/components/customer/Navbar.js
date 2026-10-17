"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#menu", label: "Menu" },
];

function CartIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Cart entry with the live badge — used in the desktop row and mobile menu. */
function CartLink({ showLabel, onNavigate }) {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-orange-600 dark:text-zinc-300"
    >
      <CartIcon />
      {showLabel && <span>Cart</span>}
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  function handleLogout() {
    logout();
    closeMenu();
    router.push("/");
  }

  // Links shown in BOTH the desktop row and the mobile menu
  const primaryLinks = [
    ...NAV_LINKS,
    ...(user ? [{ href: "/orders", label: "My Orders" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  const linkClass = (href) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      pathname === href
        ? "text-orange-600"
        : "text-zinc-600 hover:text-orange-600 dark:text-zinc-300"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      {/* Click-away backdrop while the mobile menu is open */}
      {open && (
        <div
          onClick={closeMenu}
          aria-hidden="true"
          className="fixed inset-0 top-16 z-30 bg-black/30 md:hidden"
        />
      )}

      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        {/* Brand */}
        <Link href="/" onClick={closeMenu} className="text-xl font-extrabold tracking-tight">
          Food<span className="text-orange-600">maza</span>
        </Link>

        {/* ---------- Desktop (md+): full inline nav ---------- */}
        <div className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}

          {/* Cart only exists for a signed-in customer (matches mobile) */}
          {user && <CartLink showLabel />}

          <span className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Auth area: skeleton while the session restores, then user or CTAs */}
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="max-w-32 truncate text-sm text-zinc-600 dark:text-zinc-300">
                Hi, {user.name.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:text-orange-600 dark:text-zinc-200"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* ---------- Mobile: profile name + hamburger ---------- */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <span className="max-w-28 truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {user.name.split(" ")[0]}
            </span>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            className="rounded-lg p-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {open ? <XIcon /> : <BarsIcon />}
          </button>
        </div>

        {/* ---------- Mobile: slide-down menu ---------- */}
        {open && (
          <div className="absolute inset-x-0 top-full z-50 border-b border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
            <nav className="flex flex-col gap-1">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={linkClass(link.href)}
                >
                  {link.label}
                </Link>
              ))}
              {/* Cart only exists for a signed-in customer */}
              {user && <CartLink showLabel onNavigate={closeMenu} />}
            </nav>

            <div className="mt-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {loading ? (
                <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              ) : user ? (
                /* logged in -> Logout only (name already sits in the top bar) */
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Logout
                </button>
              ) : (
                /* logged out -> Login + Sign up */
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
