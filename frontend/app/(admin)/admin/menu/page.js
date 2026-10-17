"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "@/utils/axiosInstance";
import { formatCurrency } from "@/utils/format";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  available: true,
};

export default function AdminMenuPage() {
  // null = still loading
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  // Form panel: null = closed, otherwise EMPTY_FORM (+ optional id when editing)
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // The admin needs unavailable dishes too, hence ?all=true
  const load = useCallback(() =>
    api
      .get("/menu", { params: { all: "true" } })
      .then(({ data }) => {
        setItems(data.items ?? []);
        setError(null);
      })
      .catch((err) => {
        setItems([]);
        setError(getErrorMessage(err));
      }),
  []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () =>
      [...new Set((items ?? []).map((i) => i.category).filter(Boolean))].sort(),
    [items]
  );

  /* ---------- form helpers ---------- */
  function openCreate() {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(item) {
    setFormError(null);
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      category: item.category ?? "",
      available: item.available,
    });
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();

    const price = Number(form.price);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (Number.isNaN(price) || price < 0)
      return setFormError("Price must be a non-negative number.");

    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      category: form.category.trim() || null,
      available: form.available,
    };

    try {
      if (form.id) {
        await api.put(`/menu/${form.id}`, payload);
      } else {
        await api.post("/menu", payload);
      }
      setForm(null);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /* ---------- row actions ---------- */
  async function handleToggleAvailable(item) {
    setActionError(null);
    try {
      // PUT is a partial update — we only send the flag that changed
      const { data } = await api.put(`/menu/${item.id}`, {
        available: !item.available,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ...data.item } : i))
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function handleDelete(item) {
    const sure = window.confirm(
      `Delete "${item.name}"? This fails if the dish belongs to an existing order.`
    );
    if (!sure) return;

    setDeletingId(item.id);
    setActionError(null);
    try {
      await api.delete(`/menu/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:focus:ring-orange-950";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Menu</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {items ? `${items.length} dishes` : "Create, edit and retire dishes"}
          </p>
        </div>
        {!form && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            + Add dish
          </button>
        )}
      </div>

      {/* ---------- create / edit form ---------- */}
      {form && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm dark:border-orange-900 dark:bg-zinc-900"
        >
          <h2 className="font-bold">{form.id ? "Edit dish" : "New dish"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dish-name" className="mb-1 block text-sm font-medium">
                Name *
              </label>
              <input
                id="dish-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Chicken Biryani"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="dish-category" className="mb-1 block text-sm font-medium">
                Category
              </label>
              <input
                id="dish-category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Main Course"
                list="known-categories"
                className={inputClass}
              />
              <datalist id="known-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="dish-price" className="mb-1 block text-sm font-medium">
                Price *
              </label>
              <input
                id="dish-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="320"
                className={inputClass}
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setField("available", e.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
                Available to order
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="dish-description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="dish-description"
              rows={2}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Fragrant basmati rice with spiced chicken"
              className={inputClass}
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : form.id ? "Save changes" : "Create dish"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* ---------- dish grid ---------- */}
      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&apos;t load the menu: {error}
          <button
            onClick={load}
            className="ml-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No dishes yet — add your first one above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 ${
                item.available
                  ? "border-zinc-200 dark:border-zinc-800"
                  : "border-zinc-200 opacity-60 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  {item.category || "Misc"}
                </span>
                <span className="text-lg font-bold">{formatCurrency(item.price)}</span>
              </div>

              <h3 className="mt-2 font-semibold">{item.name}</h3>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {item.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  onClick={() => handleToggleAvailable(item)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    item.available
                      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-300"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                  title="Toggle availability"
                >
                  {item.available ? "Available" : "Sold out"}
                </button>

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400"
                  >
                    {deletingId === item.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
