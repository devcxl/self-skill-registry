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
      <div class="mb-10">
        <h1 class="font-display text-display-md text-ink mb-2">Admin Panel</h1>
        <p class="text-muted">Manage skills and users</p>
      </div>

      <section class="mb-12">
        <h2 class="font-display text-display-sm text-ink mb-6">
          Pending / Non-Approved Skills ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p class="text-muted py-8 text-center bg-surface-soft rounded-lg">No pending skills.</p>
        ) : (
          <div class="space-y-3">
            {pending.map((s) => (
              <div class="bg-surface-card rounded-lg p-5 flex items-center justify-between">
                <div>
                  <h3 class="font-sans font-medium text-ink">{s.name}</h3>
                  <p class="text-sm text-muted mt-1">
                    v{s.latest_version} · Score: {s.latest_score} · Status:{' '}
                    <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill bg-accent-amber/15 text-accent-amber">
                      {s.review_status}
                    </span>
                  </p>
                </div>
                <div class="flex gap-2">
                  <form action={`/admin/skills/${s.name}/approve`} method="post">
                    <button
                      type="submit"
                      class="inline-flex items-center px-4 py-2 bg-success text-on-primary text-sm font-medium rounded-md hover:bg-success/85 transition-colors"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={`/admin/skills/${s.name}/reject`} method="post">
                    <button
                      type="submit"
                      class="inline-flex items-center px-4 py-2 bg-[#b04545] text-on-primary text-sm font-medium rounded-md hover:bg-[#a03a3a] transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 class="font-display text-display-sm text-ink mb-6">All Skills</h2>
        <div class="space-y-2">
          {allSkills.map((s) => (
            <div class="bg-surface-card rounded-lg p-4 flex items-center justify-between">
              <div>
                <a
                  href={`/skills/${s.name}`}
                  class="font-sans font-medium text-ink hover:text-primary transition-colors"
                >
                  {s.name}
                </a>
                <span class="ml-2.5 inline-flex items-center px-2.5 py-0.5 text-xs rounded-pill bg-canvas text-muted">
                  {s.review_status}
                </span>
              </div>
              <span class="text-sm text-muted">v{s.latest_version}</span>
            </div>
          ))}
        </div>
      </section>
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
