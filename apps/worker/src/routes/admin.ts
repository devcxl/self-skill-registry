import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { RegistryRepository } from '../db';
import { UserRepository } from '../db-users';
import { bearerAuth, adminAuth } from '../middleware/auth';

const admin = new Hono<HonoEnv>();

// All admin routes require admin auth
admin.use('*', bearerAuth, adminAuth);

// ── GET /admin/skills/pending ─────────────────────────────────────────

admin.get('/skills/pending', async (c) => {
  const repo = new RegistryRepository(c.env.DB);
  const { skills, total } = await repo.listSkills({ includeAll: true });
  const pending = skills.filter(
    (s) => s.review_status !== 'approved',
  );
  return c.json({ skills: pending, total: pending.length });
});

// ── POST /admin/skills/:name/approve ──────────────────────────────────

admin.post('/skills/:name/approve', async (c) => {
  const name = c.req.param('name');
  await c.env.DB
    .prepare("UPDATE skills SET review_status = 'approved', updated_at = datetime('now') WHERE name = ?")
    .bind(name)
    .run();
  return c.json({ message: `Skill "${name}" approved` });
});

// ── POST /admin/skills/:name/reject ───────────────────────────────────

admin.post('/skills/:name/reject', async (c) => {
  const name = c.req.param('name');
  await c.env.DB
    .prepare("UPDATE skills SET review_status = 'rejected', updated_at = datetime('now') WHERE name = ?")
    .bind(name)
    .run();
  return c.json({ message: `Skill "${name}" rejected` });
});

// ── PUT /admin/skills/:name/status ────────────────────────────────────

admin.put('/skills/:name/status', async (c) => {
  const name = c.req.param('name');
  const body = await c.req.json<{ reviewStatus?: string; lifecycleStatus?: string }>();

  if (body.reviewStatus) {
    await c.env.DB
      .prepare("UPDATE skills SET review_status = ?, updated_at = datetime('now') WHERE name = ?")
      .bind(body.reviewStatus, name)
      .run();
  }
  if (body.lifecycleStatus) {
    await c.env.DB
      .prepare("UPDATE skills SET lifecycle_status = ?, updated_at = datetime('now') WHERE name = ?")
      .bind(body.lifecycleStatus, name)
      .run();
  }

  return c.json({ message: `Skill "${name}" updated`, name });
});

// ── GET /admin/users ──────────────────────────────────────────────────

admin.get('/users', async (c) => {
  const repo = new UserRepository(c.env.DB);
  const users = await repo.listUsers();
  return c.json({
    users: users.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      isAdmin: !!u.is_admin,
      provider: u.oidc_provider,
      createdAt: u.created_at,
    })),
  });
});

// ── POST /admin/users/:id/toggle-admin ────────────────────────────────

admin.post('/users/:id/toggle-admin', async (c) => {
  const userId = c.req.param('id');
  const repo = new UserRepository(c.env.DB);
  const user = await repo.getUser(userId);

  if (!user) {
    return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);
  }

  await repo.setAdmin(userId, !user.is_admin);
  return c.json({
    message: `User ${userId} admin status toggled`,
    isAdmin: !user.is_admin,
  });
});

export default admin;
