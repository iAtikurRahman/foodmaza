"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import MenuCard from "@/components/customer/MenuCard";

/** Pulsing placeholder that matches MenuCard's shape. */
function CardSkeleton() {
  return (
    <div className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  );
}

export default function HomePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { count } = useCart();

  /* ---------------- Menu (public) ---------------- */
  // null = still loading, [] = loaded (or failed), array = dishes
  const [menu, setMenu] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const loadMenu = useCallback(
    () =>
      api
        .get("/menu")
        .then(({ data }) => {
          setMenu(data.items ?? []);
          setMenuError(null);
        })
        .catch((err) => {
          setMenu([]);
          setMenuError(getErrorMessage(err));
        }),
    []
  );

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const retryMenu = () => {
    setMenu(null);
    setMenuError(null);
    loadMenu();
  };

  /* -------- AI recommendations (Bearer-protected) -------- */
  // undefined = loading, null = unavailable, { strategy, items } = loaded
  const [recs, setRecs] = useState(undefined);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return; // logged out -> promo card instead

    let active = true;
    api
      .get("/recommendations")
      .then(({ data }) => {
        if (active) setRecs(data);
      })
      .catch(() => {
        if (active) setRecs(null); // AI section is optional — hide on failure
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  /* ---------------- Derived ---------------- */
  const categories = useMemo(() => {
    if (!menu) return ["All"];
    return ["All", ...new Set(menu.map((i) => i.category).filter(Boolean))];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    if (!menu) return [];
    return activeCategory === "All"
      ? menu
      : menu.filter((i) => i.category === activeCategory);
  }, [menu, activeCategory]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* ---------------- Hero ---------------- */}
      <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 px-6 py-12 text-white sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-100">
          Foodmaza Restaurant
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
          Fresh food, hot from the kitchen to your table.
        </h1>
        <p className="mt-3 max-w-lg text-orange-100">
          Browse the menu, order in a tap and track your food live. Log in and
          let our AI pick dishes you&apos;ll love.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#menu"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-orange-700 shadow hover:bg-orange-50"
          >
            Browse menu
          </a>
          {!authLoading && !isAuthenticated && (
            <Link
              href="/login"
              className="rounded-full border border-white/70 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Log in for AI picks
            </Link>
          )}
        </div>
      </section>

      {/* -------- Suggested for You (logged-in customers) -------- */}
      {!authLoading && isAuthenticated && (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">✨ Suggested for You</h2>
            {recs?.items?.length > 0 && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {recs.strategy === "similarity"
                  ? "Matched to your taste by AI"
                  : "Popular right now"}
              </span>
            )}
          </div>

          {recs === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : !recs || recs.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              You&apos;ve tried everything on the menu — new dishes coming
              soon!
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recs.items.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  badge={
                    item.similarity != null ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {Math.round(item.similarity * 100)}% match
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Popular
                      </span>
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- Menu ---------------- */}
      <section id="menu" className="mt-12 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Our Menu</h2>
            {menu && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {filteredMenu.length}{" "}
                {filteredMenu.length === 1 ? "dish" : "dishes"}
              </p>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        {menu && (
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading / error / empty / grid */}
        {menu === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : menuError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Couldn&apos;t load the menu: {menuError}
            <button
              onClick={retryMenu}
              className="ml-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filteredMenu.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No dishes in this category yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenu.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* -------- Floating cart button (when cart has items) -------- */}
      {count > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-orange-700"
        >
          View cart
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-orange-700">
            {count}
          </span>
        </Link>
      )}
    </div>
  );
}
