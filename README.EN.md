# Self-Skill Registry

A private skill registry for AI coding agents (OpenCode / Claude Code / Codex) — manage, review, and distribute skill packages, built on Cloudflare Workers + D1 + R2.

## Architecture

```
skills/                  Business skill collection (SKILL.md + EVAL.md)
    ↓
scripts/                 Build pipeline: validate → index → pack → import → upload
    ↓
apps/worker/             Cloudflare Worker (Hono + JSX)
    ├── API routes       Search, download, review, admin
    ├── Web UI           Admin panel rendered with Hono JSX
    └── Middleware        OIDC auth (GitHub / Feishu / DingTalk)
    ↓
packages/registry-core/  Shared core logic (validation, security scan, manifest generation)
    ↓
Cloudflare
    ├── D1               SQLite database (skills / versions / reviews / downloads / users)
    └── R2               Object storage (skills/<name>/<version>.tar.gz)
```

## Quick Start

```bash
# Requirements
node >= 18

# Install dependencies
npm install

# Start Worker locally
npm run dev:worker

# Validate all skills
npm run validate:skills

# Build registry index & manifests
npm run build:registry

# Pack skills into .tar.gz
npm run pack:skills

# Import into D1 (configure D1 database_id in wrangler.toml first)
npm run import:registry

# Upload to R2
npm run publish:r2
```

## Skill Publishing Workflow

1. **Submit Skill** — Create `SKILL.md` (with frontmatter metadata) under `skills/<name>/`
2. **AI Review** — CI runs OpenCode to evaluate skill quality, producing `EVAL.md` + `skill-review.json`
3. **Merge to Main** — Merge after review approval
4. **Auto Publish** — CI triggers build pipeline: validate → pack → R2 upload → D1 import → auto deploy

## Project Structure

```
.
├── apps/worker/            Cloudflare Worker main app
├── packages/registry-core/ Shared core logic
├── skills/                 Business skill collection
├── scripts/                Build & validation scripts
├── db/schema.sql           D1 database schema
├── .github/workflows/      CI/CD (skill-review / release-skills)
└── .opencode/              OpenCode extensions (skill-evaluator + commands)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Worker framework | Hono + JSX |
| Deployment | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Object storage | Cloudflare R2 |
| Build tool | Turborepo |
| Script runtime | tsx |
| Testing | Vitest |
| Auth | OIDC (GitHub / Feishu / DingTalk) |

## Environments

| Environment | Trigger |
|-------------|---------|
| staging | push to main |
| production | git tag `v*` |

## License

[MIT](./LICENSE)
