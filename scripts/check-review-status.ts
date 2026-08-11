/**
 * Read the review status from skill-review.json.
 * Usage: tsx scripts/check-review-status.ts [path/to/skill-review.json]
 *
 * Prints the reviewStatus value (approved | needs_manual_review | rejected)
 * to stdout. Exits with code 1 if the field is missing.
 */

import { readFileSync } from 'node:fs';

function main(): void {
  const filePath = process.argv[2] ?? 'artifacts/skill-review.json';

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const status = data.reviewStatus;
  if (typeof status !== 'string' || status.length === 0) {
    console.error('❌ reviewStatus missing in skill-review.json');
    process.exit(1);
  }

  console.log(status);
}

main();
