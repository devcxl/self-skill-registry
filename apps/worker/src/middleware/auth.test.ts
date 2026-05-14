import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { clearSession, createSession, getSessionUserId, SESSION_COOKIE } from './auth';

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

function createEnv(kv: KVNamespace): HonoEnv['Bindings'] {
  return {
    DB: {} as D1Database,
    R2: {} as R2Bucket,
    AUTH_CACHE: kv,
  };
}

function createTestApp(): Hono<HonoEnv> {
  const app = new Hono<HonoEnv>();

  app.get('/session/:userId', async (c) => {
    await createSession(c, c.req.param('userId'));
    return c.text('created');
  });

  app.get('/session-user', async (c) => {
    return c.text((await getSessionUserId(c)) ?? 'none');
  });

  app.get('/logout', async (c) => {
    await clearSession(c);
    return c.text('cleared');
  });

  return app;
}

function cookiePair(setCookie: string, name: string): string {
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  if (!match) throw new Error(`Missing ${name} cookie`);
  return `${name}=${match[1]}`;
}

describe('session helpers', () => {
  it('creates an HTTPS session cookie backed by KV', async () => {
    const kv = createMemoryKV();
    const app = createTestApp();
    const res = await app.request('https://example.com/session/user-1', {}, createEnv(kv.namespace));

    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Max-Age=86400');
    expect([...kv.store.keys()].filter((key) => key.startsWith('session:'))).toHaveLength(1);

    const record = JSON.parse([...kv.store.values()][0]) as { userId?: string };
    expect(record.userId).toBe('user-1');
  });

  it('does not set Secure on local HTTP sessions', async () => {
    const kv = createMemoryKV();
    const app = createTestApp();
    const res = await app.request('http://localhost/session/user-1', {}, createEnv(kv.namespace));

    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).not.toContain('Secure');
  });

  it('reads the user id from a valid session cookie', async () => {
    const kv = createMemoryKV();
    const app = createTestApp();
    const createRes = await app.request('https://example.com/session/user-1', {}, createEnv(kv.namespace));
    const cookie = cookiePair(createRes.headers.get('Set-Cookie') ?? '', SESSION_COOKIE);

    const readRes = await app.request('https://example.com/session-user', { headers: { Cookie: cookie } }, createEnv(kv.namespace));

    expect(await readRes.text()).toBe('user-1');
  });

  it('ignores unknown session cookies', async () => {
    const kv = createMemoryKV();
    const app = createTestApp();
    const res = await app.request(
      'https://example.com/session-user',
      { headers: { Cookie: `${SESSION_COOKIE}=missing` } },
      createEnv(kv.namespace),
    );

    expect(await res.text()).toBe('none');
  });

  it('treats session KV read failures as unauthenticated', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const namespace = {
      async get(): Promise<string | null> {
        throw new Error('KV unavailable');
      },
      async put(): Promise<void> {},
      async delete(): Promise<void> {},
    } as unknown as KVNamespace;
    const app = createTestApp();

    const res = await app.request(
      'https://example.com/session-user',
      { headers: { Cookie: `${SESSION_COOKIE}=token` } },
      createEnv(namespace),
    );

    expect(await res.text()).toBe('none');
    errorSpy.mockRestore();
  });

  it('clears the KV session on logout', async () => {
    const kv = createMemoryKV();
    const app = createTestApp();
    const createRes = await app.request('https://example.com/session/user-1', {}, createEnv(kv.namespace));
    const cookie = cookiePair(createRes.headers.get('Set-Cookie') ?? '', SESSION_COOKIE);

    const logoutRes = await app.request('https://example.com/logout', { headers: { Cookie: cookie } }, createEnv(kv.namespace));

    expect([...kv.store.keys()].filter((key) => key.startsWith('session:'))).toHaveLength(0);
    expect(logoutRes.headers.get('Set-Cookie')).toContain(`${SESSION_COOKIE}=`);
    expect(logoutRes.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('clears the cookie even when KV delete fails on logout', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const namespace = {
      async get(): Promise<string | null> {
        return null;
      },
      async put(): Promise<void> {},
      async delete(): Promise<void> {
        throw new Error('KV unavailable');
      },
    } as unknown as KVNamespace;
    const app = createTestApp();

    const res = await app.request(
      'https://example.com/logout',
      { headers: { Cookie: `${SESSION_COOKIE}=token` } },
      createEnv(namespace),
    );

    expect(res.headers.get('Set-Cookie')).toContain(`${SESSION_COOKIE}=`);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    errorSpy.mockRestore();
  });
});
