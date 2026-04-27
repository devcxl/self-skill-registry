import { Hono } from 'hono';
import type { HonoEnv } from './types/bindings';
import { RegistryRepository } from './db';
import { toReviewResponse } from './types/db';
import skills from './routes/skills';
import reviews from './routes/reviews';
import search from './routes/search';
import download from './routes/download';

const app = new Hono<HonoEnv>();

// ── Health Check ──────────────────────────────────────────────────────

app.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').run();
    return c.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return c.json(
      { status: 'error', db: 'disconnected', message: String(err) },
      503,
    );
  }
});

// ── API v1 Routes ─────────────────────────────────────────────────────

const v1 = new Hono<HonoEnv>();

v1.route('/skills', skills);
v1.route('/skills', download);
v1.route('/reviews', reviews);
v1.route('/search', search);

// Reviews for a specific skill
v1.get('/skills/:name/reviews', async (c) => {
  const name = c.req.param('name');
  const repo = new RegistryRepository(c.env.DB);
  const reviewList = await repo.listReviews(name);
  return c.json(reviewList.map(toReviewResponse));
});

app.route('/v1', v1);

// ── 404 ───────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
});

// ── Error Handler ─────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    500,
  );
});

export default app;
