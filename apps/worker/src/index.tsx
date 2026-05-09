import { Hono } from 'hono';
import type { HonoEnv } from './types/bindings';
import { RegistryRepository } from './db';
import { UserRepository } from './db-users';
import { toReviewResponse, toSkillResponse } from './types/db';
import { getSessionUser } from './middleware/auth';
import skills from './routes/skills';
import reviews from './routes/reviews';
import search from './routes/search';
import download from './routes/download';
import auth from './routes/auth';
import settings from './routes/settings';
import admin from './routes/admin';
import adminUi from './routes/admin-ui';
import { HomePage, SkillsPage, SkillDetailPage, ErrorPage } from './ui/pages';

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

// ── Auth Routes ───────────────────────────────────────────────────────

app.route('/auth', auth);

// ── Settings (token management) ───────────────────────────────────────

app.route('/settings', settings);

// ── Admin UI Page ─────────────────────────────────────────────────────

app.route('/admin', adminUi);

// ── Admin API ─────────────────────────────────────────────────────────

app.route('/admin', admin);

// ── Web UI Routes ────────────────────────────────────────────────────

app.get('/', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const { skills: list } = await repo.listSkills();
  const skillList = list.map(toSkillResponse);
  const user = await getSessionUser(c);
  return c.html(<HomePage skills={skillList} user={user} />);
});

app.get('/skills', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const q = c.req.query('q');
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = 18;
  const user = await getSessionUser(c);

  if (q) {
    const result = await repo.search({ q, page, perPage });
    const skillList = result.skills.map(toSkillResponse);
    return c.html(
      <SkillsPage skills={skillList} total={result.total} query={{ q, page, perPage }} user={user} />,
    );
  }

  const result = await repo.listSkills({ page, perPage });
  const skillList = result.skills.map(toSkillResponse);
  return c.html(
    <SkillsPage skills={skillList} total={result.total} query={{ page, perPage }} user={user} />,
  );
});

app.get('/skills/:name', async (c) => {
  const name = c.req.param('name');
  const repo = new RegistryRepository(c.env.DB);
  const skill = await repo.getSkill(name);
  const user = await getSessionUser(c);

  if (!skill || skill.review_status !== 'approved') {
    return c.html(
      <ErrorPage title="Skill Not Found" message={`Skill "${name}" is not available.`} user={user} />,
      404,
    );
  }

  const skillResp = toSkillResponse(skill);
  return c.html(<SkillDetailPage skill={skillResp} user={user} />);
});

// ── API v1 Routes ─────────────────────────────────────────────────────

const v1 = new Hono<HonoEnv>();

v1.route('/skills', skills);
v1.route('/skills', download);
v1.route('/reviews', reviews);
v1.route('/search', search);

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
