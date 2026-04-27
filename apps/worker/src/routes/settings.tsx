import { Hono } from 'hono';
import type { Context } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';
import { getSessionUserId } from '../middleware/auth';
import { Layout } from '../ui/layout';

const settings = new Hono<HonoEnv>();

/** Require login — returns user or null */
async function requireUser(c: Context<HonoEnv>) {
  const userId = getSessionUserId(c);
  if (!userId) return null;
  const repo = new UserRepository(c.env.DB);
  return repo.getUser(userId);
}

// ── GET /settings ─────────────────────────────────────────────────────

settings.get('/', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.redirect('/auth/login');

  const repo = new UserRepository(c.env.DB);
  const tokens = await repo.listTokens(user.id);

  return c.html(
    <Layout title="Settings">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
          <dl class="space-y-2">
            <div><dt class="text-sm text-gray-500">Name</dt><dd class="text-gray-900">{user.display_name || '—'}</dd></div>
            <div><dt class="text-sm text-gray-500">Email</dt><dd class="text-gray-900">{user.email || '—'}</dd></div>
            <div><dt class="text-sm text-gray-500">Provider</dt><dd class="text-gray-900">{user.oidc_provider}</dd></div>
            {!!user.is_admin && <div><dt class="text-sm text-gray-500">Role</dt><dd class="text-green-700 font-medium">Admin</dd></div>}
          </dl>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">API Tokens</h2>
          {tokens.length === 0 ? (
            <p class="text-gray-500 mb-4">No tokens yet.</p>
          ) : (
            <ul class="space-y-2 mb-4">
              {tokens.map((t) => (
                <li class="flex items-center justify-between py-2 border-b text-sm">
                  <span class="font-medium">{t.label}</span>
                  <form action="/settings/tokens/delete" method="post">
                    <input type="hidden" name="tokenId" value={t.id} />
                    <button type="submit" class="text-red-600 hover:text-red-800">Revoke</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action="/settings/tokens/create" method="post" class="flex gap-2">
            <input type="text" name="label" value="default" placeholder="Label"
              class="flex-grow px-3 py-2 border rounded-lg text-sm" />
            <button type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Create
            </button>
          </form>
        </div>

        <a href="/auth/logout" class="text-red-600 hover:underline text-sm">Sign Out</a>
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

  return c.html(
    <Layout title="Token Created">
      <div class="max-w-2xl mx-auto text-center py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Token Created</h1>
        <p class="text-red-600 font-semibold mb-4">
          ⚠️ Copy this token now. It will not be shown again.
        </p>
        <pre class="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto mb-6 mx-auto max-w-xl">
          {token}
        </pre>
        <a href="/settings" class="text-blue-600 hover:underline">← Back to Settings</a>
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
