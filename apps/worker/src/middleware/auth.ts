import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { UserRepository } from '../db-users';

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

/** Set session cookie */
export function setSessionCookie(c: Context<HonoEnv>, userId: string): void {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${userId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`,
  );
}

/** Clear session cookie */
export function clearSessionCookie(c: Context<HonoEnv>): void {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

/** Get user ID from session cookie */
export function getSessionUserId(c: Context<HonoEnv>): string | null {
  const cookie = c.req.header('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] || null;
}
