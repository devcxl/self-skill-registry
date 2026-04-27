// skill-registry-worker — Hono Worker for Skill Registry API + Web UI.

export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
