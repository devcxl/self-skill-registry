import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import type { Context } from 'hono';
import { RegistryRepository } from '../db';
import { UserRepository } from '../db-users';
import { getSessionUser } from '../middleware/auth';
import type { User } from '../types/db';
import { Layout } from '../ui/layout';
import { createT, detectLocale } from '../i18n';

const adminUi = new Hono<HonoEnv>();

async function requireLogin(c: Context<HonoEnv>): Promise<User> {
  const user = await getSessionUser(c);
  if (!user) {
    c.redirect('/auth/login');
    throw new Error('redirect');
  }
  return user;
}

async function requireAdmin(c: Context<HonoEnv>): Promise<User> {
  const user = await requireLogin(c);
  if (user.is_admin !== 1) {
    const loginUser = await getSessionUser(c);
    const t = createT(detectLocale(c));
    c.html(
      <Layout title={t('admin.accessDenied')} user={loginUser} t={t}>
        <div class="text-center py-16 max-w-md mx-auto">
          <h1 class="font-display text-display-sm text-ink mb-4">{t('admin.accessDenied')}</h1>
          <p class="text-muted mb-8">{t('admin.noPermission')}</p>
          <a
            href="/"
            class="inline-flex items-center px-5 py-3 bg-canvas text-ink border border-hairline rounded-md text-sm font-medium hover:bg-surface-soft transition-colors"
          >
            {t('error.backHome')}
          </a>
        </div>
      </Layout>,
      403,
    );
    throw new Error('403');
  }
  return user;
}

// ── GET /admin ───────────────────────────────────────────────────────

adminUi.get('/', async (c) => {
  const user = await requireAdmin(c);
  if (!user) return;

  const registry = new RegistryRepository(c.env.DB);
  const userRepo = new UserRepository(c.env.DB);

  const { skills: allSkills } = await registry.listSkills({ includeAll: true });
  const pending = allSkills.filter((s) => s.review_status !== 'approved');
  const users = await userRepo.listUsers();

  const t = createT(detectLocale(c));

  return c.html(
    <Layout title={t('nav.admin')} user={user} t={t}>
      <div class="mb-10">
        <h1 class="font-display text-display-md text-ink mb-2">{t('admin.panel')}</h1>
        <p class="text-muted">{t('admin.manage')}</p>
      </div>

      <section class="mb-12">
        <h2 class="font-display text-display-sm text-ink mb-6">
          {t('admin.pending', { n: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p class="text-muted py-8 text-center bg-surface-soft rounded-lg">{t('admin.noPending')}</p>
        ) : (
          <div class="space-y-3">
            {pending.map((s) => (
              <div class="bg-surface-card rounded-lg p-5 flex items-center justify-between">
                <div>
                  <h3 class="font-sans font-medium text-ink">{s.name}</h3>
                  <p class="text-sm text-muted mt-1">
                    {t('admin.versionScore', { version: s.latest_version, score: s.latest_score })} {' '}
                    <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill bg-accent-amber/15 text-accent-amber">
                      {s.review_status}
                    </span>
                  </p>
                </div>
                <div class="flex gap-2">
                  <form action={`/admin/actions/skills/${s.name}/approve`} method="post">
                    <button
                      type="submit"
                      class="inline-flex items-center px-4 py-2 bg-success text-on-primary text-sm font-medium rounded-md hover:bg-success/85 transition-colors"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={`/admin/actions/skills/${s.name}/reject`} method="post">
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

      <section class="mb-12">
        <h2 class="font-display text-display-sm text-ink mb-6">{t('admin.allSkills')}</h2>
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

      <section>
        <h2 class="font-display text-display-sm text-ink mb-6">Users ({users.length})</h2>
        <div class="bg-surface-card rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-hairline">
                <th class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t('admin.name')}</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t('admin.email')}</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t('admin.provider')}</th>
                <th class="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t('admin.role')}</th>
                <th class="text-right px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr class="border-b border-hairline last:border-0">
                  <td class="px-5 py-3.5 text-ink font-medium">{u.display_name || '—'}</td>
                  <td class="px-5 py-3.5 text-muted">{u.email || '—'}</td>
                  <td class="px-5 py-3.5 text-muted">{u.oidc_provider}</td>
                  <td class="px-5 py-3.5">
                    {u.is_admin ? (
                      <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill bg-success/15 text-success">
                        Admin
                      </span>
                    ) : (
                      <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill bg-surface-cream-strong text-muted">
                        User
                      </span>
                    )}
                  </td>
                  <td class="px-5 py-3.5 text-right">
                    {u.id !== user.id && (
                      <form action={`/admin/actions/users/${u.id}/toggle-admin`} method="post">
                        <button
                          type="submit"
                          class="text-xs font-medium text-primary hover:underline"
                        >
                          {u.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>,
  );
});

// ── POST /admin/actions/skills/:name/approve ─────────────────────────

adminUi.post('/actions/skills/:name/approve', async (c) => {
  const user = await requireAdmin(c);
  if (!user) return;

  const name = c.req.param('name');
  await c.env.DB
    .prepare("UPDATE skills SET review_status = 'approved', updated_at = datetime('now') WHERE name = ?")
    .bind(name)
    .run();

  return c.redirect('/admin');
});

// ── POST /admin/actions/skills/:name/reject ───────────────────────────

adminUi.post('/actions/skills/:name/reject', async (c) => {
  const user = await requireAdmin(c);
  if (!user) return;

  const name = c.req.param('name');
  await c.env.DB
    .prepare("UPDATE skills SET review_status = 'rejected', updated_at = datetime('now') WHERE name = ?")
    .bind(name)
    .run();

  return c.redirect('/admin');
});

// ── POST /admin/actions/users/:id/toggle-admin ────────────────────────

adminUi.post('/actions/users/:id/toggle-admin', async (c) => {
  const user = await requireAdmin(c);
  if (!user) return;

  const userId = c.req.param('id');
  const userRepo = new UserRepository(c.env.DB);
  const target = await userRepo.getUser(userId);

  if (!target) {
    return c.redirect('/admin');
  }

  await userRepo.setAdmin(userId, !target.is_admin);
  return c.redirect('/admin');
});

export default adminUi;