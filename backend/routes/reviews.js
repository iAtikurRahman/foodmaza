import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { protect, authorize } from '../middleware/auth.js';
import { analyzeSentiment, analyzeSentimentBatch } from '../services/aiService.js';

const router = Router();

function validateText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return 'Field "text" (a non-empty string) is required';
  }
  if (text.trim().length > 2000) {
    return 'Review text is limited to 2000 characters';
  }
  return null;
}

// POST /api/reviews — authenticated customer leaves a review.
router.post('/', protect, async (req, res) => {
  const { text, orderId } = req.body ?? {};
  const textError = validateText(text);
  if (textError) return res.status(400).json({ error: textError });

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: { select: { id: true } } },
    });
    if (!order || order.customerId !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'READY') {
      return res.status(409).json({ error: 'You can review an order once it is READY' });
    }
    if (order.review) {
      return res.status(409).json({ error: 'You already reviewed this order — update it instead' });
    }
  }

  // Local AI inference — no external API, runs inside this Node process
  const sentiment = await analyzeSentiment(text);

  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      orderId: orderId ?? null,
      text: text.trim(),
      sentiment: sentiment.label,
      score: sentiment.score,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json({ review });
});

// PUT /api/reviews/:id — the author updates their review's text;
router.put('/:id', protect, async (req, res) => {
  const { text } = req.body ?? {};
  const textError = validateText(text);
  if (textError) return res.status(400).json({ error: textError });

  const existing = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const sentiment = await analyzeSentiment(text);
  const review = await prisma.review.update({
    where: { id: existing.id },
    data: { text: text.trim(), sentiment: sentiment.label, score: sentiment.score },
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ review });
});

// GET /api/reviews — ADMIN: every review with its AI sentiment (dashboard feed)
router.get('/', protect, authorize('ADMIN'), async (req, res) => {
  const { sentiment } = req.query;
  const reviews = await prisma.review.findMany({
    where: sentiment ? { sentiment } : {},
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, status: true, total: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ reviews });
});

// GET /api/reviews/stats — ADMIN: sentiment counts for dashboard widgets
router.get('/stats', protect, authorize('ADMIN'), async (_req, res) => {
  const grouped = await prisma.review.groupBy({ by: ['sentiment'], _count: true });
  const stats = { POSITIVE: 0, NEGATIVE: 0, UNKNOWN: 0 };
  for (const g of grouped) {
    const key = g.sentiment === 'POSITIVE' || g.sentiment === 'NEGATIVE' ? g.sentiment : 'UNKNOWN';
    stats[key] = g._count;
  }
  const total = stats.POSITIVE + stats.NEGATIVE + stats.UNKNOWN;
  res.json({ stats, total });
});

// POST /api/reviews/analyze  
router.post('/analyze', async (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Field "text" (a non-empty string) is required' });
  }
  const sentiment = await analyzeSentiment(text);
  res.json({ text, sentiment });
});

// POST /api/reviews/analyze-batch  
router.post('/analyze-batch', async (req, res) => {
  const { texts } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0 || !texts.every((t) => typeof t === 'string' && t.trim())) {
    return res.status(400).json({ error: 'Field "texts" must be a non-empty array of non-empty strings' });
  }
  const sentiments = await analyzeSentimentBatch(texts);
  res.json({ count: texts.length, sentiments });
});

export default router;
