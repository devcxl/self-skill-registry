// Hono bindings for Cloudflare Worker environment

export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
}

export interface HonoEnv {
  Bindings: Bindings;
}
