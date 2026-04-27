/** Database row types matching D1 schema */

export interface Skill {
  name: string;
  description: string;
  category: string | null;
  tags: string | null;
  compatibility: string;
  latest_version: string;
  latest_score: number;
  review_status: string;
  lifecycle_status: string;
  created_at: string;
  updated_at: string;
}

export interface SkillVersion {
  skill_name: string;
  version: string;
  source_commit: string | null;
  published_at: string;
  sha256: string;
  size: number;
  r2_key: string;
}

export interface SkillReview {
  id: string;
  skill_name: string;
  version: string;
  review_status: string;
  total_score: number;
  summary: string;
  review_json: string; // JSON-encoded ReviewReport
  created_at: string;
}

export interface DownloadEvent {
  id: number;
  skill_name: string;
  version: string;
  ip_hash: string | null;
  user_agent: string | null;
  downloaded_at: string;
}

export interface User {
  id: string;
  oidc_provider: string;
  oidc_sub: string;
  display_name: string | null;
  email: string | null;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export interface UserToken {
  id: string;
  user_id: string;
  token_hash: string;
  label: string;
  created_at: string;
}

// ─── API Response Types ────────────────────────────────────────────────

/** Public skill summary (for API responses) */
export interface SkillResponse {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  compatibility: string[];
  latestVersion: string;
  latestScore: number;
  reviewStatus: string;
  lifecycleStatus: string;
  createdAt: string;
  updatedAt: string;
}

/** Transform a DB row to API response */
export function toSkillResponse(db: Skill): SkillResponse {
  return {
    name: db.name,
    description: db.description,
    category: db.category || undefined,
    tags: db.tags ? db.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    compatibility: db.compatibility.split(',').map((c) => c.trim()).filter(Boolean),
    latestVersion: db.latest_version,
    latestScore: db.latest_score,
    reviewStatus: db.review_status,
    lifecycleStatus: db.lifecycle_status,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export interface VersionResponse {
  version: string;
  sourceCommit?: string;
  publishedAt: string;
  sha256: string;
  size: number;
}

export function toVersionResponse(db: SkillVersion): VersionResponse {
  return {
    version: db.version,
    sourceCommit: db.source_commit || undefined,
    publishedAt: db.published_at,
    sha256: db.sha256,
    size: db.size,
  };
}

export interface ReviewResponse {
  id: string;
  skillName: string;
  version: string;
  status: string;
  totalScore: number;
  summary: string;
  createdAt: string;
}

export function toReviewResponse(db: SkillReview): ReviewResponse {
  return {
    id: db.id,
    skillName: db.skill_name,
    version: db.version,
    status: db.review_status,
    totalScore: db.total_score,
    summary: db.summary,
    createdAt: db.created_at,
  };
}
