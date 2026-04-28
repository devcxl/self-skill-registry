import {
  existsSync, mkdirSync, writeFileSync, readFileSync, rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

import { addToLock, removeFromLock, readLock, getConfig } from './config';
import { RegistryClient } from './client';
import type { LockEntry } from './config';

// ─── Target Paths ──────────────────────────────────────────────────────

export const TARGET_PATHS: Record<string, string> = {
  opencode: resolve(homedir(), '.config', 'opencode', 'skills'),
  'claude-code': resolve(homedir(), '.claude', 'skills'),
  codex: resolve(homedir(), '.config', 'codex', 'skills'),
};

function homedir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/tmp';
}

// ─── SHA Verification ─────────────────────────────────────────────────

function computeSha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

// ─── Install ───────────────────────────────────────────────────────────

export interface InstallOptions {
  target?: string;
  version?: string;
  project?: boolean;
  force?: boolean;
}

export async function installSkill(name: string, options: InstallOptions = {}): Promise<void> {
  const client = new RegistryClient();
  const target = options.target || 'all';
  const level = options.project ? 'project' : 'global';
  const targets = target === 'all' ? Object.keys(TARGET_PATHS) : [target];

  for (const t of targets) {
    if (!TARGET_PATHS[t]) {
      throw new Error(`Unknown target: ${t}. Valid: ${Object.keys(TARGET_PATHS).join(', ')}`);
    }
  }

  console.log(`\n📥 Installing ${name}...`);

  let version = options.version;
  let expectedSha = '';
  if (!version) {
    const info = await client.info(name);
    version = info.latestVersion;
    const versions = await client.versions(name);
    const ver = versions.find((v) => v.version === version);
    if (ver) expectedSha = ver.sha256;
    console.log(`   Latest version: ${version} (score: ${info.latestScore})`);
  }

  console.log(`   Downloading v${version}...`);
  const { buffer, sha256: headerSha } = await client.download(name, version);
  const verifiedSha = headerSha || expectedSha;

  if (!verifiedSha) {
    console.warn('   ⚠️  No SHA-256 available, skipping integrity check');
  }

  // Save to temp file
  const tmpDir = resolve('/tmp', `skillr-${name}`);
  mkdirSync(tmpDir, { recursive: true });
  const tarballPath = join(tmpDir, `${name}-${version}.tar.gz`);
  writeFileSync(tarballPath, new Uint8Array(buffer));

  // Verify SHA
  if (verifiedSha) {
    const actualSha = computeSha256(tarballPath);
    if (actualSha !== verifiedSha && !options.force) {
      rmSync(tmpDir, { recursive: true, force: true });
      throw new Error(
        `SHA-256 mismatch!\n  Expected: ${verifiedSha}\n  Got:      ${actualSha}\n  Use --force to skip.`,
      );
    }
    console.log(`   SHA-256 verified: ${verifiedSha.slice(0, 16)}...`);
  }

  // Extract to each target
  for (const t of targets) {
    const destDir = TARGET_PATHS[t];
    const skillDest = join(destDir, name);

    // Conflict check
    if (existsSync(skillDest) && !options.force) {
      const lock = readLock(level);
      const existing = lock.skills.find((s) => s.name === name && s.target === t);
      if (existing) {
        console.warn(`   ⚠️  ${name} already installed (v${existing.version}). Use --force to overwrite.`);
        continue;
      }
    }

    if (existsSync(skillDest) && options.force) {
      rmSync(skillDest, { recursive: true, force: true });
    }

    // Extract tarball
    mkdirSync(destDir, { recursive: true });
    execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}/extract"`, { stdio: 'pipe' });
    mkdirSync(join(tmpDir, 'extract'), { recursive: true });

    // Move files
    const extracted = join(tmpDir, 'extract');
    execSync(`tar -xzf "${tarballPath}" -C "${extracted}"`, { stdio: 'pipe' });

    // Find the skill root (it might be wrapped in a folder)
    const skillContent = join(extracted, name);
    const targetPath = existsSync(skillContent) ? skillContent : extracted;
    execSync(`cp -r "${targetPath}/" "${skillDest}"`, { stdio: 'pipe' });

    // Cleanup extract
    rmSync(extracted, { recursive: true, force: true });

    // Check SKILL.md exists
    if (!existsSync(join(skillDest, 'SKILL.md'))) {
      console.warn(`   ⚠️  SKILL.md not found in extracted package`);
    }

    addToLock({
      name, version,
      sha256: verifiedSha,
      installedAt: new Date().toISOString(),
      target: t,
    }, level);

    console.log(`   ✅ Installed to ${t}: ${skillDest}`);
  }

  rmSync(tmpDir, { recursive: true, force: true });
}

// ─── Update ────────────────────────────────────────────────────────────

export async function updateSkill(name?: string, options: { target?: string; project?: boolean } = {}): Promise<void> {
  const level = options.project ? 'project' : 'global';
  const lock = readLock(level);
  const toUpdate = name ? lock.skills.filter((s) => s.name === name) : lock.skills;

  if (toUpdate.length === 0) {
    console.log(name ? `Skill "${name}" not found.` : 'No skills installed.');
    return;
  }

  for (const entry of toUpdate) {
    try {
      const client = new RegistryClient();
      const info = await client.info(entry.name);
      if (info.latestVersion === entry.version) {
        console.log(`   ${entry.name}: Already at latest (v${entry.version})`);
        continue;
      }
      console.log(`\n📥 Updating ${entry.name} v${entry.version} → v${info.latestVersion}...`);
      await installSkill(entry.name, { target: entry.target, project: options.project, force: true });
    } catch (err) {
      console.error(`   ❌ ${entry.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ─── Remove ────────────────────────────────────────────────────────────

export function removeSkill(name: string, options: { target?: string; project?: boolean } = {}): void {
  const level = options.project ? 'project' : 'global';
  const target = options.target || 'all';
  const targets = target === 'all' ? Object.keys(TARGET_PATHS) : [target];

  for (const t of targets) {
    if (!TARGET_PATHS[t]) continue;
    const skillDir = join(TARGET_PATHS[t], name);
    if (existsSync(skillDir)) {
      rmSync(skillDir, { recursive: true, force: true });
      console.log(`🗑️  Removed ${name} from ${t}`);
    } else {
      console.log(`   ${name} not in ${t}`);
    }
    removeFromLock(name, t, level);
  }
}

// ─── List ──────────────────────────────────────────────────────────────

export function listSkills(options: { project?: boolean } = {}): void {
  const level = options.project ? 'project' : 'global';
  const lock = readLock(level);

  console.log(`\n📋 Installed skills (${level}):`);
  if (lock.skills.length === 0) { console.log('   (none)'); return; }

  const byTarget = new Map<string, LockEntry[]>();
  for (const s of lock.skills) {
    if (!byTarget.has(s.target)) byTarget.set(s.target, []);
    byTarget.get(s.target)!.push(s);
  }

  for (const [target, skills] of byTarget.entries()) {
    console.log(`\n   ${target}:`);
    for (const s of skills) {
      console.log(`     ${s.name}@${s.version}  sha=${s.sha256.slice(0, 12)}  ${s.installedAt?.slice(0, 10) || ''}`);
    }
  }
  console.log('');
}
