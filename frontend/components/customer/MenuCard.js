"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/utils/format";

/**
 * One dish in a grid.
 *
 * @param {object}   props
 * @param {object}   props.item   - a menu item from GET /api/menu
 * @param {React.ReactNode} [props.badge] - small chip in the top-right
 *                                         (e.g. AI match % on recommendations)
 */
export default function MenuCard({ item, badge }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);

  // Clean up the "Added ✓" feedback timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleAdd = () => {
    addItem(item, 1);
    setAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1200);
  };

  const soldOut = item.available === false;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
          {item.category || "Misc"}
        </span>
        {badge}
      </div>

      <h3 className="text-base font-semibold">{item.name}</h3>
      {item.description && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
          {item.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold">{formatCurrency(item.price)}</span>

        {soldOut ? (
          <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Sold out
          </span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={added}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              added
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          >
            {added ? "Added ✓" : "Add"}
          </button>
        )}
      </div>
    </article>
  );
}
