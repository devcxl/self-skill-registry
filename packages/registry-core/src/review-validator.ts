import type { ReviewReport, ReviewFinding, ValidationResult, ValidationError } from './types';
import { REVIEW_CATEGORIES, MAX_TOTAL_SCORE, VALID_REVIEW_STATUSES, VALID_PRIORITIES } from './review-categories';

// ─── Review Report Validation ──────────────────────────────────────────

/**
 * Validate a review report JSON against the expected schema.
 * Returns validation result with errors and warnings.
 */
export function validateReviewReport(report: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!report || typeof report !== 'object') {
    errors.push({
      path: '$',
      message: 'Report must be a non-null object',
      code: 'INVALID_REPORT_TYPE',
    });
    return { valid: false, errors, warnings };
  }

  const r = report as Record<string, unknown>;

  // Required top-level fields
  const requiredFields: Array<{ field: string; type: string }> = [
    { field: 'skillName', type: 'string' },
    { field: 'skillVersion', type: 'string' },
    { field: 'reviewStatus', type: 'string' },
    { field: 'needsManualReview', type: 'boolean' },
    { field: 'totalScore', type: 'number' },
    { field: 'categoryScores', type: 'object' },
    { field: 'findings', type: 'object' }, // Array
    { field: 'summary', type: 'string' },
    { field: 'reviewedAt', type: 'string' },
    { field: 'reviewer', type: 'string' },
  ];

  for (const { field, type } of requiredFields) {
    if (r[field] === undefined || r[field] === null) {
      errors.push({
        path: `$.${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // If critical fields missing, stop early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate reviewStatus
  const reviewStatus = r.reviewStatus as string;
  if (!VALID_REVIEW_STATUSES.includes(reviewStatus as typeof VALID_REVIEW_STATUSES[number])) {
    errors.push({
      path: '$.reviewStatus',
      message: `Invalid review status: "${reviewStatus}". Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`,
      code: 'INVALID_REVIEW_STATUS',
    });
  }

  // Validate totalScore
  const totalScore = r.totalScore as number;
  if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > MAX_TOTAL_SCORE || !Number.isInteger(totalScore)) {
    errors.push({
      path: '$.totalScore',
      message: `Invalid total score: ${totalScore}. Must be an integer between 0 and ${MAX_TOTAL_SCORE}.`,
      code: 'INVALID_TOTAL_SCORE',
    });
  }

  // Validate needsManualReview consistency
  const needsManualReview = r.needsManualReview as boolean;
  if (reviewStatus === 'needs_manual_review' && needsManualReview !== true) {
    warnings.push({
      path: '$.needsManualReview',
      message: 'Review status is "needs_manual_review" but needsManualReview is not true',
      code: 'INCONSISTENT_MANUAL_REVIEW',
    });
  }

  // Validate categoryScores
  const categoryScores = r.categoryScores as Record<string, unknown>;
  if (categoryScores && typeof categoryScores === 'object') {
    // Check for required categories
    for (const category of REVIEW_CATEGORIES) {
      if (categoryScores[category.id] === undefined) {
        errors.push({
          path: `$.categoryScores.${category.id}`,
          message: `Missing category score: ${category.id} (${category.name})`,
          code: 'MISSING_CATEGORY_SCORE',
        });
      } else {
        const score = categoryScores[category.id];
        const maxCatScore = category.criteria.length * 4;
        if (typeof score !== 'number' || score < 0 || score > maxCatScore || !Number.isInteger(score)) {
          errors.push({
            path: `$.categoryScores.${category.id}`,
            message: `Invalid score for ${category.name}: ${score}. Must be integer 0-${maxCatScore}.`,
            code: 'INVALID_CATEGORY_SCORE',
          });
        }
      }
    }
  }

  // Validate findings
  const findings = r.findings;
  if (!Array.isArray(findings)) {
    errors.push({
      path: '$.findings',
      message: 'findings must be an array',
      code: 'INVALID_FINDINGS_TYPE',
    });
  } else {
    // Validate each finding
    findings.forEach((finding: unknown, index: number) => {
      validateFinding(finding, index, errors, warnings);
    });

    // Check for empty findings with non-zero score (warning only)
    if (findings.length === 0 && totalScore > 0) {
      warnings.push({
        path: '$.findings',
        message: 'No findings provided but total score is non-zero',
        code: 'EMPTY_FINDINGS',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateFinding(
  finding: unknown,
  index: number,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  if (!finding || typeof finding !== 'object') {
    errors.push({
      path: `$.findings[${index}]`,
      message: `Finding at index ${index} must be an object`,
      code: 'INVALID_FINDING_TYPE',
    });
    return;
  }

  const f = finding as Record<string, unknown>;

  // Required finding fields
  const requiredFindingFields = ['id', 'criterion', 'category', 'score', 'description', 'priority'];
  for (const field of requiredFindingFields) {
    if (f[field] === undefined || f[field] === null) {
      errors.push({
        path: `$.findings[${index}].${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // Validate score
  const score = f.score;
  if (typeof score === 'number') {
    if (score < 0 || score > 4 || !Number.isInteger(score)) {
      errors.push({
        path: `$.findings[${index}].score`,
        message: `Invalid score: ${score}. Must be integer 0-4.`,
        code: 'INVALID_FINDING_SCORE',
      });
    }
  }

  // Validate priority
  const priority = f.priority as string;
  if (priority && !VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) {
    errors.push({
      path: `$.findings[${index}].priority`,
      message: `Invalid priority: "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`,
      code: 'INVALID_PRIORITY',
    });
  }
}
