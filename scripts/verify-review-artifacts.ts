/**
 * Verify AI review artifacts exist and pass schema validation.
 * Usage: tsx scripts/verify-review-artifacts.ts <skill-name>
 *
 * Checks:
 *   1. skills/<skill-name>/EVAL.md exists
 *   2. artifacts/skill-review.json exists
 *   3. skill-review.json passes the review report schema
 * Exits with code 0 on success, 1 on failure.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateReviewReport } from '@devcxl/registry-core';

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function main(): void {
  const skill = process.argv[2];

  if (!skill) {
    console.error('Usage: tsx scripts/verify-review-artifacts.ts <skill-name>');
    process.exit(2);
  }

  // 1. EVAL.md must exist next to the skill
  const evalPath = join('skills', skill, 'EVAL.md');
  if (!existsSync(evalPath)) {
    fail(`EVAL.md not found at ${evalPath}`);
  }
  console.log(`✅ EVAL.md found at ${evalPath}`);

  // 2. skill-review.json must exist in artifacts/
  const reportPath = 'artifacts/skill-review.json';
  if (!existsSync(reportPath)) {
    fail(`skill-review.json not found at ${reportPath}`);
  }
  console.log('✅ skill-review.json found');

  // 3. Validate report against the schema
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(reportPath, 'utf-8'));
  } catch (err) {
    fail(`Failed to parse ${reportPath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const result = validateReviewReport(json);
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`  [${err.code}] ${err.path}: ${err.message}`);
    }
    fail(`skill-review.json failed schema validation (${result.errors.length} error(s))`);
  }
  console.log('✅ skill-review.json schema valid');
}

main();
