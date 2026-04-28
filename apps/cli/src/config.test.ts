import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

import {
  getConfig,
  readLock,
  writeLock,
  addToLock,
  removeFromLock,
  getConfigPaths,
} from './config';

const TEST_HOME = resolve('/tmp', 'skillr-test-config');
const origHome = process.env.HOME;

beforeAll(() => {
  // Use temp home for testing
  process.env.HOME = TEST_HOME;
  if (existsSync(TEST_HOME)) rmSync(TEST_HOME, { recursive: true, force: true });
  mkdirSync(TEST_HOME, { recursive: true });
});

afterEach(() => {
  // Clean up between tests
  const { global: globalPath } = getConfigPaths();
  if (existsSync(join(globalPath, '..'))) {
    rmSync(join(globalPath, '..'), { recursive: true, force: true });
  }
  // Also clean project config if exists
  const projectDir = resolve('.skillr');
  if (existsSync(projectDir)) rmSync(projectDir, { recursive: true, force: true });
});

describe('Config', () => {
  it('should return empty config when no files exist', () => {
    const config = getConfig();
    expect(config.registry).toBeUndefined();
    expect(config.token).toBeUndefined();
  });

  it('should read env vars', () => {
    process.env.SKILLR_REGISTRY_URL = 'https://test.example.com';
    process.env.SKILLR_TOKEN = 'test-token';
    const config = getConfig();
    expect(config.registry).toBe('https://test.example.com');
    expect(config.token).toBe('test-token');
    delete process.env.SKILLR_REGISTRY_URL;
    delete process.env.SKILLR_TOKEN;
  });

  it('should provide config paths', () => {
    const paths = getConfigPaths();
    expect(paths.global).toContain('.skillr');
    expect(paths.project).toContain('.skillr');
    expect(paths.globalLock).toContain('skillr.lock');
  });
});

describe('LockFile', () => {
  it('should return empty lock when no file exists', () => {
    const lock = readLock('global');
    expect(lock.version).toBe('1');
    expect(lock.skills).toHaveLength(0);
  });

  it('should add and read skills', () => {
    addToLock({
      name: 'test-skill',
      version: '1.0.0',
      sha256: 'abc123',
      installedAt: '2025-01-01T00:00:00Z',
      target: 'opencode',
    }, 'global');

    const lock = readLock('global');
    expect(lock.skills).toHaveLength(1);
    expect(lock.skills[0].name).toBe('test-skill');
    expect(lock.skills[0].target).toBe('opencode');
  });

  it('should update existing entries', () => {
    addToLock({
      name: 'test-skill',
      version: '1.0.0',
      sha256: 'abc123',
      installedAt: '2025-01-01T00:00:00Z',
      target: 'opencode',
    }, 'global');

    addToLock({
      name: 'test-skill',
      version: '2.0.0',
      sha256: 'def456',
      installedAt: '2025-02-01T00:00:00Z',
      target: 'opencode',
    }, 'global');

    const lock = readLock('global');
    expect(lock.skills).toHaveLength(1); // Should update, not duplicate
    expect(lock.skills[0].version).toBe('2.0.0');
  });

  it('should handle multiple targets for same skill', () => {
    addToLock({ name: 'test-skill', version: '1.0.0', sha256: 'a', installedAt: '', target: 'opencode' }, 'global');
    addToLock({ name: 'test-skill', version: '1.0.0', sha256: 'a', installedAt: '', target: 'claude-code' }, 'global');

    const lock = readLock('global');
    expect(lock.skills).toHaveLength(2); // Different targets
  });

  it('should remove skills', () => {
    addToLock({ name: 'test-skill', version: '1.0.0', sha256: 'a', installedAt: '', target: 'opencode' }, 'global');
    removeFromLock('test-skill', 'opencode', 'global');

    const lock = readLock('global');
    expect(lock.skills).toHaveLength(0);
  });
});
