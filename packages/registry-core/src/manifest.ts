import type { SkillFrontmatter, SkillManifest, Skill, RegistryIndex } from './types';

/**
 * Build a skill manifest from parsed frontmatter.
 * Pure function — takes frontmatter data and optional metadata, returns a manifest.
 */
export function buildManifest(
  frontmatter: SkillFrontmatter,
  options?: {
    sourceCommit?: string;
    publishedAt?: string;
  },
): SkillManifest {
  return {
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.version,
    compatibility: frontmatter.compatibility,
    metadata: frontmatter.metadata,
    tags: frontmatter.tags,
    category: frontmatter.category,
    sourceCommit: options?.sourceCommit,
    publishedAt: options?.publishedAt ?? new Date().toISOString(),
  };
}

/**
 * Convert a manifest to a Skill record (for database/API).
 */
export function manifestToSkill(
  manifest: SkillManifest,
  options?: {
    latestScore?: number;
    reviewStatus?: Skill['reviewStatus'];
    lifecycleStatus?: Skill['lifecycleStatus'];
  },
): Skill {
  return {
    name: manifest.name,
    description: manifest.description,
    category: manifest.category,
    tags: manifest.tags,
    compatibility: manifest.compatibility,
    latestVersion: manifest.version,
    latestScore: options?.latestScore ?? 0,
    reviewStatus: options?.reviewStatus ?? 'pending',
    lifecycleStatus: options?.lifecycleStatus ?? 'active',
    createdAt: manifest.publishedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build a registry index from a list of skill records.
 */
export function buildIndex(skills: Skill[]): RegistryIndex {
  return {
    generatedAt: new Date().toISOString(),
    skills,
    total: skills.length,
  };
}

/**
 * Filter skills by visibility rules.
 * Only approved skills with active lifecycle are visible to regular users.
 * Admins see all statuses.
 */
export function filterVisibleSkills(skills: Skill[], isAdmin = false): Skill[] {
  if (isAdmin) return skills;
  return skills.filter(
    (s) => s.reviewStatus === 'approved' && s.lifecycleStatus === 'active',
  );
}
