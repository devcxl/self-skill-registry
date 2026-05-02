import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';
import { setSessionCookie, clearSessionCookie, getSessionUserId } from '../middleware/auth';

const auth = new Hono<HonoEnv>();

// ── GET /auth/login ──────────────────────────────────────────────────

auth.get('/login', (c) => {
  return c.html(
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Login — Skill Registry</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600&family=Inter:ital,opsz,wght@0,14..32,400..600&family=JetBrains+Mono:ital,wght@0,400;0,500&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
tailwind.config = {
  theme: {
    extend: {
      colors: {
        canvas: '#faf9f5',
        primary: { DEFAULT: '#cc785c', active: '#a9583e', disabled: '#e6dfd8' },
        ink: '#141413',
        bodycopy: '#3d3d3a',
        'body-strong': '#252523',
        muted: '#6c6a64',
        'muted-soft': '#8e8b82',
        hairline: '#e6dfd8',
        'hairline-soft': '#ebe6df',
        'surface-soft': '#f5f0e8',
        'surface-card': '#efe9de',
        'surface-cream-strong': '#e8e0d2',
        'surface-dark': '#181715',
        'surface-dark-elevated': '#252320',
        'surface-dark-soft': '#1f1e1b',
        'on-primary': '#ffffff',
        'on-dark': '#faf9f5',
        'on-dark-soft': '#a09d96',
        'accent-teal': '#5db8a6',
        'accent-amber': '#e8a55a',
        success: '#5db872',
        error: '#c64545',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"EB Garamond"', 'Garamond', '"Times New Roman"', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '400' }],
        'display-lg': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '400' }],
        'display-md': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-sm': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
      },
    },
  },
}
            `.trim(),
          }}
        />
      </head>
      <body class="bg-canvas text-bodycopy min-h-screen flex items-center justify-center font-sans antialiased">
        <div class="bg-surface-card rounded-lg p-8 max-w-md w-full mx-4">
          <div class="flex items-center justify-center gap-2.5 mb-6">
            <svg
              class="h-5 w-5 text-ink shrink-0"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="8" cy="8" r="2.5" fill="currentColor" />
              <path d="M8 0.5V5.5M8 10.5V15.5M0.5 8H5.5M10.5 8H15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <h1 class="font-display text-2xl tracking-tight text-ink">Skill Registry</h1>
          </div>
          <p class="text-muted text-sm mb-8 text-center leading-relaxed">
            Sign in to manage your skills and API tokens.
          </p>
          <a
            href="/auth/login/github"
            class="block w-full text-center px-5 py-3 bg-surface-dark text-on-dark rounded-md text-sm font-medium hover:bg-surface-dark-elevated transition-colors"
          >
            Sign in with GitHub
          </a>
        </div>
      </body>
    </html>,
  );
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
