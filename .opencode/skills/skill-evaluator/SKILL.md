---
name: skill-evaluator
description: Evaluate Clawdbot skills for quality, reliability, and publish-readiness using a multi-framework rubric (ISO 25010, OpenSSF, Shneiderman, agent-specific heuristics). Use when asked to review, audit, evaluate, score, or assess a skill before publishing, or when checking skill quality. Runs automated structural checks and guides manual assessment across 25 criteria.
---

# Skill Evaluator

Evaluate skills across 25 criteria using a hybrid automated + manual approach.

## Critical Rules

1. **One Skill Per PR**: When invoked in CI, only review the ONE skill that was changed in this PR. Do not attempt to review all skills in the repository.

2. **Dual Output Required**: Every review MUST produce TWO outputs:
   - `skills/<skill-name>/EVAL.md` — Human-readable evaluation report body
   - `artifacts/skill-review.json` — Machine-readable structured review data

   The CI workflow will sync the structured JSON into the YAML front matter of `EVAL.md` after your run. Do **not** manually add or maintain front matter inside `EVAL.md`; write the Markdown body only.

3. **Hard Blocking**: If a skill is `rejected`, the CI job MUST fail (exit code 1). This is a hard gate — rejected skills must never be merged.

## Output Specification

### 1. EVAL.md (Human-Readable Body)

Write to `skills/<skill-name>/EVAL.md`. Use the template at [assets/EVAL-TEMPLATE.md](assets/EVAL-TEMPLATE.md).

Important:
- Write the Markdown report body only
- Do not add YAML front matter yourself
- The workflow will inject structured front matter based on `artifacts/skill-review.json`

Must include:
- Skill name, version, review date, evaluator identity
- Automated check results summary
- All 25 criteria scores with notes
- Total score out of 100
- Priority fixes (P0/P1/P2)
- Final verdict (approved / rejected / needs_manual_review)

### 2. skill-review.json (Machine-Readable)

Write to `artifacts/skill-review.json`. Must conform to this structure:

```json
{
  "skillName": "string",
  "skillVersion": "string",
  "reviewStatus": "approved | rejected | needs_manual_review",
  "needsManualReview": false,
  "totalScore": 0,
  "categoryScores": {
    "functional-suitability": 0,
    "reliability": 0,
    "performance": 0,
    "usability-ai": 0,
    "usability-human": 0,
    "security": 0,
    "maintainability": 0,
    "agent-specific": 0
  },
  "findings": [
    {
      "id": "F001",
      "criterion": "criterion-id",
      "category": "category-id",
      "score": 0,
      "description": "Detailed finding description",
      "priority": "P0 | P1 | P2",
      "suggestion": "Optional improvement suggestion"
    }
  ],
  "summary": "Overall assessment summary",
  "reviewedAt": "2025-01-01T00:00:00Z",
  "reviewer": "AI-Evaluator",
  "sourceCommit": "optional git SHA"
}
```

Field rules:
- `totalScore`: Integer 0-100
- `categoryScores`: Must include ALL 8 categories
- Each category max score = number of criteria × 4
- `findings`: Array of ReviewFinding objects
- Each finding: `id` (unique), `criterion` (criteria ID), `category` (category ID), `score` (0-4 integer), `description`, `priority` (P0/P1/P2)
- `needsManualReview`: Set to `true` if the skill uses external network access, imports unknown dependencies, or contains scripts that require human judgment

## Review Status Determination

| Condition | Status | Action |
|-----------|--------|--------|
| Score ≥ 80, no P0 findings | `approved` | Skill is publishable |
| Score < 80 or has P0 findings | `rejected` | Do NOT merge; CI must fail |
| Has network access / external deps / requires human judgment | `needs_manual_review` | Block until admin approves |

**Critical**: `rejected` status MUST cause the CI workflow to fail (hard block). Skills with `needs_manual_review` also block until admin approval.

## Rejection Criteria (Automatic)

A skill is automatically `rejected` when ANY of the following are true:
- Total score < 60
- Any P0 finding exists (credential leak, path traversal, missing SKILL.md, invalid frontmatter)
- Security scan fails (secrets detected, hidden sensitive files)
- Name mismatch between SKILL.md and directory
- Missing required frontmatter fields (name, description, version, compatibility)

## Manual Review Triggers

Set `needsManualReview: true` and `reviewStatus: "needs_manual_review"` when:
- Scripts contain network access (fetch, curl, wget) to non-whitelisted domains
- Scripts import external packages not listed in a manifest
- Skill behavior depends on runtime environment assumptions
- Complex security considerations that AI cannot definitively resolve

## Quick Start

### 1. Run automated checks

```bash
python3 scripts/eval-skill.py /path/to/skill
python3 scripts/eval-skill.py /path/to/skill --json    # machine-readable
python3 scripts/eval-skill.py /path/to/skill --verbose  # show all details
```

Checks: file structure, frontmatter, description quality, script syntax, dependency audit, credential scan, env var documentation.

### 2. Manual assessment

Use the rubric at [references/rubric.md](references/rubric.md) to score 25 criteria across 8 categories (0–4 each, 100 total). Each criterion has concrete descriptions per score level.

### 3. Write the evaluation

Copy [assets/EVAL-TEMPLATE.md](assets/EVAL-TEMPLATE.md) to `skills/<skill-name>/EVAL.md`. Fill in automated results + manual scores.

Do not prepend YAML front matter manually — the workflow owns that step.

Also write `artifacts/skill-review.json` following the schema above.

## Evaluation Process

1. **Run `eval-skill.py`** — get the automated structural score and determine skill type (tool vs. documentation-only)
2. **Read the skill's SKILL.md** — understand what it does
3. **Determine skill type** — If the skill has no executable scripts (`scripts/` empty or absent), apply the **Document-Only Adjustments** in [references/rubric.md](references/rubric.md). Auto-exempt criteria 3.2, 8.3, 8.4, 8.5 (score 4 each). Use adjusted standards for 2.1, 2.2, 4.3, 4.4, 5.2, 7.1, 7.2, 7.3.
4. **Read/skim the scripts** — assess code quality, error handling, testability (skip for doc-only skills)
5. **Score each manual criterion** using [references/rubric.md](references/rubric.md) — concrete criteria per level
6. **Run behavior verification** — if the skill's EVAL.md has test cases in the Behavior Verification section, execute each prompt against an Agent with the skill loaded. Verify outputs against the defined checkpoints. Record pass/fail results. If no test cases exist, flag this as a P1 finding and write test cases.
7. **Prioritize findings** as P0 (blocks publishing) / P1 (should fix) / P2 (nice to have)
8. **Write EVAL.md** in the skill directory with scores + findings
9. **Write skill-review.json** in the artifacts directory

### Behavior Verification Details

行为验证是评估 skill **在使用中的实际表现**，而非仅检查其文件结构。

**验证方法**：
1. 读取 skill EVAL.md 的 "Behavior Verification" 章节中的测试用例表
2. 逐条向 Agent 发送提示词（skill 已加载）
3. 比对输出与验证点：
   - `[D]` 验证点 — 用正则/关键字匹配直接判定 pass/fail
   - `[J]` 验证点 — 人工判断输出质量，给出 pass/fail + 说明
4. 在 EVAL.md 的 "验证结果" 表中填入通过情况

**通过标准**：
- 正向用例必须 100% 通过 → 否则 P0
- 负向用例必须 100% 通过 → 否则 P1
- 边界用例 ≥ 50% 通过 → 否则 P2

**如果 EVAL.md 中没有测试用例**：
- 初审：标记为 P1 缺陷，要求 skill 作者补充
- 复审：必须包含至少 4 条用例（2 正向 + 1 负向 + 1 边界）

## Categories (8 categories, 25 criteria)

| # | Category | Source Framework | Criteria |
|---|----------|-----------------|----------|
| 1 | Functional Suitability | ISO 25010 | Completeness, Correctness, Appropriateness |
| 2 | Reliability | ISO 25010 | Fault Tolerance, Error Reporting, Recoverability |
| 3 | Performance / Context | ISO 25010 + Agent | Token Cost, Execution Efficiency |
| 4 | Usability — AI Agent | Shneiderman, Gerhardt-Powals | Learnability, Consistency, Feedback, Error Prevention |
| 5 | Usability — Human | Tognazzini, Norman | Discoverability, Forgiveness |
| 6 | Security | ISO 25010 + OpenSSF | Credentials, Input Validation, Data Safety |
| 7 | Maintainability | ISO 25010 | Modularity, Modifiability, Testability |
| 8 | Agent-Specific | Novel | Trigger Precision, Progressive Disclosure, Composability, Idempotency, Escape Hatches |

## Interpreting Scores

| Range | Verdict | Action |
|-------|---------|--------|
| 90–100 | Excellent | Publish confidently |
| 80–89 | Good | Publishable, note known issues |
| 70–79 | Acceptable | Fix P0s before publishing |
| 60–69 | Needs Work | Fix P0+P1 before publishing |
| <60 | Not Ready | Significant rework needed |

## Deeper Security Scanning

This evaluator covers security basics (credentials, input validation, data safety) but for thorough security audits of skills under development, consider [SkillLens](https://www.npmjs.com/package/skilllens) (`npx skilllens scan <path>`). It checks for exfiltration, code execution, persistence, privilege bypass, and prompt injection — complementary to the quality focus here.

## Dependencies

- Python 3.6+ (for eval-skill.py)
- PyYAML (`pip install pyyaml`) — for frontmatter parsing in automated checks
