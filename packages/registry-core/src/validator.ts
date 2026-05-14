import matter from 'gray-matter';
import type { SkillFrontmatter, Compatibility, ValidationResult, ValidationError } from './types';

// ─── Constants ─────────────────────────────────────────────────────────

/** Valid skill name pattern: lowercase alphanumeric with hyphens */
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Valid compatibility targets */
const VALID_COMPATIBILITY: readonly Compatibility[] = [
  'opencode',
  'claude-code',
  'codex',
] as const;

/** Required frontmatter fields */
const REQUIRED_FIELDS = ['name', 'description', 'version', 'compatibility'] as const;

/** Valid semver pattern (loose, for validation purposes) */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;

// ─── Core Validation ───────────────────────────────────────────────────

/**
 * Validate a SKILL.md file's frontmatter content.
 * This is a pure function — it takes the raw content string and directory name,
 * and returns validation results.
 */
export function validateSkill(content: string, dirName: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Parse frontmatter
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    errors.push({
      path: 'SKILL.md',
      message: 'Failed to parse YAML frontmatter',
      code: 'FRONTMATTER_PARSE_ERROR',
    });
    return { valid: false, errors, warnings };
  }

  const data = parsed.data as Record<string, unknown>;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      errors.push({
        path: `SKILL.md#${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // If any fields missing, stop early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate name format
  const name = data.name as string;
  if (!NAME_PATTERN.test(name)) {
    errors.push({
      path: 'SKILL.md#name',
      message: `Invalid name "${name}": must match pattern ^[a-z0-9]+(-[a-z0-9]+)*$`,
      code: 'INVALID_NAME_FORMAT',
    });
  }

  // Validate name matches directory name
  if (name !== dirName) {
    errors.push({
      path: 'SKILL.md#name',
      message: `Name "${name}" does not match directory name "${dirName}"`,
      code: 'NAME_DIR_MISMATCH',
    });
  }

  // Validate description is non-empty
  const description = (data.description as string)?.trim();
  if (!description || description.length === 0) {
    errors.push({
      path: 'SKILL.md#description',
      message: 'Description must not be empty',
      code: 'EMPTY_DESCRIPTION',
    });
  }

  // Validate version format
  const version = data.version as string;
  if (!SEMVER_PATTERN.test(version)) {
    errors.push({
      path: 'SKILL.md#version',
      message: `Invalid version "${version}": must follow semver format (e.g., 1.0.0)`,
      code: 'INVALID_VERSION_FORMAT',
    });
  }

  // Validate compatibility
  const compat = data.compatibility;
  if (!Array.isArray(compat) || compat.length === 0) {
    errors.push({
      path: 'SKILL.md#compatibility',
      message: 'Compatibility must be a non-empty array',
      code: 'INVALID_COMPATIBILITY',
    });
  } else {
    for (const item of compat) {
      if (!VALID_COMPATIBILITY.includes(item as Compatibility)) {
        errors.push({
          path: 'SKILL.md#compatibility',
          message: `Invalid compatibility value "${item}": must be one of: ${VALID_COMPATIBILITY.join(', ')}`,
          code: 'INVALID_COMPATIBILITY_VALUE',
        });
        break; // One error is enough
      }
    }
  }

  // Warnings (non-blocking)
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    warnings.push({
      path: 'SKILL.md#tags',
      message: 'tags should be an array of strings',
      code: 'INVALID_TAGS_FORMAT',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse frontmatter from SKILL.md content into SkillFrontmatter.
 * Assumes content has already been validated by validateSkill.
 */
export function parseFrontmatter(content: string): SkillFrontmatter {
  const parsed = matter(content);
  const data = parsed.data as Record<string, unknown>;

  return {
    name: data.name as string,
    description: data.description as string,
    version: data.version as string,
    compatibility: data.compatibility as Compatibility[],
    tags: data.tags as string[] | undefined,
    category: data.category as string | undefined,
    metadata: data.metadata as SkillFrontmatter['metadata'],
  };
}

/**
 * Parse SKILL.md content into frontmatter and markdown body.
 * Convenience wrapper that returns both the parsed frontmatter and the raw body.
 */
export function parseSkillMarkdown(content: string): {
  frontmatter: SkillFrontmatter;
  readme: string;
} {
  const parsed = matter(content);
  const data = parsed.data as Record<string, unknown>;
  return {
    frontmatter: {
      name: data.name as string,
      description: data.description as string,
      version: data.version as string,
      compatibility: data.compatibility as Compatibility[],
      tags: data.tags as string[] | undefined,
      category: data.category as string | undefined,
      metadata: data.metadata as SkillFrontmatter['metadata'],
    },
    readme: (parsed.content || '').trim(),
  };
}
