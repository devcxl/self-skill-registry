import type { User } from './db';

// Hono bindings for Cloudflare Worker environment

export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  // OAuth secrets (Cloudflare secrets)
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface HonoEnv {
  Bindings: Bindings;
  Variables: {
    user?: User;
  };
}
