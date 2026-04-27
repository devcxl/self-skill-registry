/**
 * Validate all skills in skills/ directory.
 * Usage: tsx scripts/validate-skills.ts
 *
 * Scans skills/ for SKILL.md files, validates frontmatter,
 * and exits with code 1 if any validation errors found.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateSkill } from '@devcxl/registry-core';

const SKILLS_DIR = join(process.cwd(), 'skills');

function main(): void {
  if (!existsSync(SKILLS_DIR)) {
    console.log('No skills directory found. Skipping validation.');
    process.exit(0);
  }

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory());

  if (skillDirs.length === 0) {
    console.log('No skill directories found. Skipping validation.');
    process.exit(0);
  }

  let hasErrors = false;

  for (const dir of skillDirs) {
    const skillPath = join(SKILLS_DIR, dir.name);
    const skillMdPath = join(skillPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
      console.error(`❌ ${dir.name}: SKILL.md not found`);
      hasErrors = true;
      continue;
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const result = validateSkill(content, dir.name);

    if (!result.valid) {
      console.error(`\n❌ ${dir.name}: Validation FAILED`);
      for (const err of result.errors) {
        console.error(`  [${err.code}] ${err.path}: ${err.message}`);
      }
      hasErrors = true;
    } else {
      console.log(`✅ ${dir.name}: Valid`);
      for (const warn of result.warnings) {
        console.warn(`  ⚠️  [${warn.code}] ${warn.path}: ${warn.message}`);
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ Validation errors found. Fix them before proceeding.');
    process.exit(1);
  }

  console.log('\n✅ All skills passed validation.');
  process.exit(0);
}

main();
