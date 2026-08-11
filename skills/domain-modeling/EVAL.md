<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# domain-modeling Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
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
> automated gate fails and must be addressed (see F001).

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
| 2.3 | Recoverability | 3/4 | Documentation is idempotent by nature. ADR numbering "scan highest + 1" is safe to re-run. |
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
| 7.3 | Testability `[adj]` | 2/4 | No test cases or verification strategy shipped with the skill. Test cases written below in this evaluation (see Behavior Verification). |
| 8.1 | Trigger Precision | 3/4 | Description contains domain keywords (领域模型/领域术语/统一语言/架构决策) and trigger context ("当…时使用"), but the automated gate fails on whitespace token count and English-facing keywords (ADR, domain model) are absent. |
| 8.2 | Progressive Disclosure | 3/4 | Description → SKILL.md → CONTEXT-FORMAT.md / ADR-FORMAT.md (2–3 levels). Format files are same-level siblings rather than a references/ dir, but linked correctly. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A — documentation-only. |
| 8.4 | Idempotency `[exempt]` | 4/4 | Documentation is inherently idempotent. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A — documentation-only. |
| | **TOTAL** | **83/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 本次验证由评审 Agent 在 skill 已加载的情况下逐条执行提示词并比对验证点。

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

## Priority Fixes

### P0 — Fix Before Publishing
None.

### P1 — Should Fix
1. **F001 — Trigger Precision / automated gate**: `eval-skill.py` fails the description-length check (4 whitespace tokens). The Chinese text is trigger-rich, but the CI gate stays red. Restructure the description to include space-delimited keywords (e.g., "domain modeling", "ADR", "ubiquitous language", "glossary") or rebalance the sentence so the automated token count is ≥ 15. Note: if CI treats this fail as blocking, the skill cannot publish until addressed.
2. **F002 — Testability**: The skill ships no behavior-verification test cases. Add the 5 cases above to `EVAL.md` (or a `references/testing.md`) so future reviews can re-run behavior verification.

### P2 — Nice to Have
1. **F003 — Error Reporting**: Add a short troubleshooting note for CONFLICT/ambiguous CONTEXT.md edits (e.g., "if a term conflicts with existing glossary, surface the conflict and ask rather than overwriting").
2. **F004 — Forgiveness/Undo**: Note that CONTEXT.md/ADR edits are git-managed and can be reverted; recommend committing after each update.
3. **F005 — Completeness**: Consider adding bounded-context discovery heuristics (event storming) and aggregate/entity modeling guidance as a reference file.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 83/100 | Baseline evaluation (v1.0.0) |
