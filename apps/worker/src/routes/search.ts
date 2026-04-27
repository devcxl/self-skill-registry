import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { RegistryRepository } from '../db';
import { toSkillResponse } from '../types/db';
import type { PaginatedResponse } from './types';

const search = new Hono<HonoEnv>();

// ── GET /v1/search ────────────────────────────────────────────────────

search.get('/', async (c) => {
  const repo = new RegistryRepository(c.env.DB);

  const query = {
    q: c.req.query('q'),
    category: c.req.query('category'),
    compat: c.req.query('compat'),
    sort: c.req.query('sort'),
    page: parseInt(c.req.query('page') || '1', 10),
    perPage: Math.min(parseInt(c.req.query('perPage') || '20', 10), 100),
  };

  const { skills: list, total } = await repo.search(query);

  const response: PaginatedResponse<unknown> = {
    data: list.map(toSkillResponse),
    total,
    page: query.page,
    perPage: query.perPage,
    totalPages: Math.ceil(total / query.perPage),
  };

  return c.json(response);
});

export default search;
