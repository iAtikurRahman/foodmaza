/* Shared display helpers used across the app. */

// Currency symbol — change here if you price in another currency (e.g. "₹").
export const CURRENCY = "৳";

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return `${CURRENCY}${amount.toFixed(2)}`;
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
