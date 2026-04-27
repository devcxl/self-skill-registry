import type { SecurityScanResult } from './types';

// ─── Secret Patterns ───────────────────────────────────────────────────

/** Patterns that indicate potential credential leakage */
const SECRET_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // API keys (generic)
  { pattern: /(?:api[-_]?key|apikey|api[-_]?secret)\s*[:=]\s*['"][A-Za-z0-9_\-!@#$%^&*()+=]{8,}['"]/gi, name: 'API Key' },
  { pattern: /(?:secret[-_]?key|secretkey|private[-_]?key)\s*[:=]\s*['"][A-Za-z0-9_\-!@#$%^&*()+=]{8,}['"]/gi, name: 'Secret Key' },

  // Cloudflare
  { pattern: /(?:cloudflare[-_]?(?:api[-_]?token|api[-_]?key))\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'Cloudflare Token' },

  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key' },
  { pattern: /(?:aws[-_]?(?:secret|session))\s*[:=]\s*['"][A-Za-z0-9/+]{20,}={0,2}['"]/gi, name: 'AWS Secret Key' },

  // GitHub tokens
  { pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, name: 'GitHub Token' },
  { pattern: /github[-_]?token\s*[:=]\s*['"][A-Za-z0-9_]{10,}['"]/gi, name: 'GitHub Token' },

  // Generic tokens / passwords
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^\s]{1,}['"]/gi, name: 'Password' },
  { pattern: /(?:token|auth)\s*[:=]\s*['"][A-Za-z0-9_\-.]{20,}['"]/gi, name: 'Auth Token' },

  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, name: 'JWT Token' },

  // Private keys
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, name: 'Private Key' },
  { pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/g, name: 'EC Private Key' },
  { pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/g, name: 'SSH Private Key' },
];

// ─── Hidden File Patterns ──────────────────────────────────────────────

const HIDDEN_FILES: string[] = [
  '.env',
  '.env.local',
  '.env.production',
  '.credentials',
  '.secret',
  'credentials.json',
  'secrets.json',
  '.npmrc',
];

// ─── Path Traversal Patterns ───────────────────────────────────────────

const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.\/\.\./g,       // ../..
  /\/etc\/passwd/g,    // /etc/passwd access
  /\/etc\/shadow/g,    // /etc/shadow access
  /C:\\Windows\\/gi,   // Windows system paths
  /\/root\//g,         // /root/ access
  /\/\.ssh\//g,         // .ssh directory
];

// ─── External Dependency / Network Patterns ────────────────────────────

const NETWORK_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s"'`]+/gi,       // HTTP URLs
  /fetch\s*\(\s*['"][^'"]+['"]/gi, // fetch() calls with URL string
  /curl\s+[^\s]+/gi,               // curl commands
  /wget\s+[^\s]+/gi,               // wget commands
  /\bimport\s+.*\bfrom\s+['"]https?:/gi,  // Import from URL
];

const NETWORK_DOMAINS_WHITELIST: string[] = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'docs.github.com',
];

// ─── Safe File Extension Check ─────────────────────────────────────────

const UNSAFE_EXTENSIONS: string[] = [
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.sh', '.bash', '.zsh', '.fish',
  '.ps1', '.bat', '.cmd',
];

// ─── Implementation ────────────────────────────────────────────────────

/**
 * Scan file content for obvious credential patterns.
 */
export function scanForSecrets(
  filePath: string,
  content: string,
): { findings: SecurityScanResult['findings']; errorCount: number } {
  const findings: SecurityScanResult['findings'] = [];
  let errorCount = 0;

  for (const { pattern, name } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      findings.push({
        path: filePath,
        severity: 'error',
        message: `Potential ${name} found (${matches.length} match(es))`,
      });
      errorCount++;
    }
  }

  return { findings, errorCount };
}

/**
 * Check file paths for potential path traversal risks.
 * Accepts a list of file paths within the skill directory.
 */
export function checkPathTraversal(files: string[]): SecurityScanResult['findings'] {
  const findings: SecurityScanResult['findings'] = [];

  for (const filePath of files) {
    // Check for hidden sensitive files
    const fileName = filePath.split('/').pop() || filePath;
    if (HIDDEN_FILES.includes(fileName)) {
      findings.push({
        path: filePath,
        severity: 'error',
        message: `Hidden sensitive file detected: ${fileName}`,
      });
    }

    // Check path traversal in file paths
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(filePath)) {
        findings.push({
          path: filePath,
          severity: 'error',
          message: `Path traversal risk detected in file path`,
        });
      }
    }

    // Check content for path traversal references
    // (handled separately when reading file contents)
  }

  return findings;
}

/**
 * Check file content for path traversal references.
 */
export function checkContentPathTraversal(
  filePath: string,
  content: string,
): SecurityScanResult['findings'] {
  const findings: SecurityScanResult['findings'] = [];

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(content)) {
      findings.push({
        path: filePath,
        severity: 'warning',
        message: `Content references potentially sensitive paths`,
      });
      break; // One warning per file
    }
  }

  return findings;
}

/**
 * Detect external dependencies and network access patterns.
 * Files with network access or external imports are flagged for manual review.
 */
export function checkExternalDependencies(
  filePath: string,
  content: string,
): { findings: SecurityScanResult['findings']; hasNetworkAccess: boolean } {
  const findings: SecurityScanResult['findings'] = [];
  let hasNetworkAccess = false;

  for (const pattern of NETWORK_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Check if all URLs are whitelisted
      const allWhitelisted = matches.every((url) => {
        const normalized = url.toLowerCase();
        return NETWORK_DOMAINS_WHITELIST.some((d) => normalized.includes(d));
      });

      if (!allWhitelisted) {
        findings.push({
          path: filePath,
          severity: 'warning',
          message: `External network access or dependency detected (${matches.length} reference(s))`,
        });
        hasNetworkAccess = true;
        break; // One warning per file
      }
    }
  }

  return { findings, hasNetworkAccess };
}

/**
 * Check for unsafe file extensions in scripts directory.
 */
export function checkUnsafeExtensions(files: string[]): SecurityScanResult['findings'] {
  const findings: SecurityScanResult['findings'] = [];

  for (const filePath of files) {
    const ext = '.' + (filePath.split('.').pop() || '');
    if (UNSAFE_EXTENSIONS.includes(ext.toLowerCase())) {
      findings.push({
        path: filePath,
        severity: 'warning',
        message: `Potentially unsafe file extension: ${ext}`,
      });
    }
  }

  return findings;
}

/**
 * Comprehensive security scan for a skill directory.
 * Combines all checks into a single result.
 */
export function runSecurityScan(
  files: Array<{ path: string; content?: string }>,
): SecurityScanResult {
  const allFindings: SecurityScanResult['findings'] = [];
  let needsManualReview = false;

  // 1. Check file paths for traversal and hidden files
  const filePaths = files.map((f) => f.path);
  allFindings.push(...checkPathTraversal(filePaths));
  allFindings.push(...checkUnsafeExtensions(filePaths));

  // 2. Scan file contents
  for (const file of files) {
    if (!file.content) continue;

    // Secret scanning
    const { findings: secretFindings } = scanForSecrets(file.path, file.content);
    allFindings.push(...secretFindings);

    // Content path traversal
    const pathFindings = checkContentPathTraversal(file.path, file.content);
    allFindings.push(...pathFindings);

    // External dependencies
    const { findings: extFindings, hasNetworkAccess } = checkExternalDependencies(
      file.path,
      file.content,
    );
    allFindings.push(...extFindings);
    if (hasNetworkAccess) {
      needsManualReview = true;
    }
  }

  const hasErrors = allFindings.some((f) => f.severity === 'error');

  return {
    passed: !hasErrors,
    findings: allFindings,
    needsManualReview,
  };
}
