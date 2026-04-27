import { describe, it, expect } from 'vitest';
import { validateTarPath, sha256 } from './pack';

describe('validateTarPath', () => {
  it('should accept normal paths', () => {
    expect(validateTarPath('example-skill/SKILL.md')).toBe(true);
    expect(validateTarPath('example-skill/scripts/helper.ts')).toBe(true);
    expect(validateTarPath('example-skill/references/doc.md')).toBe(true);
  });

  it('should reject path traversal', () => {
    expect(validateTarPath('../etc/passwd')).toBe(false);
    expect(validateTarPath('skills/../../etc/shadow')).toBe(false);
    expect(validateTarPath('..\\..\\windows')).toBe(false);
  });

  it('should reject absolute paths', () => {
    expect(validateTarPath('/etc/passwd')).toBe(false);
    expect(validateTarPath('/root/.ssh')).toBe(false);
  });

  it('should reject empty paths', () => {
    expect(validateTarPath('')).toBe(false);
    expect(validateTarPath('   ')).toBe(false);
  });

  it('should reject null bytes', () => {
    expect(validateTarPath('safe\0dangerous')).toBe(false);
  });
});

describe('sha256', () => {
  it('should compute hash of a buffer', async () => {
    const data = new TextEncoder().encode('hello world');
    const hash = await sha256(data);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce different hashes for different inputs', async () => {
    const h1 = await sha256(new TextEncoder().encode('a'));
    const h2 = await sha256(new TextEncoder().encode('b'));
    expect(h1).not.toEqual(h2);
  });

  it('should produce consistent hashes', async () => {
    const data = new TextEncoder().encode('test');
    const h1 = await sha256(data);
    const h2 = await sha256(data);
    expect(h1).toEqual(h2);
  });
});
