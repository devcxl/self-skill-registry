import { describe, expect, it } from 'vitest';
import { parsePersistedReviewFrontmatter } from './review-frontmatter';

describe('parsePersistedReviewFrontmatter', () => {
  it('normalizes reviewedAt into a string after gray-matter parses EVAL front matter', () => {
    const review = parsePersistedReviewFrontmatter(`---
skillName: temp-skill
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 88
categoryScores:
  functional-suitability: 11
  reliability: 10
  performance: 7
  usability-ai: 14
  usability-human: 7
  security: 11
  maintainability: 10
  agent-specific: 18
findings: []
summary: temporary review
reviewedAt: 2026-04-30T00:00:00Z
reviewer: test-runner
---

# temp evaluation

body
`, 'temp-skill', '1.0.0');

    expect(review.skillName).toBe('temp-skill');
    expect(review.skillVersion).toBe('1.0.0');
    expect(typeof review.reviewedAt).toBe('string');
    expect(new Date(review.reviewedAt).toISOString()).toBe('2026-04-30T00:00:00.000Z');
    expect(review.totalScore).toBe(88);
  });
});
