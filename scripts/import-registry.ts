/**
 * Import registry data into D1 from artifacts.
 * Usage:
 *   tsx scripts/import-registry.ts [--local] [--remote] [--env staging|production] [--dry-run]
 *
 * Options:
 *   --local       Execute on local D1 (default)
 *   --remote      Execute on remote D1
 *   --env <name>  Environment to target (staging | production). Required for --remote.
 *   --dry-run     Print SQL without executing
 */

import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');
const PACKAGES_DIR = join(ARTIFACTS_DIR, 'packages');
const MANIFESTS_DIR = join(ARTIFACTS_DIR, 'manifests');
const IMPORT_SQL_PATH = join(ARTIFACTS_DIR, 'import.sql');
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
  const envIdx = args.indexOf('--env');
  const env = envIdx >= 0 ? args[envIdx + 1] : undefined;
  if (env && !['staging', 'production'].includes(env)) {
    console.error(`Invalid environment: ${env}. Use 'staging' or 'production'.`);
    process.exit(2);
  }
  return {
    remote: args.includes('--remote'),
    dryRun: args.includes('--dry-run'),
    local: !args.includes('--remote'),
    env,
  };
}

function main(): void {
  const { remote, dryRun, env } = getArgs();

  // --remote requires --env
  if (remote && !env) {
    console.error('Error: --remote requires --env staging|production');
    process.exit(2);
  }

  // Determine the D1 database name to target
  const dbName = env
    ? `skill-registry-${env}`
    : 'skill-registry';

  // Read packages manifest
  const manifestPath = join(PACKAGES_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('No packages manifest found. Run "npm run pack:skills" first.');
    process.exit(1);
  }

  const packages: PackageMeta[] = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  if (packages.length === 0) {
    console.log('No packages to import.');
    process.exit(0);
  }

  // Generate SQL
  const sqlStatements: string[] = [];

  for (const pkg of packages) {
    // Read manifest for description and metadata
    const manifestFile = join(MANIFESTS_DIR, `${pkg.skillName}.json`);
    let manifest: { description?: string; compatibility?: string[]; tags?: string[]; category?: string } = {};
    if (existsSync(manifestFile)) {
      manifest = JSON.parse(readFileSync(manifestFile, 'utf-8'));
    }

    const description = manifest.description || pkg.skillName;
    const compatibility = (manifest.compatibility || []).join(',');
    const tags = (manifest.tags || []).join(',');
    const category = manifest.category || null;
    const r2Key = `skills/${pkg.skillName}/${pkg.version}.tar.gz`;

    // UPSERT skills table
    sqlStatements.push(`
INSERT INTO skills (name, description, category, tags, compatibility, latest_version, review_status, lifecycle_status)
VALUES ('${escapeSql(pkg.skillName)}', '${escapeSql(description)}', ${category ? `'${escapeSql(category)}'` : 'NULL'}, ${tags ? `'${escapeSql(tags)}'` : 'NULL'}, '${escapeSql(compatibility)}', '${escapeSql(pkg.version)}', 'pending', 'active')
ON CONFLICT(name) DO UPDATE SET
  description = excluded.description,
  category = COALESCE(excluded.category, skills.category),
  tags = COALESCE(excluded.tags, skills.tags),
  compatibility = excluded.compatibility,
  latest_version = excluded.latest_version,
  updated_at = datetime('now')
WHERE excluded.latest_version > skills.latest_version;
`.trim());

    // UPSERT skill_versions (immutability check)
    sqlStatements.push(`
INSERT INTO skill_versions (skill_name, version, sha256, size, r2_key)
VALUES ('${escapeSql(pkg.skillName)}', '${escapeSql(pkg.version)}', '${pkg.sha256}', ${pkg.size}, '${escapeSql(r2Key)}')
ON CONFLICT(skill_name, version) DO UPDATE SET
  sha256 = excluded.sha256,
  size = excluded.size,
  r2_key = excluded.r2_key
WHERE skill_versions.sha256 = excluded.sha256;
`.trim());
  }

  const fullSql = sqlStatements.join('\n\n');

  if (dryRun) {
    console.log('=== Dry Run SQL ===\n');
    console.log(fullSql);
    console.log(`\n=== ${sqlStatements.length} statements generated ===`);
    return;
  }

  // Write SQL to temp file
  writeFileSync(IMPORT_SQL_PATH, fullSql);

  const flags = remote ? '--remote' : '--local';
  const envFlag = env ? `--env ${env}` : '';
  const command = `npx wrangler d1 execute ${dbName} ${flags} ${envFlag} --file=../../artifacts/import.sql`;

  console.log(`Executing import (${remote ? `remote/${env}` : 'local'})...`);
  console.log(`  ${packages.length} package(s) to import\n`);

  try {
    execSync(command, {
      cwd: WORKER_DIR,
      stdio: 'inherit',
      timeout: 120000,
    });
    console.log(`\n✅ Import complete: ${packages.length} package(s)`);
  } catch (err) {
    console.error('\n❌ Import failed');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    // Clean up temp file
    if (existsSync(IMPORT_SQL_PATH)) {
      unlinkSync(IMPORT_SQL_PATH);
    }
  }
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

main();
