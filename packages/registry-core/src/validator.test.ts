import { describe, it, expect } from 'vitest';
import { validateSkill, parseFrontmatter } from './validator';

// Helper: create a valid SKILL.md content
function validContent(overrides?: Record<string, unknown>): string {
  const merged = {
    name: 'test-skill',
    description: 'A test skill for validation',
    version: '1.0.0',
    compatibility: ['opencode', 'claude-code'],
    ...overrides,
  };
  // Remove undefined keys (they should be absent, not "key: undefined")
  const frontmatter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) frontmatter[k] = v;
  }
  const yaml = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${k}: []`;
        return `${k}:\n${v.map((x) => `  - ${x}`).join('\n')}`;
      }
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${yaml}\n---\n\n# Test Skill\n\nThis is a test.`;
}

describe('validateSkill', () => {
  // ── Positive cases ────────────────────────────────────────────────
  it('should pass a valid skill with all required fields', () => {
    const result = validateSkill(validContent(), 'test-skill');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass with all three compatibility targets', () => {
    const result = validateSkill(
      validContent({ compatibility: ['opencode', 'claude-code', 'codex'] }),
      'test-skill',
    );
    expect(result.valid).toBe(true);
  });

  it('should pass with optional tags and category', () => {
    const content = validContent({ tags: ['test', 'example'], category: 'testing' });
    const result = validateSkill(content, 'test-skill');
    expect(result.valid).toBe(true);
  });

  // ── Required fields ───────────────────────────────────────────────
  it('should fail when name is missing', () => {
    const content = validContent({ name: undefined });
    const result = validateSkill(content, 'test-skill');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
  });

  it('should fail when description is missing', () => {
    const content = validContent({ description: undefined });
    const result = validateSkill(content, 'test-skill');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
  });

  it('should fail when version is missing', () => {
    const content = validContent({ version: undefined });
    const result = validateSkill(content, 'test-skill');
    expect(result.valid).toBe(false);
  });

  it('should fail when compatibility is missing', () => {
    const content = validContent({ compatibility: undefined });
    const result = validateSkill(content, 'test-skill');
    expect(result.valid).toBe(false);
  });

  // ── Name validation ───────────────────────────────────────────────
  it('should fail when name does not match pattern', () => {
    const result = validateSkill(validContent({ name: 'Invalid_Name!' }), 'Invalid_Name!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NAME_FORMAT')).toBe(true);
  });

  it('should pass with valid hyphenated name', () => {
    const content = validContent({ name: 'my-awesome-skill' });
    const result = validateSkill(content, 'my-awesome-skill');
    expect(result.valid).toBe(true);
  });

  it('should fail when name starts or ends with hyphen', () => {
    const result = validateSkill(validContent({ name: '-bad-name' }), '-bad-name');
    expect(result.valid).toBe(false);
  });

  it('should fail when name has consecutive hyphens', () => {
    const result = validateSkill(validContent({ name: 'bad--name' }), 'bad--name');
    expect(result.valid).toBe(false);
  });

  it('should fail when name does not match directory name', () => {
    const result = validateSkill(validContent({ name: 'test-skill' }), 'different-dir');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'NAME_DIR_MISMATCH')).toBe(true);
  });

  // ── Version validation ────────────────────────────────────────────
  it('should fail with invalid semver', () => {
    const result = validateSkill(validContent({ version: 'not-a-version' }), 'test-skill');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_VERSION_FORMAT')).toBe(true);
  });

  it('should pass with pre-release semver', () => {
    const result = validateSkill(validContent({ version: '2.0.0-beta.1' }), 'test-skill');
    expect(result.valid).toBe(true);
  });

  // ── Compatibility validation ──────────────────────────────────────
  it('should fail with invalid compatibility value', () => {
    const result = validateSkill(validContent({ compatibility: ['unknown-platform'] }), 'test-skill');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_COMPATIBILITY_VALUE')).toBe(true);
  });

  it('should fail with empty compatibility array', () => {
    const result = validateSkill(validContent({ compatibility: [] }), 'test-skill');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_COMPATIBILITY')).toBe(true);
  });

  // ── Warnings ──────────────────────────────────────────────────────
  it('should warn when tags is not an array', () => {
    const content = validContent({ tags: 'not-array' });
    const result = validateSkill(content, 'test-skill');
    expect(result.warnings.some((w) => w.code === 'INVALID_TAGS_FORMAT')).toBe(true);
  });
});

describe('parseFrontmatter', () => {
  it('should parse valid frontmatter into SkillFrontmatter', () => {
    const fm = parseFrontmatter(validContent());
    expect(fm.name).toBe('test-skill');
    expect(fm.description).toBe('A test skill for validation');
    expect(fm.version).toBe('1.0.0');
    expect(fm.compatibility).toEqual(['opencode', 'claude-code']);
  });
});
