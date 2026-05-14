import { afterEach, describe, it, expect, vi } from 'vitest';
import auth from './auth';
import type { HonoEnv } from '../types/bindings';
import type { User } from '../types/db';
import { SESSION_COOKIE } from '../middleware/auth';

const OAUTH_STATE_COOKIE = 'skill_registry_oauth_state';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createMemoryKV(): { namespace: KVNamespace; store: Map<string, string> } {
  const store = new Map<string, string>();
  const namespace = {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  } as unknown as KVNamespace;

  return { namespace, store };
}

function createUserDb(user: User): D1Database {
  const users = new Map([[user.id, user]]);

  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>(): Promise<T | null> {
              if (sql.includes('WHERE oidc_provider = ? AND oidc_sub = ?')) {
                const [provider, sub] = args;
                return [...users.values()].find((u) => u.oidc_provider === provider && u.oidc_sub === sub) as T | undefined ?? null;
              }
              if (sql.includes('WHERE id = ?')) {
                return users.get(String(args[0])) as T | undefined ?? null;
              }
              return null;
            },
            async run(): Promise<{ success: boolean }> {
              return { success: true };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}

function createEnv(kv: KVNamespace): HonoEnv['Bindings'] {
  return {
    DB: createUserDb({
      id: 'user-1',
      oidc_provider: 'github',
      oidc_sub: '123',
      display_name: 'Existing User',
      email: null,
      is_admin: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }),
    R2: {} as R2Bucket,
    AUTH_CACHE: kv,
    GITHUB_CLIENT_ID: 'client-id',
    GITHUB_CLIENT_SECRET: 'client-secret',
  };
}

function cookiePair(setCookie: string, name: string): string {
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  if (!match) throw new Error(`Missing ${name} cookie`);
  return `${name}=${match[1]}`;
}

async function startLogin(env: HonoEnv['Bindings']): Promise<{
  location: URL;
  state: string;
  cookie: string;
  setCookie: string;
}> {
  const res = await auth.request('http://localhost/login/github', {}, env);
  const locationHeader = res.headers.get('Location');
  if (!locationHeader) throw new Error('Missing redirect location');
  const location = new URL(locationHeader);
  const state = location.searchParams.get('state');
  if (!state) throw new Error('Missing state');
  const setCookie = res.headers.get('Set-Cookie') ?? '';

  return {
    location,
    state,
    cookie: cookiePair(setCookie, OAUTH_STATE_COOKIE),
    setCookie,
  };
}

function stubGitHubFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url === 'https://github.com/login/oauth/access_token') {
      const body = JSON.parse(String(init?.body)) as Record<string, string>;
      if (!body.code_verifier || !body.redirect_uri) {
        return json({ error: 'missing_pkce' }, 400);
      }
      return json({ access_token: 'github-token' });
    }

    if (url === 'https://api.github.com/user') {
      return json({ id: 123, login: 'octocat', name: 'Octocat', email: null });
    }

    if (url === 'https://api.github.com/user/emails') {
      return json([{ email: 'octo@example.com', primary: true }]);
    }

    return json({ error: 'unexpected_url' }, 500);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHub auth routes', () => {
  it('starts OAuth with stored state and PKCE challenge', async () => {
    const kv = createMemoryKV();
    const login = await startLogin(createEnv(kv.namespace));

    expect(login.location.origin).toBe('https://github.com');
    expect(login.location.pathname).toBe('/login/oauth/authorize');
    expect(login.location.searchParams.get('client_id')).toBe('client-id');
    expect(login.location.searchParams.get('response_type')).toBe('code');
    expect(login.location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(login.location.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(login.setCookie).toContain(`${OAUTH_STATE_COOKIE}=`);
    expect(login.setCookie).toContain('HttpOnly');
    expect(login.setCookie).toContain('SameSite=Lax');
    expect(login.setCookie).toContain('Path=/auth/callback/github');
    expect([...kv.store.keys()].filter((key) => key.startsWith('oauth_state:'))).toHaveLength(1);
  });

  it('returns 503 when OAuth state cannot be stored', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const namespace = {
      async get(): Promise<string | null> {
        return null;
      },
      async put(): Promise<void> {
        throw new Error('KV unavailable');
      },
      async delete(): Promise<void> {},
    } as unknown as KVNamespace;

    const res = await auth.request('http://localhost/login/github', {}, createEnv(namespace));

    expect(res.status).toBe(503);
    expect(res.headers.get('Location')).toBeNull();
    expect(await res.json()).toMatchObject({ code: 'OAUTH_ERROR' });
    errorSpy.mockRestore();
  });

  it('rejects callbacks when the state cookie does not match', async () => {
    const kv = createMemoryKV();
    const env = createEnv(kv.namespace);
    const login = await startLogin(env);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await auth.request(
      `http://localhost/callback/github?code=auth-code&state=${login.state}`,
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=wrong` } },
      env,
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects callbacks when the stored state is missing', async () => {
    const kv = createMemoryKV();
    const env = createEnv(kv.namespace);
    const login = await startLogin(env);
    kv.store.clear();

    const res = await auth.request(
      `http://localhost/callback/github?code=auth-code&state=${login.state}`,
      { headers: { Cookie: login.cookie } },
      env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'OAUTH_ERROR' });
  });

  it('exchanges the code with PKCE and creates a KV session', async () => {
    const kv = createMemoryKV();
    const env = createEnv(kv.namespace);
    const login = await startLogin(env);
    const fetchMock = stubGitHubFetch();

    const res = await auth.request(
      `http://localhost/callback/github?code=auth-code&state=${login.state}`,
      { headers: { Cookie: login.cookie } },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/settings');
    const tokenBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, string>;
    expect(tokenBody.code).toBe('auth-code');
    expect(tokenBody.redirect_uri).toBe('http://localhost/auth/callback/github');
    expect(tokenBody.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect([...kv.store.keys()].some((key) => key.startsWith('oauth_state:'))).toBe(false);
    expect([...kv.store.keys()].filter((key) => key.startsWith('session:'))).toHaveLength(1);
    expect(res.headers.get('Set-Cookie')).toContain(`${SESSION_COOKIE}=`);

    const fetchCalls = fetchMock.mock.calls.length;
    const replayRes = await auth.request(
      `http://localhost/callback/github?code=auth-code&state=${login.state}`,
      { headers: { Cookie: login.cookie } },
      env,
    );

    expect(replayRes.status).toBe(400);
    expect(fetchMock.mock.calls).toHaveLength(fetchCalls);
  });

  it('returns 503 when the session cannot be stored', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new Map<string, string>();
    const namespace = {
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string): Promise<void> {
        if (key.startsWith('session:')) {
          throw new Error('KV unavailable');
        }
        store.set(key, value);
      },
      async delete(key: string): Promise<void> {
        store.delete(key);
      },
    } as unknown as KVNamespace;
    const env = createEnv(namespace);
    const login = await startLogin(env);
    stubGitHubFetch();

    const res = await auth.request(
      `http://localhost/callback/github?code=auth-code&state=${login.state}`,
      { headers: { Cookie: login.cookie } },
      env,
    );

    expect(res.status).toBe(503);
    expect(res.headers.get('Set-Cookie') ?? '').not.toContain(`${SESSION_COOKIE}=`);
    expect(await res.json()).toMatchObject({ code: 'OAUTH_ERROR' });
    errorSpy.mockRestore();
  });
});
