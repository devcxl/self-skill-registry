import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

// ─── Types ─────────────────────────────────────────────────────────────

export interface SkillrConfig {
  registry?: string;
  token?: string;
}

export interface LockEntry {
  name: string;
  version: string;
  sha256: string;
  installedAt: string;
  target: string;
}

export interface LockFile {
  version: string;
  skills: LockEntry[];
}

// ─── Paths ─────────────────────────────────────────────────────────────

function getGlobalConfigPath(): string {
  const dir = join(homedir(), '.skillr');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'config.json');
}

function getGlobalLockPath(): string {
  const dir = join(homedir(), '.skillr');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'skillr.lock');
}

function getProjectConfigPath(): string {
  return resolve('.skillr', 'config.json');
}

function getProjectLockPath(): string {
  return resolve('.skillr', 'skillr.lock');
}

// ─── Config Reading ────────────────────────────────────────────────────

/** Read config from file or return empty */
function readJsonFile<T>(path: string): T | null {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch { /* file not found or invalid */ }
  return null;
}

/** Get config merged from env vars, project, and global config */
export function getConfig(): SkillrConfig {
  const config: SkillrConfig = {};

  // 1. Global config (lowest priority)
  const global = readJsonFile<SkillrConfig>(getGlobalConfigPath());
  if (global) Object.assign(config, global);

  // 2. Project config
  const project = readJsonFile<SkillrConfig>(getProjectConfigPath());
  if (project) Object.assign(config, project);

  // 3. Environment variables (highest priority)
  if (process.env.SKILLR_REGISTRY_URL) config.registry = process.env.SKILLR_REGISTRY_URL;
  if (process.env.SKILLR_TOKEN) config.token = process.env.SKILLR_TOKEN;

  return config;
}

/** Save config to a specific level */
export function saveConfig(values: Record<string, string>, level: 'global' | 'project'): void {
  const path = level === 'global' ? getGlobalConfigPath() : getProjectConfigPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const existing = readJsonFile<SkillrConfig>(path) || {};
  const merged = { ...existing };
  for (const [k, v] of Object.entries(values)) {
    if (v) merged[k as keyof SkillrConfig] = v;
    else delete merged[k as keyof SkillrConfig];
  }

  writeFileSync(path, JSON.stringify(merged, null, 2));
}

// ─── Lock File ─────────────────────────────────────────────────────────

/** Read lock file */
export function readLock(level: 'global' | 'project'): LockFile {
  const path = level === 'global' ? getGlobalLockPath() : getProjectLockPath();
  const data = readJsonFile<LockFile>(path);
  return data || { version: '1', skills: [] };
}

/** Write lock file */
export function writeLock(lock: LockFile, level: 'global' | 'project'): void {
  const path = level === 'global' ? getGlobalLockPath() : getProjectLockPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(lock, null, 2));
}

/** Add or update a skill entry in the lock file */
export function addToLock(entry: LockEntry, level: 'global' | 'project'): void {
  const lock = readLock(level);
  const idx = lock.skills.findIndex((s) => s.name === entry.name && s.target === entry.target);
  if (idx >= 0) {
    lock.skills[idx] = entry;
  } else {
    lock.skills.push(entry);
  }
  writeLock(lock, level);
}

/** Remove a skill from lock file */
export function removeFromLock(name: string, target: string, level: 'global' | 'project'): void {
  const lock = readLock(level);
  lock.skills = lock.skills.filter((s) => !(s.name === name && s.target === target));
  writeLock(lock, level);
}

/** Get config path info for display */
export function getConfigPaths() {
  return {
    global: getGlobalConfigPath(),
    project: getProjectConfigPath(),
    globalLock: getGlobalLockPath(),
    projectLock: getProjectLockPath(),
  };
}
