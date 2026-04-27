/**
 * Pack skill directories into tarballs and compute checksums.
 * Usage: tsx scripts/pack-skills.ts
 *
 * Packs each skill directory under skills/ into a .tar.gz archive,
 * computes SHA-256 and size, and writes metadata to artifacts/packages/.
 */

import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
} from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';

const SKILLS_DIR = join(process.cwd(), 'skills');
const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');
const PACKAGES_DIR = join(ARTIFACTS_DIR, 'packages');

interface PackageMeta {
  skillName: string;
  version: string;
  tarball: string;
  sha256: string;
  size: number;
}

function main(): void {
  if (!existsSync(SKILLS_DIR)) {
    console.log('No skills directory found. Skipping pack.');
    process.exit(0);
  }

  mkdirSync(PACKAGES_DIR, { recursive: true });

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  const packages: PackageMeta[] = [];

  for (const dir of skillDirs) {
    const skillPath = join(SKILLS_DIR, dir.name);
    const skillMdPath = join(skillPath, 'SKILL.md');

    if (!existsSync(skillMdPath)) {
      console.warn(`⚠️  ${dir.name}: SKILL.md not found, skipping`);
      continue;
    }

    // Read version from frontmatter
    const content = readFileSync(skillMdPath, 'utf-8');
    const versionMatch = content.match(/version:\s*([^\s\n]+)/);
    const version = versionMatch ? versionMatch[1] : '0.0.0';

    // Pack to tarball using child process (tar -czf)
    const { execSync } = require('child_process');
    const tarballName = `${dir.name}-${version}.tar.gz`;
    const tarballPath = join(PACKAGES_DIR, tarballName);

    execSync(`tar -czf "${tarballPath}" -C skills "${dir.name}"`, {
      cwd: process.cwd(),
    });

    // Compute SHA-256
    const tarballData = readFileSync(tarballPath);
    const sha256 = createHash('sha256').update(tarballData).digest('hex');
    const size = tarballData.length;

    packages.push({
      skillName: dir.name,
      version,
      tarball: tarballName,
      sha256,
      size,
    });

    console.log(`📦 ${dir.name}: Packed (v${version}) sha256=${sha256.slice(0, 12)}... size=${size}B`);
  }

  // Write manifest
  const manifestPath = join(PACKAGES_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(packages, null, 2));
  console.log(`\n📊 Packages manifest: ${packages.length} package(s)`);
  console.log(`   Output: ${PACKAGES_DIR}/`);
}

main();
