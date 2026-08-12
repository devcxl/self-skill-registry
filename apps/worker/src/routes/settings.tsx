import { Hono } from 'hono';
import type { Context } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';
import { getSessionUser } from '../middleware/auth';
import { Layout } from '../ui/layout';
import { createT, detectLocale } from '../i18n';

const settings = new Hono<HonoEnv>();

/** Require login — returns user or null */
async function requireUser(c: Context<HonoEnv>) {
  return getSessionUser(c);
}

// ── GET /settings ─────────────────────────────────────────────────────

settings.get('/', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.redirect('/auth/login');

  const repo = new UserRepository(c.env.DB);
  const tokens = await repo.listTokens(user.id);

  const t = createT(detectLocale(c));

  return c.html(
    <Layout title={t('nav.settings')} user={user} t={t}>
      <div class="max-w-2xl mx-auto">
        <h1 class="font-display text-display-md text-ink mb-10">{t('settings.accountSettings')}</h1>

        {/* ── Profile Card ──────────────────────────── */}
        <div class="bg-surface-card rounded-lg p-8 mb-6">
          <h2 class="font-sans text-lg font-medium text-ink mb-6">{t('settings.profile')}</h2>
          <dl class="space-y-4">
            <div>
              <dt class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('settings.name')}</dt>
              <dd class="text-bodycopy">{user.display_name || '—'}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('settings.email')}</dt>
              <dd class="text-bodycopy">{user.email || '—'}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('settings.provider')}</dt>
              <dd class="text-bodycopy">{user.oidc_provider}</dd>
            </div>
            {!!user.is_admin && (
              <div>
                <dt class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{t('settings.role')}</dt>
                <dd class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-pill bg-success/15 text-success">
                  Admin
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ── API Tokens Card ───────────────────────── */}
        <div class="bg-surface-card rounded-lg p-8 mb-6">
          <h2 class="font-sans text-lg font-medium text-ink mb-6">{t('settings.apiTokens')}</h2>
          {tokens.length === 0 ? (
            <p class="text-muted mb-6">{t('settings.noTokens')}</p>
          ) : (
            <ul class="space-y-0 mb-6">
              {tokens.map((t) => (
                <li class="flex items-center justify-between py-3 border-b border-hairline text-sm">
                  <span class="font-medium text-ink">{t.label}</span>
                  <form action="/settings/tokens/delete" method="post">
                    <input type="hidden" name="tokenId" value={t.id} />
                    <button
                      type="submit"
                      class="text-error text-sm font-medium hover:underline"
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action="/settings/tokens/create" method="post" class="flex gap-3">
            <input
              type="text"
              name="label"
              value="default"
              placeholder={t('settings.label')}
              class="flex-grow px-3.5 py-2.5 bg-canvas text-ink text-sm border border-hairline rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow"
            />
            <button
              type="submit"
              class="inline-flex items-center px-5 py-2.5 bg-primary text-on-primary rounded-md text-sm font-medium hover:bg-primary-active transition-colors"
            >
              Create
            </button>
          </form>
        </div>

        <a
          href="/auth/logout"
          class="inline-flex items-center text-error text-sm font-medium hover:underline"
        >
          Sign Out
        </a>
      </div>
    </Layout>,
  );
});

// ── POST /settings/tokens/create ──────────────────────────────────────

settings.post('/tokens/create', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.redirect('/auth/login');

  const form = await c.req.parseBody<{ label?: string }>();
  const repo = new UserRepository(c.env.DB);
  const { token } = await repo.createToken(user.id, form.label || 'default');

  const t = createT(detectLocale(c));

  return c.html(
    <Layout title={t('settings.tokenCreated')} user={user} t={t}>
      <div class="max-w-lg mx-auto text-center py-12">
        <h1 class="font-display text-display-sm text-ink mb-4">{t('settings.tokenCreated')}</h1>
        <p class="text-error font-medium text-sm mb-6">
          {t('settings.tokenCopyWarning')}
        </p>
        <div class="bg-surface-dark rounded-lg p-5 mb-8">
          <pre class="text-on-dark text-sm font-mono overflow-x-auto leading-relaxed">
            {token}
          </pre>
        </div>
        <a
          href="/settings"
          class="inline-flex items-center px-5 py-3 bg-canvas text-ink border border-hairline rounded-md text-sm font-medium hover:bg-surface-soft transition-colors"
        >
          ← Back to Settings
        </a>
      </div>
    </Layout>,
  );
});

// ── POST /settings/tokens/delete ──────────────────────────────────────

settings.post('/tokens/delete', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.redirect('/auth/login');

  const form = await c.req.parseBody<{ tokenId?: string }>();
  if (form.tokenId) {
    const repo = new UserRepository(c.env.DB);
    await repo.deleteToken(form.tokenId, user.id);
  }

  return c.redirect('/settings');
});

export default settings;
