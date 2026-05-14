<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# nodejs-cli-aur-packager Evaluation

**Date:** 2026-05-14
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Automated score:** 100% (13/13 structural checks passed)

---

## Automated Checks

```
[STRUCTURE]
  ✅ SKILL.md exists
  ✅ SKILL.md has valid frontmatter
  ✅ Skill name matches directory
  ✅ No extraneous files
  ✅ Resource directories are non-empty

[TRIGGER]
  ✅ Description length adequate (74 words)
  ✅ Description includes trigger contexts (found "Use when")

[DOCUMENTATION]
  ✅ SKILL.md body length (180 lines)
  ✅ References are linked from SKILL.md

[SCRIPTS]
  ✅ No scripts/ directory — skill is documentation/procedure-based

[SECURITY]
  ✅ No hardcoded credentials or emails
  ✅ No scripts requiring credential audit
```

## Manual Assessment

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | Covers full workflow: npm metadata → tarball → PKGBUILD → wrapper scripts → makepkg verification. Edge cases (scoped packages, multiple bins, missing LICENSE) addressed. |
| 1.2 | Correctness | 3/4 | Procedural guidance is sound. No embedded code to run, so correctness depends on agent execution. Template is correct. Minor: `license` field in template uses array syntax consistent with Arch. |
| 1.3 | Appropriateness | 4/4 | Perfect fit: uses npm tarballs (no git clone), follows Arch PKGBUILD conventions, avoids postinstall by default. Zero external deps beyond standard Arch tools. |
| 2.1 | Fault Tolerance | 3/4 | Documents high-risk points (postinstall, missing LICENSE, engines.node version mismatch). Guidance to skip postinstall by default. No retry logic since this is a procedural skill. |
| 2.2 | Error Reporting | 3/4 | Skill is instructional; error reporting depends on makepkg output. Checklist-style verification steps give agents clear pass/fail criteria. |
| 2.3 | Recoverability | 3/4 | Idempotent by nature (re-running regenerates PKGBUILD/.SRCINFO). No state to corrupt. |
| 3.1 | Token Cost | 4/4 | 189-line SKILL.md + 132-line reference template. Good progressive disclosure: long-form guidance in SKILL.md, reusable template in references/. |
| 3.2 | Execution Efficiency | 3/4 | No scripts to audit. Workflow steps are straightforward curl/sha256sum/makepkg calls. |
| 4.1 | Learnability | 4/4 | Step-by-step numbered workflow. Decision tree for applicability. Examples of good/bad patterns. Clear trigger phrases in description. |
| 4.2 | Consistency | 3/4 | Bash code samples are consistent in style. Workflow steps follow uniform structure. Minor inconsistency: template uses `install -Dm644` for license but SKILL.md doesn't specify this pattern explicitly. |
| 4.3 | Feedback Quality | 3/4 | Instructs agent to report: PKGBUILD path, .SRCINFO path, .pkg.tar.zst path, sha256, verification commands run. Clear output requirements. |
| 4.4 | Error Prevention | 3/4 | "High risk points" section highlights common mistakes. Explicit rule to verify with `makepkg --printsrcinfo` and `makepkg -f`. |
| 5.1 | Discoverability | 3/4 | Triggers are Chinese + English. Multiple trigger patterns. Human users would need to read SKILL.md to understand the workflow. |
| 5.2 | Forgiveness | 3/4 | Regenerating PKGBUILD is safe (idempotent). `makepkg -f` overwrites safely. Output requirements make it easy to audit. |
| 6.1 | Credential Handling | 4/4 | No credentials in skill. Uses public npm registry URLs. No secrets needed. |
| 6.2 | Input Validation | 3/4 | Validates npm metadata fields before writing PKGBUILD. Checks tarball contents before proceeding. Template substitution points are clearly marked. |
| 6.3 | Data Safety | 4/4 | No destructive operations. All writes are to user-specified paths in PKGBUILD context. Build artifacts are local. |
| 7.1 | Modularity | 4/4 | Template is separate from SKILL.md. Separate `references/pkgbuild-template.md` for reusable content. Well-structured. |
| 7.2 | Modifiability | 4/4 | Adding new cases is copy-paste-modify from template. Clear placeholder conventions. |
| 7.3 | Testability | 4/4 | N/A — this is a procedural/documentation skill, not executable code. Verification is via makepkg. |
| 8.1 | Trigger Precision | 3/4 | Good trigger coverage: Chinese and English keywords. Slight concern: "generate PKGBUILD" might overlap with general AUR packaging skills if they exist. |
| 8.2 | Progressive Disclosure | 4/4 | SKILL.md (180 lines workflow + reference) → pkgbuild-template.md (132 lines). Two levels. Reference is loaded on demand. |
| 8.3 | Composability | 3/4 | Output requirements (PKGBUILD path, sha256, etc.) provide structured-ish results. No --json flag since it's a workflow, not a CLI tool. |
| 8.4 | Idempotency | 4/4 | PKGBUILD generation is idempotent. `makepkg -f` safely overwrites. SHA256 recomputation is deterministic. |
| 8.5 | Escape Hatches | 3/4 | Agents can deviate from template since it's documentation, not enforced code. "Read the script and confirm" escape hatch for postinstall. |
| | **TOTAL** | **91/100** | |

## Priority Fixes

### P0 — Fix Before Publishing
None. No blocking issues found.

### P1 — Should Fix
1. **Trigger ambiguity**: "generate PKGBUILD" / "为 npm 包生成 PKGBUILD" could trigger unintended skills if a general AUR or PKGBUILD skill exists in the registry. Consider more specific triggers like "npm CLI to AUR" or "package npm CLI tool to Arch Linux AUR".

### P2 — Nice to Have
1. Add an example of a real package transformation (before/after PKGBUILD) to illustrate the workflow.
2. The template's `license` uses array syntax `('GPL')` but could be more explicit about SPDX vs AUR license field names.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-05-14 | 91/100 | Baseline — initial evaluation |