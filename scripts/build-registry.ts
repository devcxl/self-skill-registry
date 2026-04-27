/**
 * Build registry manifest and index from skills/ directory.
 * Usage: tsx scripts/build-registry.ts [--source-commit <sha>]
 *
 * Scans skills/, reads frontmatter, and generates:
 * - artifacts/index.json
 * - artifacts/manifests/<skill-name>.json
 */

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter, buildManifest, manifestToSkill, buildIndex } from '@devcxl/registry-core';
import type { SkillManifest, Skill } from '@devcxl/registry-core';

const SKILLS_DIR = join(process.cwd(), 'skills');
const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');
const MANIFESTS_DIR = join(ARTIFACTS_DIR, 'manifests');

function getSourceCommit(): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--source-commit');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA;
}

function main(): void {
  const sourceCommit = getSourceCommit();

  if (!existsSync(SKILLS_DIR)) {
    console.log('No skills directory found. Skipping build.');
    process.exit(0);
  }

  mkdirSync(MANIFESTS_DIR, { recursive: true });

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  const skills: Skill[] = [];

  for (const dir of skillDirs) {
    const skillPath = join(SKILLS_DIR, dir.name);
    const skillMdPath = join(skillPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
      console.warn(`⚠️  ${dir.name}: SKILL.md not found, skipping`);
      continue;
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const fm = parseFrontmatter(content);

    // Build manifest using pure function
    const manifest: SkillManifest = buildManifest(fm, { sourceCommit });
    const manifestPath = join(MANIFESTS_DIR, `${fm.name}.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📄 ${fm.name}: Manifest built (v${fm.version})`);

    // Build skill record
    const skill = manifestToSkill(manifest);
    skills.push(skill);
  }

  // Build index
  const index = buildIndex(skills);
  const indexPath = join(ARTIFACTS_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📊 Registry index built: ${skills.length} skill(s)`);
  console.log(`   Output: ${indexPath}`);
}

main();
