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
import { join, resolve } from 'node:path';
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

function getBucketName(env: string): string {
  return env === 'production'
    ? 'skill-registry-packages-production'
    : 'skill-registry-packages-staging';
}

function main(): void {
  const { dryRun, env } = getArgs();
  const bucketName = getBucketName(env);

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

  const envFlag = env !== 'staging' ? `--env ${env}` : '';

  if (dryRun) {
    console.log(`=== DRY RUN === Environment: ${env} | Bucket: ${bucketName}\n`);
  } else {
    console.log(`Publishing to R2 (${env}, bucket: ${bucketName})...`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const pkg of packages) {
    const tarballPath = resolve(PACKAGES_DIR, pkg.tarball);
    const r2Key = `skills/${pkg.skillName}/${pkg.version}.tar.gz`;
    // Wrangler expects: r2 object put {bucket}/{key} --file {path}
    const objectPath = `${bucketName}/${r2Key}`;

    if (!existsSync(tarballPath)) {
      console.error(`❌ ${pkg.skillName}: Tarball not found: ${tarballPath}`);
      failCount++;
      continue;
    }

    if (dryRun) {
      console.log(`  📦 ${pkg.skillName} (v${pkg.version})`);
      console.log(`     Source:    ${tarballPath}`);
      console.log(`     ObjectPath: ${objectPath}`);
      console.log(`     SHA256:    ${pkg.sha256}`);
      console.log(`     Size:      ${pkg.size}B`);
      successCount++;
      continue;
    }

    // Check if key already exists
    try {
      execSync(
        `npx wrangler r2 object get "${objectPath}" --pipe`,
        { cwd: WORKER_DIR, stdio: 'pipe', timeout: 30000 },
      );
      console.warn(`⚠️  ${pkg.skillName} v${pkg.version}: Already exists in R2, skipping`);
      failCount++;
      continue;
    } catch {
      // Key doesn't exist, proceed
    }

    // Upload to R2
    try {
      execSync(
        `npx wrangler r2 object put "${objectPath}" --file "${tarballPath}" ${envFlag}`,
        { cwd: WORKER_DIR, stdio: 'inherit', timeout: 120000 },
      );
      console.log(`✅ ${pkg.skillName} v${pkg.version}: Published → ${objectPath}`);
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
