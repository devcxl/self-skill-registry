import { describe, it, expect } from 'vitest';

// Test type conversions from db rows to API responses
import { toSkillResponse, toVersionResponse, toReviewResponse } from './types/db';

describe('API Response Transformers', () => {
  it('should transform skill db row', () => {
    const row = {
      name: 'test-skill',
      description: 'A test',
      category: 'utilities',
      tags: 'testing,example',
      compatibility: 'opencode,claude-code,codex',
      latest_version: '1.0.0',
      latest_score: 95,
      review_status: 'approved',
      lifecycle_status: 'active',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    };

    const result = toSkillResponse(row);
    expect(result.name).toBe('test-skill');
    expect(result.tags).toEqual(['testing', 'example']);
    expect(result.compatibility).toEqual(['opencode', 'claude-code', 'codex']);
    expect(result.latestVersion).toBe('1.0.0');
    expect(result.latestScore).toBe(95);
    expect(result.reviewStatus).toBe('approved');
  });

  it('should handle null tags and category', () => {
    const row = {
      name: 'minimal-skill',
      description: 'Minimal',
      category: null,
      tags: null,
      compatibility: 'opencode',
      latest_version: '1.0.0',
      latest_score: 50,
      review_status: 'pending',
      lifecycle_status: 'active',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };

    const result = toSkillResponse(row);
    expect(result.tags).toBeUndefined();
    expect(result.category).toBeUndefined();
  });

  it('should transform version db row', () => {
    const row = {
      skill_name: 'test-skill',
      version: '1.0.0',
      source_commit: 'abc123',
      published_at: '2025-01-01',
      sha256: 'abcdef1234567890',
      size: 1024,
      r2_key: 'skills/test-skill/1.0.0.tar.gz',
    };

    const result = toVersionResponse(row);
    expect(result.version).toBe('1.0.0');
    expect(result.sourceCommit).toBe('abc123');
    expect(result.sha256).toBe('abcdef1234567890');
    expect(result.size).toBe(1024);
  });

  it('should handle null source commit', () => {
    const row = {
      skill_name: 'test-skill',
      version: '1.0.0',
      source_commit: null,
      published_at: '2025-01-01',
      sha256: 'aaa',
      size: 0,
      r2_key: 'key',
    };

    const result = toVersionResponse(row);
    expect(result.sourceCommit).toBeUndefined();
  });

  it('should transform review db row', () => {
    const row = {
      id: 'rev-001',
      skill_name: 'test-skill',
      version: '1.0.0',
      review_status: 'approved',
      total_score: 90,
      summary: 'Great skill',
      review_json: '{}',
      created_at: '2025-01-01',
    };

    const result = toReviewResponse(row);
    expect(result.id).toBe('rev-001');
    expect(result.skillName).toBe('test-skill');
    expect(result.status).toBe('approved');
    expect(result.totalScore).toBe(90);
  });
});
