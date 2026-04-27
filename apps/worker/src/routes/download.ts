import { Hono } from 'hono';
import type { HonoEnv } from '../types/bindings';
import { RegistryRepository } from '../db';

const download = new Hono<HonoEnv>();

// ── GET /v1/skills/:name/download?version=... ─────────────────────────

download.get('/:name/download', async (c) => {
  const name = c.req.param('name');
  const version = c.req.query('version');

  if (!version) {
    return c.json(
      { error: 'Query parameter "version" is required', code: 'MISSING_VERSION' },
      400,
    );
  }

  const repo = new RegistryRepository(c.env.DB);

  // Verify version exists
  const versionRecord = await repo.getVersion(name, version);
  if (!versionRecord) {
    return c.json(
      { error: `Version not found: ${name}@${version}`, code: 'NOT_FOUND' },
      404,
    );
  }

  // Fetch from R2
  const r2Object = await c.env.R2.get(versionRecord.r2_key);

  if (!r2Object) {
    return c.json(
      { error: `Tarball not found in storage: ${name}@${version}`, code: 'STORAGE_NOT_FOUND' },
      404,
    );
  }

  // Record download asynchronously (non-blocking)
  c.executionCtx.waitUntil(
    repo.recordDownload(name, version, {
      userAgent: c.req.header('User-Agent'),
    }),
  );

  const headers = new Headers();
  headers.set('Content-Type', 'application/gzip');
  headers.set('Content-Disposition', `attachment; filename="${name}-${version}.tar.gz"`);
  headers.set('X-Skill-Sha256', versionRecord.sha256);
  headers.set('Cache-Control', 'public, max-age=3600');

  if (r2Object.size) {
    headers.set('Content-Length', r2Object.size.toString());
  }

  return new Response(r2Object.body, { headers });
});

export default download;
