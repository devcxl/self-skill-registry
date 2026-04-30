/**
 * Sync structured review JSON into EVAL.md YAML front matter.
 * Usage: tsx scripts/sync-review-frontmatter.ts <path/to/EVAL.md> <path/to/skill-review.json>
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import matter from 'gray-matter';
import { validateReviewReport, type ReviewReport } from '@devcxl/registry-core';

function main(): void {
  const [evalPath, reviewJsonPath] = process.argv.slice(2);

  if (!evalPath || !reviewJsonPath) {
    console.error('Usage: tsx scripts/sync-review-frontmatter.ts <path/to/EVAL.md> <path/to/skill-review.json>');
    process.exit(2);
  }

  if (!existsSync(evalPath)) {
    console.error(`EVAL.md not found: ${evalPath}`);
    process.exit(1);
  }

  if (!existsSync(reviewJsonPath)) {
    console.error(`Review JSON not found: ${reviewJsonPath}`);
    process.exit(1);
  }

  let rawReview: unknown;
  try {
    rawReview = JSON.parse(readFileSync(reviewJsonPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to parse review JSON: ${reviewJsonPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const validation = validateReviewReport(rawReview);
  if (validation.errors.length > 0) {
    console.error(`Invalid review JSON: ${reviewJsonPath}`);
    for (const err of validation.errors) {
      console.error(`  [${err.code}] ${err.path}: ${err.message}`);
    }
    process.exit(1);
  }

  const review = rawReview as ReviewReport;
  const evalContent = readFileSync(evalPath, 'utf-8');
  const parsed = matter(evalContent);
  const body = parsed.content.replace(/^\n+/, '');
  const output = matter.stringify(body, review);
  writeFileSync(evalPath, output);

  console.log(`Synced review front matter into ${evalPath}`);
}

main();
