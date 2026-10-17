import { EventEmitter } from 'node:events';
const bus = new EventEmitter();
bus.setMaxListeners(0); // many browser tabs = many listeners, all legit

// Subscribe a customer's SSE response. Returns an unsubscribe function.
export function subscribeToOrders(customerId, res) {
  const handler = (payload) => {
    if (payload.customerId !== customerId) return;
    res.write(`event: order\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  bus.on('order-update', handler);
  return () => bus.off('order-update', handler);
}

// Broadcast an order fact to that order's customer (call after DB writes).
export function emitOrderUpdate(order) {
  bus.emit('order-update', {
    orderId: order.id,
    customerId: order.customerId,
    status: order.status,
    paymentStatus: order.paymentStatus,
  });
}
