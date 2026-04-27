import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';
import { setSessionCookie, clearSessionCookie, getSessionUserId } from '../middleware/auth';

const auth = new Hono<HonoEnv>();

// ── GET /auth/login ──────────────────────────────────────────────────

auth.get('/login', (c) => {
  return c.html(`
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Login — Skill Registry</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full">
        <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Skill Registry</h1>
        <p class="text-gray-600 mb-6 text-center">Sign in to manage your skills and API tokens.</p>
        <a href="/auth/login/github"
          class="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition">
          Sign in with GitHub
        </a>
      </div>
    </body>
    </html>
  `);
});

// ── GET /auth/login/github ────────────────────────────────────────────

auth.get('/login/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'GitHub OAuth not configured', code: 'CONFIG_ERROR' }, 500);
  }

  const redirectUri = `${new URL(c.req.url).origin}/auth/callback/github`;
  const state = crypto.randomUUID();

  // Store state for CSRF protection (simple in-memory, use KV in production)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── GET /auth/callback/github ─────────────────────────────────────────

auth.get('/callback/github', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'Missing authorization code', code: 'OAUTH_ERROR' }, 400);
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return c.json({ error: 'GitHub OAuth not configured', code: 'CONFIG_ERROR' }, 500);
  }

  // Exchange code for access token
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (tokenData.error || !tokenData.access_token) {
      return c.json({ error: 'GitHub OAuth token exchange failed', code: 'OAUTH_ERROR' }, 400);
    }
    accessToken = tokenData.access_token;
  } catch {
    return c.json({ error: 'Failed to reach GitHub API', code: 'NETWORK_ERROR' }, 502);
  }

  // Get user info from GitHub
  let githubUser: { id: number; login: string; name?: string; email?: string };
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'skill-registry' },
    });
    githubUser = await userRes.json() as typeof githubUser;
  } catch {
    return c.json({ error: 'Failed to fetch GitHub user info', code: 'NETWORK_ERROR' }, 502);
  }

  // Get email if not in profile
  let email = githubUser.email;
  if (!email) {
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'skill-registry' },
      });
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean }>;
      const primary = emails.find((e) => e.primary);
      email = primary?.email;
    } catch {
      // Non-critical
    }
  }

  // Find or create user
  const repo = new UserRepository(c.env.DB);
  const user = await repo.findOrCreateUser({
    provider: 'github',
    sub: String(githubUser.id),
    displayName: githubUser.name || githubUser.login,
    email: email || undefined,
  });

  // Set session cookie
  setSessionCookie(c, user.id);

  // Redirect to settings page
  return c.redirect('/settings');
});

// ── GET /auth/logout ──────────────────────────────────────────────────

auth.get('/logout', (c) => {
  clearSessionCookie(c);
  return c.redirect('/');
});

// ── GET /auth/me ─────────────────────────────────────────────────────

auth.get('/me', async (c) => {
  const userId = getSessionUserId(c);
  if (!userId) {
    return c.json({ error: 'Not authenticated', code: 'UNAUTHORIZED' }, 401);
  }

  const repo = new UserRepository(c.env.DB);
  const user = await repo.getUser(userId);
  if (!user) {
    return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json({
    id: user.id,
    displayName: user.display_name,
    email: user.email,
    isAdmin: !!user.is_admin,
    provider: user.oidc_provider,
  });
});

export default auth;
