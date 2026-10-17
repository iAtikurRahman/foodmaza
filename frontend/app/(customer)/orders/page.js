"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { OrderStatusBadge, PaymentBadge } from "@/components/ui/StatusBadge";
import SentimentBadge from "@/components/ui/SentimentBadge";
import useOrderStream from "@/hooks/useOrderStream";

const STEPS = ["PENDING", "COOKING", "READY"];

/** PENDING → COOKING → READY progress shown on each active order. */
function StatusStepper({ status }) {
  if (status === "CANCELLED") return null;
  const current = STEPS.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-orange-600 text-white"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={done ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400"}>
              {step[0] + step.slice(1).toLowerCase()}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-0.5 w-5 ${
                  i < current ? "bg-orange-600" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Inline form shown on READY orders that have no review yet. */
function ReviewForm({ orderId, onSubmitted }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post("/reviews", { text, orderId });
      onSubmitted(data.review);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <label htmlFor={`review-${orderId}`} className="text-sm font-semibold">
        How was your food?
      </label>
      <textarea
        id={`review-${orderId}`}
        rows={2}
        required
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what you loved (AI checks the sentiment)…"
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:focus:ring-orange-950"
      />
      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {saving ? "Analyzing…" : "Submit review"}
      </button>
    </form>
  );
}

export default function MyOrdersPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  // null = still loading
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() =>
    api
      .get("/orders/mine")
      .then(({ data }) => {
        setOrders(data.orders ?? []);
        setError(null);
      })
      .catch((err) => {
        setOrders([]);
        setError(getErrorMessage(err));
      }),
  []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    load();
  }, [authLoading, isAuthenticated, load]);

  /* Live updates: the SSE stream pushes { orderId, status, paymentStatus }
     whenever THIS customer's order changes — kitchen advances a status, a
     payment lands, the order was paid in another tab, … */
  const handleOrderUpdate = useCallback((payload) => {
    setOrders((prev) =>
      prev
        ? prev.map((o) =>
            o.id === payload.orderId
              ? {
                  ...o,
                  status: payload.status,
                  paymentStatus: payload.paymentStatus,
                }
              : o
          )
        : prev
    );
  }, []);

  useOrderStream(handleOrderUpdate);

  /** POST /api/orders/:id/pay — the fake gateway flips paymentStatus to PAID. */
  async function handlePay(order) {
    setPayingId(order.id);
    setActionError(null);
    try {
      const { data } = await api.post(`/orders/${order.id}/pay`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...data.order } : o))
      );
    } catch (err) {
      // 409 (already paid / cancelled) — resync so the card corrects itself
      setActionError(getErrorMessage(err));
      load();
    } finally {
      setPayingId(null);
    }
  }

  function handleReviewSubmitted(orderId, review) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, review } : o))
    );
  }

  /* -------- not logged in -------- */
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">My Orders</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Log in to see your orders, pay and track them live.
        </p>
        <Link
          href="/login?next=/orders"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">My Orders</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Pay, track the kitchen and review finished orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stream is connected whenever the user is authenticated */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
          {orders && (
            <button
              onClick={load}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* -------- loading / error / empty / list -------- */}
      {orders === null ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&apos;t load your orders: {error}
          <button onClick={load} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            You haven&apos;t ordered anything yet.
          </p>
          <Link
            href="/#menu"
            className="mt-4 inline-block rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Browse the menu
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => {
            const canPay =
              order.paymentStatus !== "PAID" && order.status !== "CANCELLED";
            const canReview =
              order.status === "READY" && !order.review;
            const isPaying = payingId === order.id;

            return (
              <li
                key={order.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">#{order.id.slice(-6)}</span>
                  <span className="text-xs text-zinc-400">
                    {formatDateTime(order.createdAt)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <PaymentBadge paymentStatus={order.paymentStatus} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="mt-3">
                  <StatusStepper status={order.status} />
                </div>

                {/* items + total */}
                <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span>
                        {item.quantity} × {item.menuItem?.name ?? "Dish"}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-zinc-100 pt-2 font-bold dark:border-zinc-800">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </li>
                </ul>

                {/* actions: fake payment */}
                {canPay && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handlePay(order)}
                      disabled={isPaying}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                    >
                      {isPaying ? "Processing…" : `Pay ${formatCurrency(order.total)}`}
                    </button>
                    <span className="text-xs text-zinc-400">
                      Fake gateway — no real money moves
                    </span>
                  </div>
                )}

                {/* review: shown once, or the form while READY & unreviewed */}
                {order.review && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Your review</span>
                      <SentimentBadge
                        sentiment={order.review.sentiment}
                        score={order.review.score}
                      />
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">
                      “{order.review.text}”
                    </p>
                  </div>
                )}

                {canReview && (
                  <div className="mt-3">
                    <ReviewForm
                      orderId={order.id}
                      onSubmitted={(review) =>
                        handleReviewSubmitted(order.id, review)
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
