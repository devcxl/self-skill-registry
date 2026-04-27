/**
 * Validate a skill-review.json file.
 * Usage: tsx scripts/validate-review-report.ts <path/to/skill-review.json>
 *
 * Reads the JSON file and validates it against the review report schema.
 * Exits with code 0 on success, 1 on failure.
 */

import { readFileSync } from 'node:fs';
import { validateReviewReport } from '@devcxl/registry-core';

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx scripts/validate-review-report.ts <path/to/skill-review.json>');
    process.exit(2);
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read file: ${filePath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON: ${filePath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const result = validateReviewReport(json);

  if (result.errors.length > 0) {
    console.error(`\n❌ Validation FAILED (${result.errors.length} error(s), ${result.warnings.length} warning(s))\n`);
    for (const err of result.errors) {
      console.error(`  [${err.code}] ${err.path}: ${err.message}`);
    }
    for (const warn of result.warnings) {
      console.warn(`  [${warn.code}] ${warn.path}: ${warn.message}`);
    }
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn(`\n⚠️  Validation PASSED with ${result.warnings.length} warning(s)\n`);
    for (const warn of result.warnings) {
      console.warn(`  [${warn.code}] ${warn.path}: ${warn.message}`);
    }
  } else {
    console.log('\n✅ Validation PASSED\n');
  }

  process.exit(0);
}

main();
