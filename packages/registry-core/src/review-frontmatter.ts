import matter from 'gray-matter';
import type { ReviewReport } from './types';
import { validateReviewReport } from './review-validator';

export function parsePersistedReviewFrontmatter(
  content: string,
  skillName: string,
  expectedVersion: string,
): ReviewReport {
  const parsed = matter(content);
  const reviewRaw = JSON.parse(JSON.stringify(parsed.data));

  const validation = validateReviewReport(reviewRaw);
  if (validation.errors.length > 0) {
    throw new Error(validation.errors.map((err) => `[${err.code}] ${err.path}: ${err.message}`).join('\n'));
  }

  const review = reviewRaw as ReviewReport;
  if (review.skillName !== skillName) {
    throw new Error(`Persisted review skill mismatch: expected ${skillName}, got ${review.skillName}`);
  }

  if (review.skillVersion !== expectedVersion) {
    throw new Error(`Persisted review version mismatch for ${skillName}: expected ${expectedVersion}, got ${review.skillVersion}`);
  }

  return review;
}
