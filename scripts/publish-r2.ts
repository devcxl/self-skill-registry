/**
 * Publish skill tarballs to R2.
 * Usage:
 *   tsx scripts/publish-r2.ts [--dry-run] [--staging|--production]
 *
 * Reads artifacts/packages/manifest.json and uploads tarballs to R2.
 * Key format: skills/<name>/<version>.tar.gz
 * Prevents overwriting existing keys.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');
const PACKAGES_DIR = join(ARTIFACTS_DIR, 'packages');
const WORKER_DIR = join(process.cwd(), 'apps', 'worker');

interface PackageMeta {
  skillName: string;
  version: string;
  tarball: string;
  sha256: string;
  size: number;
}

function getArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    env: args.includes('--production') ? 'production'
       : args.includes('--staging') ? 'staging'
       : 'staging',
  };
}

function main(): void {
  const { dryRun, env } = getArgs();

  // Read packages manifest
  const manifestPath = join(PACKAGES_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('No packages manifest found. Run "npm run pack:skills" first.');
    process.exit(1);
  }

  const packages: PackageMeta[] = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  if (packages.length === 0) {
    console.log('No packages to publish.');
    process.exit(0);
  }

  // Build Wrangler flags
  const envFlag = env !== 'staging' ? `--env ${env}` : '';
  const dryRunFlag = dryRun ? '--dry-run' : '';

  if (dryRun) {
    console.log(`=== DRY RUN === Environment: ${env}\n`);
  } else {
    console.log(`Publishing to R2 (${env})...`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const pkg of packages) {
    const tarballPath = join(PACKAGES_DIR, pkg.tarball);
    const r2Key = `skills/${pkg.skillName}/${pkg.version}.tar.gz`;

    if (!existsSync(tarballPath)) {
      console.error(`❌ ${pkg.skillName}: Tarball not found: ${tarballPath}`);
      failCount++;
      continue;
    }

    if (dryRun) {
      console.log(`  📦 ${pkg.skillName} (v${pkg.version})`);
      console.log(`     Source: ${tarballPath}`);
      console.log(`     R2 Key: ${r2Key}`);
      console.log(`     SHA256: ${pkg.sha256}`);
      console.log(`     Size:   ${pkg.size}B`);
      successCount++;
      continue;
    }

    // First check if key already exists
    try {
      execSync(
        `npx wrangler r2 object get skill-registry-packages "${r2Key}" --pipe`,
        {
          cwd: WORKER_DIR,
          stdio: 'pipe',
          timeout: 30000,
          env: { ...process.env },
        },
      );

      console.warn(`⚠️  ${pkg.skillName} v${pkg.version}: Key already exists in R2, skipping`);
      failCount++;
      continue;
    } catch {
      // Key doesn't exist, proceed with upload
    }

    // Upload to R2
    try {
      const flags = [envFlag, dryRunFlag, `"${r2Key}"`, `--file "../../${tarballPath}"`]
        .filter(Boolean)
        .join(' ');
      execSync(`npx wrangler r2 object put skill-registry-packages ${flags}`, {
        cwd: WORKER_DIR,
        stdio: 'inherit',
        timeout: 120000,
      });
      console.log(`✅ ${pkg.skillName} v${pkg.version}: Published (${r2Key})`);
      successCount++;
    } catch (err) {
      console.error(`❌ ${pkg.skillName} v${pkg.version}: Upload failed`);
      failCount++;
    }
  }

  console.log(`\n📊 Publish summary: ${successCount} succeeded, ${failCount} failed`);
  if (failCount > 0 && !dryRun) {
    process.exit(1);
  }
}

main();
