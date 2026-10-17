import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { protect } from '../middleware/auth.js';
import { recommendFromHistory } from '../services/aiRecommendation.js';

const router = Router();
const TOP_K = 3;

// GET /api/recommendations — AI "Suggested for You" for logged-in customers.
router.get('/', protect, async (req, res) => {
  const menuItems = await prisma.menuItem.findMany({ where: { available: true } });

  // Purchase history: line items of every order except cancelled ones
  const history = await prisma.orderItem.findMany({
    where: { order: { customerId: req.user.id, status: { not: 'CANCELLED' } } },
    include: { menuItem: true },
  });

  if (history.length > 0) {
    // Collapse repeat purchases of the same dish into one quantity-weighted entry
    const byItem = new Map();
    for (const line of history) {
      const prev = byItem.get(line.menuItemId);
      byItem.set(line.menuItemId, {
        menuItem: line.menuItem,
        menuItemId: line.menuItemId,
        quantity: (prev?.quantity ?? 0) + line.quantity,
      });
    }

    const recs = await recommendFromHistory([...byItem.values()], menuItems, TOP_K);
    return res.json({
      strategy: 'similarity',
      items: recs.map((r) => ({ ...r.item, similarity: Number(r.similarity.toFixed(4)) })),
    });
  }

  // Cold start: no history -> most-ordered dishes, else the head of the menu
  const best = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: TOP_K,
  });
  const bestIds = new Set(best.map((b) => b.menuItemId));
  const fallback = [
    ...menuItems.filter((m) => bestIds.has(m.id)),
    ...menuItems.filter((m) => !bestIds.has(m.id)),
  ].slice(0, TOP_K);

  res.json({ strategy: 'bestsellers', items: fallback });
});

export default router;
