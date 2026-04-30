---
skillName: github-release-checker
skillVersion: 2.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 77
categoryScores:
  functional-suitability: 10
  reliability: 9
  performance: 7
  usability-ai: 12
  usability-human: 6
  security: 11
  maintainability: 9
  agent-specific: 16
findings: []
summary: >-
  The skill is approved with a 77/100 baseline score. Core
  release-fetching workflow, option surface, and safety profile are solid;
  the main follow-up items are retry handling, documentation depth around
  version matching, and stronger automated test coverage.
reviewedAt: 2026-04-29T00:00:00Z
reviewer: AI-Evaluator
---

# github-release-checker Evaluation

**Date:** 2026-04-29
**Evaluator:** AI-Evaluator
**Skill version:** 2.0.0
**Automated score:** 13 pass, 0 warn, 0 fail

---

## Automated Checks

```
{
  "skill": "github-release-checker",
  "path": "/home/runner/work/self-skill-registry/self-skill-registry/skills/github-release-checker",
  "checks": [
    {"name": "SKILL.md exists", "status": "pass", "message": "", "category": "structure"},
    {"name": "SKILL.md has valid frontmatter", "status": "pass", "message": "", "category": "structure"},
    {"name": "Skill name matches directory", "status": "pass", "message": "", "category": "structure"},
    {"name": "No extraneous files", "status": "pass", "message": "", "category": "structure"},
    {"name": "Resource directories are non-empty", "status": "pass", "message": "", "category": "structure"},
    {"name": "Description length adequate", "status": "pass", "message": "60 words", "category": "trigger"},
    {"name": "Description includes trigger contexts", "status": "pass", "message": "Found: use when, when the user", "category": "trigger"},
    {"name": "SKILL.md body length", "status": "pass", "message": "87 lines", "category": "documentation"},
    {"name": "References are linked from SKILL.md", "status": "pass", "message": "No references/ directory", "category": "documentation"},
    {"name": "Python scripts parse without errors", "status": "pass", "message": "1 script(s) OK", "category": "scripts"},
    {"name": "Scripts use no external dependencies", "status": "pass", "message": "", "category": "scripts"},
    {"name": "No hardcoded credentials or emails", "status": "pass", "message": "", "category": "security"},
    {"name": "Environment variables documented", "status": "pass", "message": "All 1 env vars documented", "category": "security"}
  ],
  "summary": {"pass": 13, "warn": 0, "fail": 0}
}
```

## Manual Assessment

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 3/4 | Covers core workflow: parse, fetch, filter, summarize. Well-covered domain. Minor gap: no GitHub API token validation beyond existence check. |
| 1.2 | Correctness | 3/4 | Version parsing (parse_version) and range matching (tag_in_range) work correctly. HTTP error handling thorough. Minor: body truncation uses 8000 char hardcode. |
| 1.3 | Appropriateness | 4/4 | Zero external deps, pure stdlib (urllib, json, re). Platform-native CLI. Portable and clean. |
| 2.1 | Fault Tolerance | 3/4 | Handles 404 (repo not found), 403 (rate limit), 401 (auth fail), network errors. Warns when rate limit low. Does not retry transient errors. |
| 2.2 | Error Reporting | 3/4 | Actionable stderr messages with Chinese context. HTTP errors show status codes. Rate limit errors suggest GITHUB_TOKEN fix. |
| 2.3 | Recoverability | 3/4 | GET-only operations are idempotent. Re-running is safe but re-fetches all pages. No checkpoint/resume. |
| 3.1 | Token Cost | 4/4 | SKILL.md is 105 lines — well under 150. Every line earns its place. |
| 3.2 | Execution Efficiency | 3/4 | Pagination works (max_pages default 10). Fetches all pages before filtering. Acceptable for the use case. |
| 4.1 | Learnability | 3/4 | --help works, examples in SKILL.md, workflow steps clear. Minor edge cases (version matching edge cases) need source. |
| 4.2 | Consistency | 3/4 | Consistent arg parsing loop, consistent stderr usage via --verbose, consistent output formatting. |
| 4.3 | Feedback Quality | 3/4 | --verbose outputs progress to stderr. --dry-run shows planned API calls. Exit codes 0/1/2/3/4 distinguish outcomes. |
| 4.4 | Error Prevention | 3/4 | repo format validated via regex, --per-page validated 1-100, unknown flags caught early. Good input gatekeeping. |
| 5.1 | Discoverability | 3/4 | --help works, documents all options, SKILL.md shows examples. |
| 5.2 | Forgiveness | 3/4 | Read-only GET operations. No destructive changes possible. |
| 6.1 | Credential Handling | 4/4 | GITHUB_TOKEN via env var only. No hardcoded credentials. Documented. |
| 6.2 | Input Validation | 3/4 | Good repo format validation (regex). per_page range checked. Version tag validation handled gracefully via parse_version fallback. |
| 6.3 | Data Safety | 4/4 | Read-only GET requests. No file writes. Safe. |
| 7.1 | Modularity | 3/4 | Well-organized: version parsing, API calls, data fetching, output formatting, main. Clear separation. |
| 7.2 | Modifiability | 3/4 | Adding new flags is copy-paste from existing flags. parse_args pattern is clear. |
| 7.3 | Testability | 3/4 | Core functions (parse_version, tag_in_range, validate_repo) return values. API layer (make_request) could be mocked. No test suite but functions are testable. |
| 8.1 | Trigger Precision | 3/4 | Good domain keywords (github, release, changelog). Chinese + English triggers. Some overlap with general GitHub tools. |
| 8.2 | Progressive Disclosure | 2/4 | Single SKILL.md (105 lines). Version matching logic (tag_in_range) documented in code but not explained in docs. No references/. |
| 8.3 | Composability | 3/4 | --json outputs machine-readable JSON. --dry-run for planning. Exit codes distinguish success/failure. Good for pipeline use. |
| 8.4 | Idempotency | 4/4 | All GET requests. Re-running produces same results. No side effects. |
| 8.5 | Escape Hatches | 4/4 | Rich override flags: --dry-run, --verbose, --json, --github-token, --max-pages, --per-page, --include-prereleases, --include-drafts. Excellent coverage. |
| | **TOTAL** | **77/100** | |

## Priority Fixes

### P0 — Fix Before Publishing
_(none)_

### P1 — Should Fix
1. **2.1 Fault Tolerance (3/4)** — No retry logic for transient errors. Rate limit warning only (no automatic wait/retry). Consider adding --retries flag or exponential backoff.
2. **8.2 Progressive Disclosure (2/4)** — No references/ directory despite complex version matching logic. Version filtering logic (tag_in_range, start/end boundary behavior) is in code but not explained in documentation.

### P2 — Nice to Have
1. Add test suite — core functions (parse_version, tag_in_range) are testable but no tests exist.
2. Add references/ directory with version matching explanation for AI agents.
3. Consider --output flag for writing to file instead of stdout.

## Revision History

| Date | Score | Notes |
|------|-------|-------|
| 2026-04-29 | 77/100 | Baseline after script implementation added |
