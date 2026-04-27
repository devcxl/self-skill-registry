import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { RegistryRepository } from '../db';
import { toReviewResponse } from '../types/db';

const reviews = new Hono<HonoEnv>();

// ── GET /v1/reviews/:id ───────────────────────────────────────────────

reviews.get('/:id', async (c) => {
  const id = c.req.param('id');
  const repo = new RegistryRepository(c.env.DB);
  const review = await repo.getReview(id);

  if (!review) {
    return c.json({ error: `Review not found: ${id}`, code: 'NOT_FOUND' }, 404);
  }

  return c.json(toReviewResponse(review));
});

export default reviews;
