"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { OrderStatusBadge, PaymentBadge } from "@/components/ui/StatusBadge";

const STATUS_FILTERS = ["ALL", "PENDING", "COOKING", "READY", "CANCELLED"];

/**
 * Allowed transitions (mirrors the backend flow):
 *   PENDING -> COOKING -> READY, with CANCELLED allowed before READY.
 */
const NEXT_ACTIONS = {
  PENDING: [
    {
      status: "COOKING",
      label: "Start cooking",
      className: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      status: "CANCELLED",
      label: "Cancel",
      className: "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400",
    },
  ],
  COOKING: [
    {
      status: "READY",
      label: "Mark ready",
      className: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      status: "CANCELLED",
      label: "Cancel",
      className: "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400",
    },
  ],
  READY: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  // null = still loading
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() =>
    api
      .get("/orders")
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
    load();
  }, [load]);

  const counts = useMemo(() => {
    const result = { ALL: orders?.length ?? 0 };
    for (const order of orders ?? []) {
      result[order.status] = (result[order.status] ?? 0) + 1;
    }
    return result;
  }, [orders]);

  const visibleOrders = useMemo(
    () =>
      filter === "ALL"
        ? orders ?? []
        : (orders ?? []).filter((o) => o.status === filter),
    [orders, filter]
  );

  async function handleStatusChange(order, nextStatus) {
    setUpdatingId(order.id);
    setActionError(null);
    try {
      const { data } = await api.patch(`/orders/${order.id}/status`, {
        status: nextStatus,
      });
      // Swap in the order the backend returned (it re-reads related rows)
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...data.order } : o))
      );
    } catch (err) {
      // 409 = someone else already moved this order — resync and tell the admin
      setActionError(getErrorMessage(err));
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Orders</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Kitchen pipeline: PENDING → COOKING → READY
        </p>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === status
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {status === "ALL" ? "All" : status[0] + status.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">{counts[status] ?? 0}</span>
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Order cards */}
      {orders === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&apos;t load orders: {error}
          <button
            onClick={load}
            className="ml-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No {filter === "ALL" ? "" : filter.toLowerCase() + " "}orders right now.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleOrders.map((order) => {
            const actions = NEXT_ACTIONS[order.status] ?? [];
            const isUpdating = updatingId === order.id;
            return (
              <article
                key={order.id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{order.customer?.name ?? "Customer"}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {order.customer?.email}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <PaymentBadge paymentStatus={order.paymentStatus} />
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <p className="mt-1 text-xs text-zinc-400">
                  #{order.id.slice(-6)} · {formatDateTime(order.createdAt)}
                </p>

                {/* Items */}
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
                </ul>

                {/* Footer: total + pipeline actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-sm font-bold">
                    Total {formatCurrency(order.total)}
                  </span>
                  <div className="ml-auto flex gap-2">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order, action.status)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${action.className}`}
                      >
                        {isUpdating ? "…" : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
