import { describe, it, expect } from 'vitest';
import { buildManifest, manifestToSkill, buildIndex, filterVisibleSkills } from './manifest';
import type { SkillFrontmatter } from './types';

function makeFrontmatter(overrides?: Partial<SkillFrontmatter>): SkillFrontmatter {
  return {
    name: 'test-skill',
    description: 'A test skill',
    version: '1.0.0',
    compatibility: ['opencode', 'claude-code'],
    tags: ['testing'],
    category: 'utilities',
    ...overrides,
  };
}

describe('buildManifest', () => {
  it('should build manifest from frontmatter', () => {
    const fm = makeFrontmatter();
    const manifest = buildManifest(fm);
    expect(manifest.name).toBe('test-skill');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.compatibility).toEqual(['opencode', 'claude-code']);
    expect(manifest.publishedAt).toBeDefined();
  });

  it('should include sourceCommit when provided', () => {
    const fm = makeFrontmatter();
    const manifest = buildManifest(fm, { sourceCommit: 'abc123' });
    expect(manifest.sourceCommit).toBe('abc123');
  });

  it('should use provided publishedAt', () => {
    const fm = makeFrontmatter();
    const manifest = buildManifest(fm, { publishedAt: '2025-01-01T00:00:00Z' });
    expect(manifest.publishedAt).toBe('2025-01-01T00:00:00Z');
  });
});

describe('manifestToSkill', () => {
  it('should convert manifest to skill with defaults', () => {
    const manifest = buildManifest(makeFrontmatter());
    const skill = manifestToSkill(manifest);
    expect(skill.name).toBe('test-skill');
    expect(skill.latestScore).toBe(0);
    expect(skill.reviewStatus).toBe('pending');
    expect(skill.lifecycleStatus).toBe('active');
  });

  it('should accept overrides', () => {
    const manifest = buildManifest(makeFrontmatter());
    const skill = manifestToSkill(manifest, {
      latestScore: 85,
      reviewStatus: 'approved',
      lifecycleStatus: 'active',
    });
    expect(skill.latestScore).toBe(85);
    expect(skill.reviewStatus).toBe('approved');
  });
});

describe('buildIndex', () => {
  it('should build registry index from skills', () => {
    const manifest = buildManifest(makeFrontmatter());
    const skill = manifestToSkill(manifest);
    const index = buildIndex([skill]);

    expect(index.total).toBe(1);
    expect(index.skills).toHaveLength(1);
    expect(index.generatedAt).toBeDefined();
  });

  it('should handle empty skills array', () => {
    const index = buildIndex([]);
    expect(index.total).toBe(0);
    expect(index.skills).toHaveLength(0);
  });
});

describe('filterVisibleSkills', () => {
  it('should only show approved + active skills to regular users', () => {
    const makeSkill = (status: string, lifecycle: string) =>
      manifestToSkill(buildManifest(makeFrontmatter({ name: `skill-${status}` })), {
        reviewStatus: status as 'approved' | 'pending' | 'rejected',
        lifecycleStatus: lifecycle as 'active' | 'deprecated' | 'archived',
      });

    const skills = [
      makeSkill('approved', 'active'),
      makeSkill('approved', 'deprecated'),
      makeSkill('pending', 'active'),
      makeSkill('rejected', 'active'),
    ];

    const visible = filterVisibleSkills(skills, false);
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('skill-approved');
  });

  it('should show all skills to admins', () => {
    const makeSkill = (status: string) =>
      manifestToSkill(buildManifest(makeFrontmatter({ name: `skill-${status}` })), {
        reviewStatus: status as 'approved' | 'pending' | 'rejected',
      });

    const skills = [makeSkill('approved'), makeSkill('pending'), makeSkill('rejected')];
    const visible = filterVisibleSkills(skills, true);
    expect(visible).toHaveLength(3);
  });
});
