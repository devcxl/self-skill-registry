// ─── Compliance Status ────────────────────────────────────────────────

/** Skill frontmatter metadata parsed from SKILL.md */
export interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
  compatibility: Compatibility[];
  metadata?: SkillMetadata;
  tags?: string[];
  category?: string;
}

/** Target platform compatibility */
export type Compatibility = 'opencode' | 'claude-code' | 'codex';

/** Free-form metadata from SKILL.md frontmatter */
export interface SkillMetadata {
  language?: string;
  license?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  [key: string]: string | undefined;
}

// ─── Status Types ──────────────────────────────────────────────────────

/** AI review result status */
export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_manual_review';

/** Skill lifecycle state */
export type LifecycleStatus = 'active' | 'deprecated' | 'archived';

// ─── Registry Core Types ───────────────────────────────────────────────

/** Full skill record as stored in the registry */
export interface Skill {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  compatibility: Compatibility[];
  latestVersion: string;
  latestScore: number;
  reviewStatus: ReviewStatus;
  lifecycleStatus: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
  readme?: string;
}

/** Skill version record */
export interface SkillVersion {
  skillName: string;
  version: string;
  sourceCommit?: string;
  publishedAt: string;
  sha256: string;
  size: number;
  r2Key: string;
}

/** Manifest derived from SKILL.md frontmatter */
export interface SkillManifest {
  name: string;
  description: string;
  version: string;
  compatibility: Compatibility[];
  metadata?: SkillMetadata;
  tags?: string[];
  category?: string;
  sourceCommit?: string;
  publishedAt?: string;
  readme?: string;
}

/** Full registry index (for index.json) */
export interface RegistryIndex {
  generatedAt: string;
  skills: Skill[];
  total: number;
}

/** Single review finding */
export interface ReviewFinding {
  id: string;
  criterion: string;
  category: string;
  score: number; // 0–4
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  suggestion?: string;
}

/** Structured review report (matching artifacts/skill-review.json) */
export interface ReviewReport {
  skillName: string;
  skillVersion: string;
  reviewStatus: ReviewStatus;
  needsManualReview: boolean;
  totalScore: number; // 0–100
  categoryScores: Record<string, number>;
  findings: ReviewFinding[];
  summary: string;
  reviewedAt: string;
  reviewer: string;
  sourceCommit?: string;
}

/** Database row for a review record */
export interface SkillReview {
  id?: string;
  skillName: string;
  version: string;
  reviewStatus: ReviewStatus;
  totalScore: number;
  summary: string;
  reviewJson: ReviewReport;
  createdAt: string;
}

/** Download event record */
export interface DownloadEvent {
  skillName: string;
  version: string;
  ipHash?: string;
  userAgent?: string;
  downloadedAt: string;
}

/** User record */
export interface User {
  id: string;
  oidcProvider: string;
  oidcSub: string;
  displayName?: string;
  email?: string;
  isAdmin: boolean;
  createdAt: string;
}

/** User token record (hash only) */
export interface UserToken {
  id: string;
  userId: string;
  tokenHash: string;
  label: string;
  createdAt: string;
}

// ─── API Response Types ─────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface SearchQuery {
  q?: string;
  category?: string;
  compat?: Compatibility;
  sort?: 'name' | 'score' | 'updated' | 'downloads';
  page?: number;
  perPage?: number;
}

// ─── Validation Types ───────────────────────────────────────────────────

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface SecurityScanResult {
  passed: boolean;
  findings: Array<{
    path: string;
    severity: 'error' | 'warning';
    message: string;
  }>;
  needsManualReview: boolean;
}
