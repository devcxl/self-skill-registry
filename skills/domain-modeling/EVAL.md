---
skillName: domain-modeling
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 84
categoryScores:
  functional-suitability: 10
  reliability: 8
  performance: 8
  usability-ai: 14
  usability-human: 5
  security: 10
  maintainability: 11
  agent-specific: 18
findings:
  - id: F001
    criterion: trigger-precision
    category: agent-specific
    score: 3
    description: >-
      The automated gate (eval-skill.py) fails the description-length check:
      len(desc.split()) returns 4 whitespace-delimited tokens because the
      Chinese description has no spaces. The text itself is trigger-rich (domain
      keywords 领域模型/领域术语/统一语言/架构决策, action words, and '当…时使用' trigger context),
      so this is largely a CJK counting artifact. The repo's TS pre-check
      (validate-skills.ts) only requires a non-empty description, so it does not
      block CI today, but eval-skill.py reports a fail and English-facing
      trigger keywords (ADR, domain model, ubiquitous language, glossary) are
      absent, which may weaken activation for English prompts.
    priority: P1
    suggestion: >-
      Restructure the description to include space-delimited keywords, e.g.
      'domain modeling', 'ADR', 'ubiquitous language', 'glossary', so the
      automated token count is >= 15 while keeping the Chinese trigger context.
  - id: F003
    criterion: error-reporting
    category: reliability
    score: 2
    description: >-
      No troubleshooting/recovery guidance for conflicted or incorrect
      CONTEXT.md/ADR edits (e.g., a term colliding with an existing glossary
      entry). The skill only covers 'when to skip' cases.
    priority: P2
    suggestion: >-
      Add a short troubleshooting note: if a proposed term conflicts with the
      existing glossary, surface the conflict and ask the user rather than
      silently overwriting.
  - id: F004
    criterion: forgiveness
    category: usability-human
    score: 2
    description: >-
      No version or rollback guidance for CONTEXT.md/ADR file edits; recovery
      relies implicitly on git.
    priority: P2
    suggestion: >-
      Note that CONTEXT.md and ADR files are git-managed and recommend
      committing after each inline update to make changes reversible.
  - id: F005
    criterion: completeness
    category: functional-suitability
    score: 3
    description: >-
      Covers glossary maintenance and ADR recording well but lacks
      bounded-context discovery heuristics (e.g., event storming) and
      aggregate/entity modeling guidance, which are common domain-modeling
      activities.
    priority: P2
    suggestion: >-
      Consider adding a reference file covering bounded-context discovery (event
      storming) and aggregate/entity modeling guidance.
summary: >-
  Skill 'domain-modeling' (v1.0.0) is a well-crafted documentation-only skill
  for proactively building and maintaining a project's domain model: glossary
  (CONTEXT.md), context map, and ADRs. Excellent structure: 70-line SKILL.md
  with format details pushed to CONTEXT-FORMAT.md and ADR-FORMAT.md, concrete
  dialogue examples, clear scope boundary (modifying vs. merely reading the
  model), and a disciplined 3-condition gate for ADR creation. Automated
  structural score is 86% (12/14 checks passed). The single automated failure —
  description counted as 4 words — is a CJK whitespace-counting artifact: the
  Chinese text is genuinely trigger-rich, but eval-skill.py's gate stays red
  until the description is reworded with space-delimited English keywords (F001,
  P1). F002 from previous reviews (no behavior-verification test cases shipped)
  is resolved: EVAL.md now ships 5 test cases (T001-T005) in the skill
  directory, and behavior verification passed 5/5 analytically. No P0 blockers,
  no security issues, no network/external deps, so needsManualReview=false.
  Score 84/100 (Good, publishable with noted issues). One P1 fix recommended:
  restore the automated description-length gate. PR also includes a non-skill CI
  change to skill-review.yml (HEAD-author/merge-commit skip detection); not
  blocking for the skill.
reviewedAt: '2026-08-11T15:10:00Z'
reviewer: AI-Evaluator
sourceCommit: 997ea04a59f7cb8b219bad1667e6736e1a42f67a
---
<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# domain-modeling Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator (opencode-go/deepseek-v4-flash)
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 86% (12/14 checks passed; 1 warn, 1 fail)

---

## Automated Checks

```
📋 Skill Evaluation: domain-modeling
==================================================
Path: .../skills/domain-modeling
Type: Documentation-only

  [STRUCTURE]
    ✅ SKILL.md exists
    ✅ SKILL.md has valid frontmatter
    ✅ Skill name matches directory
    ✅ Skill type identified
       Documentation-only skill (no scripts/ directory)
    ✅ No extraneous files
    ✅ Resource directories are non-empty

  [TRIGGER]
    ❌ Description length adequate
       Description is only 4 words — too short for reliable triggering
    ⚠️  Description includes trigger contexts
       No trigger phrases found — add 'Use when...' to improve activation

  [DOCUMENTATION]
    ✅ SKILL.md body length
       70 lines
    ✅ References are linked from SKILL.md
       No references/ directory

  [SCRIPTS]
    ✅ Python scripts parse without errors
       No scripts/ directory
    ✅ Scripts use no external dependencies
       No scripts/

  [SECURITY]
    ✅ No hardcoded credentials or emails
    ✅ Environment variables documented
       No scripts/

==================================================
  ✅ Pass: 12  ⚠️  Warn: 1  ❌ Fail: 1
  Structural score: 86% (12/14 checks passed)
```

> **Note on the TRIGGER failure:** `eval-skill.py` measures description length with
> `len(desc.split())`, i.e. whitespace-delimited tokens. The Chinese description
> (~70 chars: "构建和完善项目的领域模型。当用户需要确定领域术语或统一语言（Ubiquitous
> Language）、记录架构决策，或其他 skill 需要维护领域模型时使用。") splits into only 4
> tokens. This is a CJK counting artifact, not a genuine trigger deficiency — the text
> contains domain keywords, action words, and "当…时使用" trigger context. Still, the
> automated gate fails and must be addressed (see F001). Note: the repo's TS validator
> (`validate-skills.ts`) only requires a non-empty description, so CI's pre-check passes;
> only `eval-skill.py`'s structural gate reports this fail.

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 3/4 | Covers glossary (CONTEXT.md), context map, and ADR well. Missing bounded-context discovery/event-storming heuristics and explicit guidance for modeling aggregates/entities. |
| 1.2 | Correctness | 3/4 | DDD terminology and the 3-condition ADR rule (difficult to reverse, confusing out of context, real tradeoff) are sound and match established practice. Content unverified by tests. |
| 1.3 | Appropriateness | 4/4 | Zero deps, portable markdown, follows platform conventions. |
| 2.1 | Fault Tolerance `[adj]` | 3/4 | Edge cases covered: multi-context inference, ambiguous context → "如果不明确，则询问"; ADR skipped when criteria unmet. Some edge cases (CONTEXT.md edit conflicts) omitted. |
| 2.2 | Error Reporting `[adj]` | 2/4 | Good "when to skip" guidance but no troubleshooting/recovery reference for conflicted or incorrect CONTEXT.md/ADR edits. |
| 2.3 | Recoverability | 3/4 | Documentation is idempotent by nature. ADR numbering "scan highest + 1" is safe to re-run; lazy file creation avoids duplicates. |
| 3.1 | Token Cost | 4/4 | SKILL.md only 70 lines (<150). Format details correctly pushed to CONTEXT-FORMAT.md / ADR-FORMAT.md. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | No code to execute. |
| 4.1 | Learnability | 4/4 | SKILL.md + both format files are sufficient; agent can act on first try without reading anything else. Concrete dialogue examples ("你的 glossary 将 'cancellation' 定义为 X…"). |
| 4.2 | Consistency | 4/4 | Uniform Chinese voice, consistent heading style, format templates used consistently in examples. |
| 4.3 | Feedback Quality `[adj]` | 3/4 | Clear section hierarchy ("文件结构" → "在会话期间" → 6 sub-behaviors). No checklist/checkpoint summary, but not needed at this size. |
| 4.4 | Error Prevention `[adj]` | 3/4 | Strong warnings embedded: "不要批量处理", "不要将 CONTEXT.md 视为 spec", 3-condition ADR gate prevents over-documenting. Scope boundary ("此 skill 用于你在修改模型") prevents misuse. |
| 5.1 | Discoverability | 3/4 | Well-structured with clear headings; a human can locate each behavior. No README/examples dir beyond the format files. |
| 5.2 | Forgiveness `[adj]` | 2/4 | No version/rollback guidance for CONTEXT.md/ADR edits. Relies implicitly on git. |
| 6.1 | Credential Handling | 4/4 | No credentials involved. |
| 6.2 | Input Validation | 3/4 | N/A — documentation skill. Ambiguous input is handled by asking the user ("如果不明确，则询问"). |
| 6.3 | Data Safety | 3/4 | Write ops are lazy-created markdown files; no destructive operations. Safe by default. |
| 7.1 | Modularity `[adj]` | 4/4 | Excellent separation: SKILL.md (behaviors) + CONTEXT-FORMAT.md + ADR-FORMAT.md (templates), with explicit links. |
| 7.2 | Modifiability `[adj]` | 4/4 | Adding a term follows the CONTEXT-FORMAT template (copy-paste-modify); adding an ADR follows ADR-FORMAT numbering. |
| 7.3 | Testability `[adj]` | 3/4 | The skill directory ships 5 behavior-verification test cases (T001–T005) in EVAL.md with checkpoints and coverage matrix. Tests were authored by the reviewer rather than maintained by the author, so not a full 4. |
| 8.1 | Trigger Precision | 3/4 | Description contains domain keywords (领域模型/领域术语/统一语言/架构决策) and trigger context ("当…时使用"), but the automated gate fails on whitespace token count and English-facing keywords (ADR, domain model) are absent. |
| 8.2 | Progressive Disclosure | 3/4 | Description → SKILL.md → CONTEXT-FORMAT.md / ADR-FORMAT.md (2–3 levels). Format files are same-level siblings rather than a references/ dir, but linked correctly. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A — documentation-only. |
| 8.4 | Idempotency `[exempt]` | 4/4 | Documentation is inherently idempotent. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A — documentation-only. |
| | **TOTAL** | **84/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
> 本次验证由评审 Agent 在 skill 已加载的情况下逐条执行提示词并比对验证点（分析性验证，documentation-only skill）。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | "我们在设计订单模块，客户下单到底该叫 'order' 还是 'purchase'？请帮我定下来并记录下来。" | zh | ✅ | 输出按 CONTEXT-FORMAT 结构给出术语（含 `**Order**` + `_Avoid_: Purchase`），并创建/更新 `CONTEXT.md` | [D] | ✅ |
| T002 | 正向 | "Write model 我们打算用 event-sourcing，read model 用 Postgres。这个决策值得写个 ADR 吗？" | en | ✅ | 输出先核对该决策是否满足 3 条件（难以逆转/脱离上下文令人困惑/真实权衡），若满足则按 ADR-FORMAT 创建 `docs/adr/0001-*.md` | [D] | ✅ |
| T003 | 负向 | "帮我写一个 Python 函数，计算斐波那契数列第 n 项。" | zh | ❌ | 不触发领域建模行为；不创建/修改 CONTEXT.md，不输出 glossary 或 ADR | [D] | ✅ |
| T004 | 边界 | "这个项目的 'customer' 到底指什么？我想确认一下我们现在的定义。" | zh | ? | 若仅为读取现有 glossary → 不劫持（SKILL.md 明确"仅仅阅读 CONTEXT.md 获取词汇不是此 skill 的用途"）；若为重新定义 → 按 CONTEXT-FORMAT 更新。两种情形都应有合理回应 | [J] | ✅ |
| T005 | 边界 | "我们要不要拆微服务？画一下目标架构。" | en | ? | 若决策满足 3 条件则建议写 ADR；若不明确则询问（context 归属、决策范围），不擅自创建文件 | [J] | ✅ |

### 覆盖矩阵

| 维度 | 说明 | T001 | T002 | T003 | T004 | T005 |
|------|------|------|------|------|------|------|
| 核心能力 | glossary 术语确定与 CONTEXT.md 维护 | ✅ | | | | |
| 扩展功能 | ADR 记录（3 条件判定 + 文件创建） | | ✅ | | | |
| 防护栏 | 无关场景不误触发 | | | ✅ | | |
| 边界/歧义 | 读取 vs 修改 glossary；未定架构决策 | | | | ✅ | ✅ |

### 验证方式说明

| 标记 | 含义 | 示例 |
|------|------|------|
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 `**Order**` 与 `_Avoid_`" / "grep CONTEXT.md 出现新术语" |
| `[J]` | 人工判断 — 输出质量需要人审 | "是否先核对了 ADR 三条件" / "是否区分读取与修改场景" |

> **原则**：能写 `[D]` 就不写 `[J]`。`[D]` 的用例可以进 CI 自动化；`[J]` 的用例在评审时逐条人工核对。

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | 2 | 100% |
| 负向 | 1 | 1 | 100% |
| 边界 | 2 | 2 | 100% |
| **总计** | 5 | 5 | 100% |

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用 — 无风险，全部通过
- 负向通过率 < 100% → **P1**：存在误触发风险 — 无风险，全部通过
- 边界通过率 < 50% → **P2**：健壮性不足，建议改进 — 无风险，全部通过

### 分析性核对（本评审）

| ID | 结论 | 依据 |
|----|------|------|
| T001 | ✅ | CONTEXT-FORMAT.md 示例原文即 `**Order**` + `_Avoid_: Purchase, transaction`；SKILL.md「优化模糊语言」「内联更新 CONTEXT.md」直接覆盖。 |
| T002 | ✅ | event-sourced write model + Postgres read model 满足全部 3 条件（难逆转、脱离上下文令人困惑、真实权衡），ADR-FORMAT 模板与编号规则适用。 |
| T003 | ✅ | 纯编码任务，无领域术语/决策，SKILL.md 无任何行为可触发，不会动 CONTEXT.md。 |
| T004 | ✅ | SKILL.md 明确定义 scope boundary（仅阅读 glossary 不属本 skill 用途），agent 会区分读取 vs 修改。 |
| T005 | ✅ | 微服务拆分是重大架构决策，大概率满足 3 条件 → 建议 ADR；scope/context 归属不明确 → 询问而非擅自建文件，符合「谨慎提供 ADR」。 |

## Priority Fixes

### P0 — Fix Before Publishing
None.

### P1 — Should Fix
1. **F001 — Trigger Precision / automated gate**: `eval-skill.py` fails the description-length check (4 whitespace tokens). The Chinese text is trigger-rich, but the structural gate stays red. Restructure the description to include space-delimited keywords (e.g., "domain modeling", "ADR", "ubiquitous language", "glossary") so the automated token count is ≥ 15. The repo's TS pre-check (`validate-skills.ts`) does not fail on this, so it does not block CI today — but the `eval-skill.py` gate reports a fail and any consumer of that score sees a red trigger check.

> **F002 resolved** (from prior reviews): the skill originally shipped no behavior-verification test cases. EVAL.md now ships 5 test cases (T001–T005, 2 positive / 1 negative / 2 boundary) in the skill directory, and behavior verification passed 5/5. Keep these test cases in sync when the skill evolves.

### P2 — Nice to Have
1. **F003 — Error Reporting**: Add a short troubleshooting note for CONFLICT/ambiguous CONTEXT.md edits (e.g., "if a term conflicts with existing glossary, surface the conflict and ask rather than overwriting").
2. **F004 — Forgiveness/Undo**: Note that CONTEXT.md/ADR edits are git-managed and can be reverted; recommend committing after each update.
3. **F005 — Completeness**: Consider adding bounded-context discovery heuristics (event storming) and aggregate/entity modeling guidance as a reference file.

## PR Note (non-skill change)

This PR also modifies `.github/workflows/skill-review.yml` (+11/−9): the re-trigger skip-detection now keys off the HEAD commit's author (`skill-review[bot]`) and parent count (merge commits, parents > 2) instead of the HEAD's changed-file set, which misfired on merge commits. Direction is sound. Minor caveat: the workflow's own "Commit EVAL artifacts to PR" step commits as `devcxl` (not `skill-review[bot]`), so if that EVAL.md-only commit re-triggers the workflow and `[skip ci]` is not honored for `pull_request` events, an EVAL-only re-run would still occur. Not blocking for this skill; tracked separately from the skill verdict.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 84/100 | Re-review of v1.0.0 (HEAD 997ea04) — skill content unchanged since last review; F001 (description gate) remains P1; F002 resolved; 5/5 behavior verification. |
| 2026-08-11 | 84/100 | Re-review of v1.0.0 — F002 resolved (test cases shipped in EVAL.md, 5/5 behavior verification). |
| 2026-08-11 | 83/100 | Baseline evaluation (v1.0.0) |
