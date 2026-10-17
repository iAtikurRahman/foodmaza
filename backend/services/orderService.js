import { prisma } from '../config/prisma.js';

/**
 * Places an order: validates menu items, computes the bill from current
 * prices, and stores each line item with a price snapshot — all in one
 * transaction so an order can never exist without its items or total.
 *
 * @param {string} customerId - authenticated customer's user id
 * @param {{ menuItemId: string, quantity: number }[]} items
 */
export async function createOrder(customerId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Order must contain at least one item'), { status: 400 });
  }

  const normalized = items.map((it) => ({
    menuItemId: String(it?.menuItemId ?? ''),
    quantity: Math.trunc(Number(it?.quantity ?? 0)),
  }));

  if (normalized.some((it) => !it.menuItemId || !Number.isInteger(it.quantity) || it.quantity < 1)) {
    throw Object.assign(new Error('Each item needs a menuItemId and a quantity >= 1'), { status: 400 });
  }
  if (normalized.some((it) => it.quantity > 99)) {
    throw Object.assign(new Error('Quantity per item is capped at 99'), { status: 400 });
  }

  const ids = [...new Set(normalized.map((it) => it.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  for (const it of normalized) {
    const menuItem = byId.get(it.menuItemId);
    if (!menuItem) throw Object.assign(new Error(`Menu item not found: ${it.menuItemId}`), { status: 404 });
    if (!menuItem.available) {
      throw Object.assign(new Error(`"${menuItem.name}" is currently unavailable`), { status: 409 });
    }
  }

  // Bill = sum(unit price at this moment × quantity)
  const total = normalized.reduce((sum, it) => sum + byId.get(it.menuItemId).price * it.quantity, 0);

  return prisma.order.create({
    data: {
      customerId,
      total: Number(total.toFixed(2)),
      items: {
        create: normalized.map((it) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          price: byId.get(it.menuItemId).price, // snapshot: later menu price edits won't rewrite history
        })),
      },
    },
    include: {
      items: { include: { menuItem: { select: { id: true, name: true, category: true } } } },
    },
  });
}

// Kitchen flow: PENDING -> COOKING -> READY; CANCELLED allowed until READY
const VALID_STATUSES = ['PENDING', 'COOKING', 'READY', 'CANCELLED'];
const STATUS_FLOW = {
  PENDING: ['COOKING', 'CANCELLED'],
  COOKING: ['READY', 'CANCELLED'],
  READY: [],
  CANCELLED: [],
};

export async function updateOrderStatus(orderId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`), { status: 400 });
  }
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }
  if (!STATUS_FLOW[existing.status]?.includes(status)) {
    throw Object.assign(new Error(`Cannot move order from ${existing.status} to ${status}`), { status: 409 });
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true, customer: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Fake payment gateway: flips paymentStatus to PAID for the customer's own
 * still-active, still-unpaid order. No real money moves — assessment demo.
 */
export async function payOrder(orderId, customerId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== customerId) {
    throw Object.assign(new Error('Order not found'), { status: 404 });
  }
  if (order.status === 'CANCELLED') {
    throw Object.assign(new Error('Cancelled orders cannot be paid'), { status: 409 });
  }
  if (order.paymentStatus === 'PAID') {
    throw Object.assign(new Error('Order is already paid'), { status: 409 });
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', paidAt: new Date() },
    include: {
      items: { include: { menuItem: { select: { id: true, name: true } } } },
    },
  });
}
