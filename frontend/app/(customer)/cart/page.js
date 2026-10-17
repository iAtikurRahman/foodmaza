"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency } from "@/utils/format";

export default function CartPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { items, count, total, updateQuantity, removeItem, clearCart, toOrderPayload } =
    useCart();

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * POST /api/orders with exactly the payload the backend expects.
   * The server re-prices everything and returns the created order (PENDING,
   * unpaid) — we clear the cart and land on /orders where "Pay now" lives.
   */
  async function handlePlaceOrder() {
    setError(null);
    setPlacing(true);
    try {
      await api.post("/orders", { items: toOrderPayload() });
      clearCart();
      router.push("/orders");
    } catch (err) {
      setError(getErrorMessage(err));
      setPlacing(false);
    }
  }

  /* -------- logged out: cart still persists locally, checkout needs auth -------- */
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Your {count} {count === 1 ? "item is" : "items are"} saved on this
          device — log in to place the order.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?next=/cart"
            className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Log in to checkout
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  /* -------- empty cart -------- */
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Nothing here yet — go pick something delicious.
        </p>
        <Link
          href="/#menu"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  /* -------- cart with items -------- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold">Your cart</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* -------- line items -------- */}
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.menuItemId}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(item.price)} each
                  {item.category ? ` · ${item.category}` : ""}
                </p>
              </div>

              {/* quantity stepper */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  aria-label={`Decrease ${item.name}`}
                  className="px-3 py-1.5 text-sm font-bold text-zinc-600 hover:text-orange-600 dark:text-zinc-300"
                >
                  −
                </button>
                <span className="min-w-7 text-center text-sm font-semibold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  aria-label={`Increase ${item.name}`}
                  className="px-3 py-1.5 text-sm font-bold text-zinc-600 hover:text-orange-600 dark:text-zinc-300"
                >
                  +
                </button>
              </div>

              <span className="w-20 text-right text-sm font-bold">
                {formatCurrency(item.price * item.quantity)}
              </span>

              <button
                onClick={() => removeItem(item.menuItemId)}
                aria-label={`Remove ${item.name}`}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        {/* -------- summary -------- */}
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-bold">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Items</dt>
              <dd className="font-medium">{count}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <dt className="text-zinc-500 dark:text-zinc-400">Total</dt>
              <dd className="text-lg font-extrabold">{formatCurrency(total)}</dd>
            </div>
          </dl>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
          >
            {placing ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Payment happens on the next step (fake gateway).
          </p>
        </aside>
      </div>
    </div>
  );
}
