import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { RegistryRepository } from '../db';
import { toSkillResponse, toVersionResponse } from '../types/db';
import type { PaginatedResponse } from './types';

const skills = new Hono<HonoEnv>();

// ── GET /v1/index.json ────────────────────────────────────────────────

skills.get('/index.json', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const { skills: list } = await repo.listSkills();

  const response = {
    generatedAt: new Date().toISOString(),
    skills: list.map(toSkillResponse),
    total: list.length,
  };

  c.header('Cache-Control', 'public, max-age=60');
  return c.json(response);
});

// ── GET /v1/skills ────────────────────────────────────────────────────

skills.get('/', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = Math.min(parseInt(c.req.query('perPage') || '20', 10), 100);

  const { skills: list, total } = await repo.listSkills({ page, perPage });

  const response: PaginatedResponse<unknown> = {
    data: list.map(toSkillResponse),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };

  return c.json(response);
});

// ── GET /v1/skills/:name ──────────────────────────────────────────────

skills.get('/:name', async (c) => {
  const name = c.req.param('name');
  const repo = new RegistryRepository(c.env.DB);
  const skill = await repo.getSkill(name);

  if (!skill) {
    return c.json({ error: `Skill not found: ${name}`, code: 'NOT_FOUND' }, 404);
  }

  // Only show approved skills to regular users
  if (skill.review_status !== 'approved' || skill.lifecycle_status !== 'active') {
    return c.json({ error: `Skill not available: ${name}`, code: 'NOT_FOUND' }, 404);
  }

  c.header('Cache-Control', 'public, max-age=60');
  return c.json(toSkillResponse(skill));
});

// ── GET /v1/skills/:name/versions ─────────────────────────────────────

skills.get('/:name/versions', async (c) => {
  const name = c.req.param('name');
  const repo = new RegistryRepository(c.env.DB);
  const versions = await repo.listVersions(name);

  return c.json(versions.map(toVersionResponse));
});

export default skills;
