import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/menu — public: customers browse available items  or all=true (admin) also includes unavailable items
router.get('/', async (req, res) => {
  const items = await prisma.menuItem.findMany({
    where: req.query.all === 'true' ? {} : { available: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json({ items });
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  res.json({ item });
});

// POST /api/menu — ADMIN only
router.post('/', protect, authorize('ADMIN'), async (req, res) => {
  const { name, description, price, category, available } = req.body ?? {};
  if (!name?.trim() || price == null || Number.isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: 'name and a non-negative numeric price are required' });
  }
  const item = await prisma.menuItem.create({
    data: {
      name: String(name).trim(),
      description: description ? String(description) : null,
      price: Number(price),
      category: category ? String(category) : null,
      available: available ?? true,
    },
  });
  res.status(201).json({ item });
});

// PUT /api/menu/:id — ADMIN only
router.put('/:id', protect, authorize('ADMIN'), async (req, res) => {
  const { name, description, price, category, available } = req.body ?? {};
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (description !== undefined) data.description = description ? String(description) : null;
  if (price !== undefined) {
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    data.price = Number(price);
  }
  if (category !== undefined) data.category = category ? String(category) : null;
  if (available !== undefined) data.available = Boolean(available);

  try {
    const item = await prisma.menuItem.update({ where: { id: req.params.id }, data });
    res.json({ item });
  } catch {
    res.status(404).json({ error: 'Menu item not found' });
  }
});

// DELETE /api/menu/:id — ADMIN only
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    // 400 = referenced by order items (Restrict), 404 = does not exist
    res.status(404).json({ error: 'Menu item not found (or already part of an order)' });
  }
});

export default router;
