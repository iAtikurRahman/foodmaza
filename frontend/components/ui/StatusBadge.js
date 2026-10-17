/* Small colored chips shared by customer and admin order/review views. */

const ORDER_STATUS = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  },
  COOKING: {
    label: "Cooking",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  READY: {
    label: "Ready",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

const PAYMENT_STATUS = {
  PAID: {
    label: "Paid",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  PENDING: {
    label: "Unpaid",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export function OrderStatusBadge({ status }) {
  const style = ORDER_STATUS[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

export function PaymentBadge({ paymentStatus }) {
  const style = PAYMENT_STATUS[paymentStatus] ?? {
    label: paymentStatus,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
