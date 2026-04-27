-- ============================================================
-- Skill Registry D1 Schema
-- Environment: local / staging / production
-- Managed via: wrangler d1 execute
-- ============================================================

-- -----------------------------------------------------------
-- 1. skills
-- Core skill metadata, independent of versions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  name          TEXT PRIMARY KEY,                  -- skill name: ^[a-z0-9]+(-[a-z0-9]+)*$
  description   TEXT NOT NULL,                     -- short description from SKILL.md
  category      TEXT,                              -- optional category
  tags          TEXT,                              -- comma-separated tags
  compatibility TEXT NOT NULL,                     -- comma-separated: opencode,claude-code,codex
  latest_version TEXT NOT NULL,                    -- latest published version
  latest_score  INTEGER DEFAULT 0,                 -- latest review score (0–100)
  review_status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | needs_manual_review
  lifecycle_status TEXT NOT NULL DEFAULT 'active',        -- active | deprecated | archived
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------
-- 2. skill_versions
-- Immutable version records: (skill_name, version) unique
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_versions (
  skill_name  TEXT NOT NULL,
  version     TEXT NOT NULL,                       -- semver from SKILL.md frontmatter
  source_commit TEXT,                              -- git commit SHA when published
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  sha256      TEXT NOT NULL,                       -- tarball SHA-256 hex string
  size        INTEGER NOT NULL,                    -- tarball size in bytes
  r2_key      TEXT NOT NULL,                       -- R2 object key

  PRIMARY KEY (skill_name, version),
  FOREIGN KEY (skill_name) REFERENCES skills(name) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_r2_key
  ON skill_versions(r2_key);

-- -----------------------------------------------------------
-- 3. skill_reviews
-- AI evaluation results, one per (skill_name, version)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_reviews (
  id            TEXT PRIMARY KEY,                  -- UUID
  skill_name    TEXT NOT NULL,
  version       TEXT NOT NULL,
  review_status TEXT NOT NULL,                     -- approved | rejected | needs_manual_review
  total_score   INTEGER NOT NULL DEFAULT 0,        -- 0–100
  summary       TEXT NOT NULL DEFAULT '',
  review_json   TEXT NOT NULL,                     -- Full ReviewReport as JSON string
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (skill_name) REFERENCES skills(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill
  ON skill_reviews(skill_name);

CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill_version
  ON skill_reviews(skill_name, version);

-- -----------------------------------------------------------
-- 4. download_events
-- Async download tracking, written via waitUntil
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name    TEXT NOT NULL,
  version       TEXT NOT NULL,
  ip_hash       TEXT,                              -- hashed IP for privacy
  user_agent    TEXT,
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_download_events_skill
  ON download_events(skill_name);

CREATE INDEX IF NOT EXISTS idx_download_events_time
  ON download_events(downloaded_at);

-- -----------------------------------------------------------
-- 5. users
-- OIDC-authenticated users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                  -- UUID
  oidc_provider TEXT NOT NULL,                     -- github | feishu | dingtalk
  oidc_sub      TEXT NOT NULL,                     -- provider's unique subject ID
  display_name  TEXT,
  email         TEXT,
  is_admin      INTEGER NOT NULL DEFAULT 0,        -- 0 = user, 1 = admin
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oidc
  ON users(oidc_provider, oidc_sub);

-- -----------------------------------------------------------
-- 6. user_tokens
-- Personal access tokens (SHA-256 hash only)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_tokens (
  id            TEXT PRIMARY KEY,                  -- UUID
  user_id       TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,              -- SHA-256 hex of the token
  label         TEXT NOT NULL DEFAULT 'default',   -- user-assigned label
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user
  ON user_tokens(user_id);
