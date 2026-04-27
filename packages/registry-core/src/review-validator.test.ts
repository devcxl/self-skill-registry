import { describe, it, expect } from 'vitest';
import { validateReviewReport } from './review-validator';

// Helper: create a valid review report
function validReport(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    skillName: 'example-skill',
    skillVersion: '1.0.0',
    reviewStatus: 'approved',
    needsManualReview: false,
    totalScore: 85,
    categoryScores: {
      'functional-suitability': 10,
      'reliability': 10,
      'performance': 6,
      'usability-ai': 14,
      'usability-human': 7,
      'security': 10,
      'maintainability': 10,
      'agent-specific': 18,
    },
    findings: [
      {
        id: 'F001',
        criterion: 'completeness',
        category: 'functional-suitability',
        score: 3,
        description: 'Skill covers core use cases well',
        priority: 'P1',
      },
    ],
    summary: 'A well-structured skill with minor improvements needed.',
    reviewedAt: '2025-04-27T10:00:00Z',
    reviewer: 'AI-Evaluator',
    sourceCommit: 'abc123',
    ...overrides,
  };
}

describe('validateReviewReport', () => {
  // ── Positive cases ────────────────────────────────────────────────
  it('should pass a valid complete report', () => {
    const result = validateReviewReport(validReport());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass with needsManualReview', () => {
    const report = validReport({
      reviewStatus: 'needs_manual_review',
      needsManualReview: true,
      totalScore: 65,
    });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(true);
  });

  // ── Required fields ───────────────────────────────────────────────
  it('should fail when skillName is missing', () => {
    const { skillName, ...rest } = validReport();
    const result = validateReviewReport(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.skillName')).toBe(true);
  });

  it('should fail when totalScore is missing', () => {
    const { totalScore, ...rest } = validReport();
    const result = validateReviewReport(rest);
    expect(result.valid).toBe(false);
  });

  // ── Type validation ───────────────────────────────────────────────
  it('should fail with non-object input', () => {
    const result = validateReviewReport('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_REPORT_TYPE')).toBe(true);
  });

  it('should fail with null input', () => {
    const result = validateReviewReport(null);
    expect(result.valid).toBe(false);
  });

  // ── Review status validation ──────────────────────────────────────
  it('should fail with invalid review status', () => {
    const report = validReport({ reviewStatus: 'invalid_status' });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_REVIEW_STATUS')).toBe(true);
  });

  // ── Score validation ──────────────────────────────────────────────
  it('should fail with negative total score', () => {
    const report = validReport({ totalScore: -1 });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_TOTAL_SCORE')).toBe(true);
  });

  it('should fail with score > 100', () => {
    const report = validReport({ totalScore: 101 });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
  });

  it('should fail with non-integer total score', () => {
    const report = validReport({ totalScore: 85.5 });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
  });

  // ── Category scores validation ────────────────────────────────────
  it('should fail with missing category score', () => {
    const report = validReport({
      categoryScores: { 'functional-suitability': 10, 'reliability': 10 },
    });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_CATEGORY_SCORE')).toBe(true);
  });

  // ── Findings validation ───────────────────────────────────────────
  it('should fail with invalid finding score', () => {
    const report = validReport({
      findings: [
        {
          id: 'F001',
          criterion: 'completeness',
          category: 'functional-suitability',
          score: 5, // invalid, max is 4
          description: 'too high score',
          priority: 'P0',
        },
      ],
    });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_FINDING_SCORE')).toBe(true);
  });

  it('should fail when findings is not an array', () => {
    const report = validReport({ findings: 'not an array' });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_FINDINGS_TYPE')).toBe(true);
  });

  it('should fail with missing finding required fields', () => {
    const report = validReport({
      findings: [{ id: 'only-id' }],
    });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
  });

  it('should fail with invalid priority', () => {
    const report = validReport({
      findings: [
        {
          id: 'F001',
          criterion: 'completeness',
          category: 'functional-suitability',
          score: 3,
          description: 'test',
          priority: 'P3', // invalid
        },
      ],
    });
    const result = validateReviewReport(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_PRIORITY')).toBe(true);
  });

  // ── Warnings ──────────────────────────────────────────────────────
  it('should warn when needs_manual_review status does not match flag', () => {
    const report = validReport({
      reviewStatus: 'needs_manual_review',
      needsManualReview: false, // inconsistent
    });
    const result = validateReviewReport(report);
    expect(result.warnings.some((w) => w.code === 'INCONSISTENT_MANUAL_REVIEW')).toBe(true);
  });

  it('should warn when findings empty but score non-zero', () => {
    const report = validReport({ findings: [], totalScore: 50 });
    const result = validateReviewReport(report);
    expect(result.warnings.some((w) => w.code === 'EMPTY_FINDINGS')).toBe(true);
  });
});
