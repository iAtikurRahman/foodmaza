"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { OrderStatusBadge, PaymentBadge } from "@/components/ui/StatusBadge";

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  // null = still loading
  const [orders, setOrders] = useState(null);
  const [reviewStats, setReviewStats] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(
    () =>
      Promise.allSettled([api.get("/orders"), api.get("/reviews/stats")]).then(
        ([ordersResult, statsResult]) => {
          if (ordersResult.status === "fulfilled") {
            setOrders(ordersResult.value.data.orders ?? []);
            setError(null);
          } else {
            setOrders([]);
            setError(getErrorMessage(ordersResult.reason));
          }
          if (statsResult.status === "fulfilled") {
            setReviewStats(statsResult.value.data);
          }
        }
      ),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    if (!orders) return null;
    const byStatus = { PENDING: 0, COOKING: 0, READY: 0, CANCELLED: 0 };
    let revenue = 0;
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
      if (order.paymentStatus === "PAID") revenue += order.total;
    }
    return { total: orders.length, byStatus, revenue: Number(revenue.toFixed(2)) };
  }, [orders]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [orders]);

  const inKitchen = stats ? stats.byStatus.PENDING + stats.byStatus.COOKING : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Orders, revenue and AI review sentiment at a glance
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>Couldn&apos;t load some data: {error}</span>
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {stats === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total orders"
            value={stats.total}
            hint={`${stats.byStatus.READY} ready · ${stats.byStatus.CANCELLED} cancelled`}
          />
          <StatCard
            label="In the kitchen"
            value={inKitchen}
            hint={`${stats.byStatus.PENDING} pending · ${stats.byStatus.COOKING} cooking`}
          />
          <StatCard
            label="Revenue (paid)"
            value={formatCurrency(stats.revenue)}
            hint="Sum of PAID orders"
          />
          <StatCard
            label="Reviews"
            value={reviewStats?.total ?? 0}
            hint={
              reviewStats
                ? `${reviewStats.stats.POSITIVE} positive · ${reviewStats.stats.NEGATIVE} negative`
                : "Sentiment stats unavailable"
            }
          />
        </div>
      )}

      {/* Recent orders */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-bold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-orange-600 hover:underline"
          >
            View all →
          </Link>
        </div>

        {orders === null ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
            No orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentOrders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
              >
                <span className="font-medium">{order.customer?.name ?? "Customer"}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  #{order.id.slice(-6)} · {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </span>
                <span className="ml-auto text-sm font-semibold">
                  {formatCurrency(order.total)}
                </span>
                <PaymentBadge paymentStatus={order.paymentStatus} />
                <OrderStatusBadge status={order.status} />
                <span className="w-full text-xs text-zinc-400 sm:w-auto sm:text-right">
                  {formatDateTime(order.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
