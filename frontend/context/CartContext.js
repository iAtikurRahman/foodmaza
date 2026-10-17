"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const CartContext = createContext(null);

const CART_KEY = "foodmaza_cart";
const MAX_QTY = 99; // backend caps quantity per line item at 99
const EMPTY_CART = []; // stable reference — required by useSyncExternalStore

/* -----------------------------------------------------------------------
 * Tiny external store around localStorage.
 *
 * `useSyncExternalStore` is the hydration-safe way to read browser storage:
 * during SSR/hydration React uses getServerSnapshot() (empty cart, which
 * matches the server HTML exactly), then immediately re-renders with the
 * real snapshot from localStorage — no setState-in-effect, no mismatch.
 * -------------------------------------------------------------------- */
let cartItems = EMPTY_CART;
const listeners = new Set();

function readStoredCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : EMPTY_CART;
  } catch {
    return EMPTY_CART; // corrupted storage -> start empty
  }
}

// Client-only, runs once when the module loads in the browser.
if (typeof window !== "undefined") cartItems = readStoredCart();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartItems; // only changes when commit() runs, so it stays stable
}

function getServerSnapshot() {
  return EMPTY_CART;
}

function commit(nextItems) {
  cartItems = nextItems;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
  } catch {
    // Storage unavailable (private mode / quota) — cart still works in memory
  }
  listeners.forEach((listener) => listener());
}

/**
 * Cart state, persisted to localStorage.
 *
 * Stored item shape (display data is copied in, so the cart survives
 * page refreshes without re-fetching the menu):
 *   { menuItemId, name, price, category, quantity }
 *
 * `toOrderPayload()` converts it to exactly what POST /api/orders expects:
 *   [{ menuItemId, quantity }]
 */
export function CartProvider({ children }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** Add a menu item (or increase its quantity if already in the cart). */
  const addItem = useCallback((menuItem, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((i) => i.menuItemId === menuItem.id);

    const next = existing
      ? current.map((i) =>
          i.menuItemId === menuItem.id
            ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) }
            : i
        )
      : [
          ...current,
          {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            category: menuItem.category ?? null,
            quantity: Math.min(MAX_QTY, Math.max(1, quantity)),
          },
        ];

    commit(next);
  }, []);

  const removeItem = useCallback((menuItemId) => {
    commit(getSnapshot().filter((i) => i.menuItemId !== menuItemId));
  }, []);

  /** Set an absolute quantity; anything below 1 removes the line. */
  const updateQuantity = useCallback((menuItemId, quantity) => {
    const current = getSnapshot();

    const next =
      quantity < 1
        ? current.filter((i) => i.menuItemId !== menuItemId)
        : current.map((i) =>
            i.menuItemId === menuItemId
              ? { ...i, quantity: Math.min(MAX_QTY, quantity) }
              : i
          );

    commit(next);
  }, []);

  const clearCart = useCallback(() => commit(EMPTY_CART), []);

  /** Total number of units (badge count). */
  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  /** Cart total in currency units (rounded to 2 decimals). */
  const total = useMemo(
    () =>
      Number(
        items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
      ),
    [items]
  );

  /** Payload for POST /api/orders */
  const toOrderPayload = useCallback(
    () => items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      toOrderPayload,
    }),
    [items, count, total, addItem, removeItem, updateQuantity, clearCart, toOrderPayload]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** const { items, total, addItem } = useCart(); */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
