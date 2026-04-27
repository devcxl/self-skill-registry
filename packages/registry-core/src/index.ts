// @devcxl/registry-core — Shared types and pure logic for the skill registry system.

export type {
  SkillFrontmatter,
  Compatibility,
  SkillMetadata,
  ReviewStatus,
  LifecycleStatus,
  Skill,
  SkillVersion,
  SkillManifest,
  RegistryIndex,
  ReviewFinding,
  ReviewReport,
  SkillReview,
  DownloadEvent,
  User,
  UserToken,
  ApiError,
  PaginatedResponse,
  SearchQuery,
  ValidationError,
  ValidationResult,
  SecurityScanResult,
} from './types';

export { validateSkill, parseFrontmatter } from './validator';
export {
  scanForSecrets,
  checkPathTraversal,
  checkContentPathTraversal,
  checkExternalDependencies,
  checkUnsafeExtensions,
  runSecurityScan,
} from './security';
export { validateReviewReport } from './review-validator';

export const REGISTRY_CORE_VERSION = '0.1.0';
