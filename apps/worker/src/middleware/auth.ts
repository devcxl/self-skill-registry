import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';
import { generateBase64UrlToken, sha256Hex } from '../utils/crypto';

/** Authenticate via Bearer token header */
export const bearerAuth = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' }, 401);
  }

  const token = authHeader.slice(7).trim();
  const repo = new UserRepository(c.env.DB);
  const user = await repo.verifyToken(token);

  if (!user) {
    return c.json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401);
  }

  c.set('user', user);
  await next();
});

/** Require admin role */
export const adminAuth = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user || !user.is_admin) {
    return c.json({ error: 'Admin access required', code: 'FORBIDDEN' }, 403);
  }
  await next();
});

/** Session cookie name */
export const SESSION_COOKIE = 'skill_registry_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24;

interface SessionRecord {
  userId: string;
  createdAt: string;
}

function isSecureRequest(c: Context<HonoEnv>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

async function sessionKey(token: string): Promise<string> {
  return `session:${await sha256Hex(token)}`;
}

/** Create a server-side session and set the session cookie */
export async function createSession(c: Context<HonoEnv>, userId: string): Promise<void> {
  const token = generateBase64UrlToken();
  await c.env.AUTH_CACHE.put(
    await sessionKey(token),
    JSON.stringify({ userId, createdAt: new Date().toISOString() } satisfies SessionRecord),
    { expirationTtl: SESSION_TTL_SECONDS },
  );

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureRequest(c),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clear the server-side session and session cookie */
export async function clearSession(c: Context<HonoEnv>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    try {
      await c.env.AUTH_CACHE.delete(await sessionKey(token));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  deleteCookie(c, SESSION_COOKIE, {
    sameSite: 'Lax',
    secure: isSecureRequest(c),
    path: '/',
  });
}

/** Get user ID from session cookie */
export async function getSessionUserId(c: Context<HonoEnv>): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;

  let record: string | null;
  try {
    record = await c.env.AUTH_CACHE.get(await sessionKey(token));
  } catch (err) {
    console.error('Failed to read session:', err);
    return null;
  }
  if (!record) return null;

  try {
    const session = JSON.parse(record) as Partial<SessionRecord>;
    return typeof session.userId === 'string' ? session.userId : null;
  } catch {
    return null;
  }
}

/** Get full user object from session cookie (or null if not logged in) */
export async function getSessionUser(c: Context<HonoEnv>) {
  const userId = await getSessionUserId(c);
  if (!userId) return null;
  const repo = new UserRepository(c.env.DB);
  return repo.getUser(userId);
}
