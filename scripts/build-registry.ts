/**
 * Build registry manifest and index from skills/ directory.
 * Usage: tsx scripts/build-registry.ts
 *
 * Scans skills/, reads frontmatter, and generates:
 * - artifacts/index.json
 * - artifacts/manifests/<skill-name>.json
 */

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '@devcxl/registry-core';
import type { SkillManifest, RegistryIndex, Skill } from '@devcxl/registry-core';

const SKILLS_DIR = join(process.cwd(), 'skills');
const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');
const MANIFESTS_DIR = join(ARTIFACTS_DIR, 'manifests');

function main(): void {
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

    // Build manifest
    const manifest: SkillManifest = {
      name: fm.name,
      description: fm.description,
      version: fm.version,
      compatibility: fm.compatibility,
      tags: fm.tags,
      category: fm.category,
      metadata: fm.metadata,
      publishedAt: new Date().toISOString(),
    };

    const manifestPath = join(MANIFESTS_DIR, `${fm.name}.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📄 ${fm.name}: Manifest built (v${fm.version})`);

    // Build skill record
    skills.push({
      name: fm.name,
      description: fm.description,
      category: fm.category,
      tags: fm.tags,
      compatibility: fm.compatibility,
      latestVersion: fm.version,
      latestScore: 0,
      reviewStatus: 'pending',
      lifecycleStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Build index
  const index: RegistryIndex = {
    generatedAt: new Date().toISOString(),
    skills,
    total: skills.length,
  };

  const indexPath = join(ARTIFACTS_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📊 Registry index built: ${skills.length} skill(s)`);
  console.log(`   Output: ${indexPath}`);
}

main();
