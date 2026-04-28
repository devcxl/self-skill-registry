import { describe, it, expect } from 'vitest';
import { TARGET_PATHS } from './installer';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

describe('Installer', () => {
  it('should define target paths for all platforms', () => {
    expect(TARGET_PATHS.opencode).toBeDefined();
    expect(TARGET_PATHS['claude-code']).toBeDefined();
    expect(TARGET_PATHS.codex).toBeDefined();
  });

  it('should point to skill directories', () => {
    const home = homedir();
    expect(TARGET_PATHS.opencode).toBe(resolve(home, '.config', 'opencode', 'skills'));
    expect(TARGET_PATHS['claude-code']).toBe(resolve(home, '.claude', 'skills'));
    expect(TARGET_PATHS.codex).toBe(resolve(home, '.config', 'codex', 'skills'));
  });
});
