"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import SentimentBadge from "@/components/ui/SentimentBadge";

const FILTERS = ["ALL", "POSITIVE", "NEGATIVE"];

export default function AdminReviewsPage() {
  // null = still loading, { stats, total } = loaded
  const [reviewStats, setReviewStats] = useState(null);
  // null = still loading
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(() =>
    Promise.allSettled([api.get("/reviews"), api.get("/reviews/stats")]).then(
      ([reviewsResult, statsResult]) => {
        if (reviewsResult.status === "fulfilled") {
          setReviews(reviewsResult.value.data.reviews ?? []);
          setError(null);
        } else {
          setReviews([]);
          setError(getErrorMessage(reviewsResult.reason));
        }
        if (statsResult.status === "fulfilled") {
          setReviewStats(statsResult.value.data);
        }
      }
    ),
  []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const result = { ALL: reviews?.length ?? 0, POSITIVE: 0, NEGATIVE: 0, UNKNOWN: 0 };
    for (const review of reviews ?? []) {
      const key =
        review.sentiment === "POSITIVE" || review.sentiment === "NEGATIVE"
          ? review.sentiment
          : "UNKNOWN";
      result[key] += 1;
    }
    return result;
  }, [reviews]);

  const visibleReviews = useMemo(
    () =>
      filter === "ALL"
        ? reviews ?? []
        : (reviews ?? []).filter((r) => (r.sentiment ?? "UNKNOWN") === filter),
    [reviews, filter]
  );

  const positivePct =
    reviewStats && reviewStats.total > 0
      ? Math.round((reviewStats.stats.POSITIVE / reviewStats.total) * 100)
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Reviews</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every customer review with its AI sentiment score
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total reviews</p>
          <p className="mt-1 text-3xl font-extrabold">{reviewStats?.total ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Positive</p>
          <p className="mt-1 text-3xl font-extrabold text-green-600 dark:text-green-400">
            {reviewStats?.stats.POSITIVE ?? 0}
          </p>
          {positivePct != null && (
            <p className="mt-1 text-xs text-zinc-400">{positivePct}% of all reviews</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Negative</p>
          <p className="mt-1 text-3xl font-extrabold text-red-600 dark:text-red-400">
            {reviewStats?.stats.NEGATIVE ?? 0}
          </p>
        </div>
      </div>

      {/* Sentiment filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((sentiment) => (
          <button
            key={sentiment}
            onClick={() => setFilter(sentiment)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === sentiment
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {sentiment === "ALL" ? "All" : sentiment[0] + sentiment.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">{counts[sentiment] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Review feed */}
      {reviews === null ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&apos;t load reviews: {error}
          <button
            onClick={load}
            className="ml-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : visibleReviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No reviews here yet.
        </p>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{review.user?.name ?? "Anonymous"}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {review.user?.email}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <SentimentBadge sentiment={review.sentiment} score={review.score} />
                  <span className="text-xs text-zinc-400">
                    {formatDateTime(review.createdAt)}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                {review.text}
              </p>

              {review.order && (
                <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <span>Order #{review.order.id.slice(-6)}</span>
                  <span>· {formatCurrency(review.order.total)}</span>
                  <OrderStatusBadge status={review.order.status} />
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
