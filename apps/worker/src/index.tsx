import { Hono } from 'hono';
import type { HonoEnv } from './types/bindings';
import { RegistryRepository } from './db';
import { toReviewResponse, toSkillResponse } from './types/db';
import skills from './routes/skills';
import reviews from './routes/reviews';
import search from './routes/search';
import download from './routes/download';
import auth from './routes/auth';
import settings from './routes/settings';
import admin from './routes/admin';
import { HomePage, SkillsPage, SkillDetailPage, ErrorPage } from './ui/pages';
import { Layout } from './ui/layout';

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

// ── Admin API ─────────────────────────────────────────────────────────

app.route('/admin', admin);

// ── Admin UI Page ─────────────────────────────────────────────────────

app.get('/admin', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const { skills: allSkills } = await repo.listSkills({ includeAll: true });
  const pending = allSkills.filter((s) => s.review_status !== 'approved');

  return c.html(
    <Layout title="Admin">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p class="text-gray-600">Manage skills and users</p>
      </div>

      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          Pending / Non-Approved Skills ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p class="text-gray-500">No pending skills.</p>
        ) : (
          <div class="space-y-3">
            {pending.map((s) => (
              <div class="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-gray-900">{s.name}</h3>
                  <p class="text-sm text-gray-500">
                    v{s.latest_version} · Score: {s.latest_score} · Status:{' '}
                    <span class="font-medium text-yellow-600">{s.review_status}</span>
                  </p>
                </div>
                <div class="flex gap-2">
                  <form action={`/admin/skills/${s.name}/approve`} method="post">
                    <button type="submit" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                      Approve
                    </button>
                  </form>
                  <form action={`/admin/skills/${s.name}/reject`} method="post">
                    <button type="submit" class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 class="text-xl font-semibold text-gray-800 mb-4">All Skills</h2>
        <div class="space-y-2">
          {allSkills.map((s) => (
            <div class="bg-white rounded shadow-sm border p-3 flex items-center justify-between">
              <div>
                <a href={`/skills/${s.name}`} class="font-medium text-gray-900 hover:text-blue-600">
                  {s.name}
                </a>
                <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {s.review_status}
                </span>
              </div>
              <span class="text-sm text-gray-500">v{s.latest_version}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>,
  );
});

// ── Web UI Routes ────────────────────────────────────────────────────

app.get('/', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const { skills: list } = await repo.listSkills();
  const skillList = list.map(toSkillResponse);
  return c.html(<HomePage skills={skillList} />);
});

app.get('/skills', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const q = c.req.query('q');
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = 18;

  if (q) {
    const result = await repo.search({ q, page, perPage });
    const skillList = result.skills.map(toSkillResponse);
    return c.html(
      <SkillsPage skills={skillList} total={result.total} query={{ q, page, perPage }} />,
    );
  }

  const result = await repo.listSkills({ page, perPage });
  const skillList = result.skills.map(toSkillResponse);
  return c.html(
    <SkillsPage skills={skillList} total={result.total} query={{ page, perPage }} />,
  );
});

app.get('/skills/:name', async (c) => {
  const name = c.req.param('name');
  const repo = new RegistryRepository(c.env.DB);
  const skill = await repo.getSkill(name);

  if (!skill || skill.review_status !== 'approved') {
    return c.html(
      <ErrorPage title="Skill Not Found" message={`Skill "${name}" is not available.`} />,
      404,
    );
  }

  const skillResp = toSkillResponse(skill);
  return c.html(<SkillDetailPage skill={skillResp} />);
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
