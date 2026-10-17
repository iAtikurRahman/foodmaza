import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { protect, authorize } from '../middleware/auth.js';
import { createOrder, updateOrderStatus, payOrder } from '../services/orderService.js';
import { subscribeToOrders, emitOrderUpdate } from '../services/orderEvents.js';

const router = Router();

// POST /api/orders — any authenticated user can place an order
router.post('/', protect, async (req, res) => {
  const order = await createOrder(req.user.id, req.body?.items);
  emitOrderUpdate(order); // wakes the customer's other open tabs
  res.status(201).json({ order });
});

// GET /api/orders/stream — Server-Sent Events: pushes this customer's order
router.get('/stream', protect, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // never buffer behind a proxy
  });
  res.flushHeaders?.();
  res.write(`event: connected\ndata: {}\n\n`);

  const unsubscribe = subscribeToOrders(req.user.id, res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// GET /api/orders/mine — the logged-in customer's own orders
router.get('/mine', protect, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.user.id },
    include: {
      items: { include: { menuItem: { select: { id: true, name: true } } } },
      review: true, // so the order card can render the review + sentiment badge
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders });
});

// GET /api/orders — ADMIN: all orders (filter: ?status=PENDING)
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
  const { status } = req.query;
  const orders = await prisma.order.findMany({
    where: status ? { status } : {},
    include: {
      customer: { select: { id: true, name: true, email: true } },
      items: { include: { menuItem: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders });
});

// POST /api/orders/:id/pay — FAKE payment gateway: marks the customer's own
router.post('/:id/pay', protect, async (req, res) => {
  const order = await payOrder(req.params.id, req.user.id);
  emitOrderUpdate(order);
  res.json({ order, message: 'Payment successful (fake gateway)' });
});

// PATCH /api/orders/:id/status — ADMIN: PENDING -> COOKING -> READY (+ CANCELLED)
router.patch('/:id/status', protect, authorize('ADMIN'), async (req, res) => {
  const order = await updateOrderStatus(req.params.id, req.body?.status);
  emitOrderUpdate(order); // customer's "My Orders" page updates live
  res.json({ order });
});

export default router;
