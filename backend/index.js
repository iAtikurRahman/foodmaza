import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---- global middleware ----
app.use(helmet()); // security headers
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5000' }));
app.use(express.json({ limit: '1mb' }));

// Generous global limiter (protects against accidental loops / scrapers)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false }));

// Strict limiter on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many auth attempts — try again in 15 minutes' },
});

// request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// ---- routes ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// ---- 404 + error handling ----
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Express 5 forwards rejected promises from async handlers here automatically
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Foodmaza API listening on http://localhost:${PORT}`);
});
