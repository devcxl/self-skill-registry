<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# technical-research Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 12 pass / 1 warn / 1 fail (86% structural)

---

## Automated Checks

```
Skill name matches directory             PASS
SKILL.md exists                          PASS
SKILL.md has valid frontmatter           PASS
No extraneous files                      PASS
Resource directories are non-empty       PASS
Description length adequate              FAIL (only 2 words)
Description includes trigger contexts    WARN (no "Use when..." phrases)
SKILL.md body length                     PASS (452 lines)
References are linked from SKILL.md      PASS (no references/, templates/ present)
Python scripts parse without errors      PASS (no scripts/)
Scripts use no external dependencies     PASS (no scripts/)
No hardcoded credentials or emails       PASS
Environment variables documented         PASS (no scripts/)
```

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | Full-domain coverage: tech selection, architecture evaluation, framework/middleware/API/model research, evidence grading (A-E), conclusion states, 12-step SOP, TCO, quality gates, anti-patterns, 4 templates. |
| 1.2 | Correctness | 4/4 | Evidence-based methodology is sound: hard-constraint-first, traceability, CONFIRMED/INFERRED/UNVERIFIED/CONFLICTED states, PoC-only-high-risk, ADR supersede rules. |
| 1.3 | Appropriateness | 4/4 | Zero deps, portable, pure documentation. Matches other registry skills. |
| 2.1 | Fault Tolerance `[adj]` | 4/4 | Comprehensive error guidance: evidence conflicts (4-step resolution), unverifiable claims → "待验证" (no guessing), assumption tracking, failure-path-first testing. |
| 2.2 | Error Reporting `[adj]` | 3/4 | Conclusion states + quality gates act as status reporting. No structured error reference with per-error recovery steps. |
| 2.3 | Recoverability | 4/4 | N/A — documentation, inherently idempotent. ADR "Superseded by" rules document decision lineage. |
| 3.1 | Token Cost | 2/4 | SKILL.md body is 452 lines (borders the 400+ threshold). Dense and valuable, but some SOP detail could move to references/. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | N/A — no execution. |
| 4.1 | Learnability | 4/4 | Numbered SOP (Step 0-11), explicit 目标/原则, templates. Agent can run first try without source reading. |
| 4.2 | Consistency | 4/4 | Uniform section structure, tables, status markers, and template format across all 4 template files. |
| 4.3 | Feedback Quality `[adj]` | 4/4 | Clear hierarchy, 执行摘要 format, 质量门禁 checklist provides progress checkpoints. |
| 4.4 | Error Prevention `[adj]` | 4/4 | Anti-patterns section, "禁止输出各有优劣" guard, prerequisites (hard constraints first), UNVERIFIED marking. |
| 5.1 | Discoverability | 4/4 | Purpose + 适用/不适用 explicitly stated; templates listed at bottom. |
| 5.2 | Forgiveness `[adj]` | 3/4 | Version noted (1.0.0); ADR supersede rules documented. No explicit rollback of research state needed (read-only). |
| 6.1 | Credential Handling | 4/4 | No credentials involved. |
| 6.2 | Input Validation | 4/4 | N/A — no user inputs processed. |
| 6.3 | Data Safety | 4/4 | N/A — no file operations. |
| 7.1 | Modularity `[adj]` | 4/4 | Clear logical layering: SKILL.md SOP → templates/ (report, matrix, PoC, ADR). |
| 7.2 | Modifiability `[adj]` | 4/4 | Consistent section format; templates are copy-paste-modify. |
| 7.3 | Testability `[adj]` | 2/4 | Quality gates serve as verification but no dedicated testing reference or automated behavior verification cases in the skill itself. |
| 8.1 | Trigger Precision | 2/4 | Description fails length check (30 chars) and lacks "Use when..." triggers, though it contains strong domain keywords (技术选型/架构评估/框架/中间件/API/模型调研). |
| 8.2 | Progressive Disclosure | 3/4 | description → SKILL.md → templates/ (3 levels), templates referenced from body. SKILL.md itself remains large. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A — documentation-only. |
| 8.4 | Idempotency `[exempt]` | 4/4 | N/A — inherently idempotent. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A — no behavior to override. |
| | **TOTAL** | **91/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
>
> **每个 skill 必须包含至少 4 条测试用例**：2 条正向、1 条负向、1 条边界场景。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | "帮我对比 PostgreSQL 和 MySQL，为我们的订单系统做技术选型" | zh | ✅ | 输出包含调研任务卡、硬性约束、证据矩阵、对比评分、明确推荐方案 | [D] | ⬜ |
| T002 | 正向 | "评估我们是否应该把消息队列从 RabbitMQ 迁移到 Kafka" | zh | ✅ | 输出包含证据分级、TCO/退出成本、风险清单、重新评估条件 | [J] | ⬜ |
| T003 | 负向 | "Redis 的 SETEX 命令语法是什么？" | zh | ❌ | 不触发完整调研流程；直接给出事实答案，不输出任务卡/证据矩阵 | [D] | ⬜ |
| T004 | 边界 | "给我讲讲微服务架构" | zh | ? | 若触发则聚焦"技术选型/评估"角度；若仅需概念解释则不应进入 SOP | [J] | ⬜ |
| T005 | 边界 | "对比一下 React 和 Vue，我还没想清楚要不要做这个项目" | zh | ? | 必须输出"决策问题/成功标准/待验证事项"，不能只给泛泛对比表 | [J] | ⬜ |

### 覆盖矩阵

| 维度 | 说明 | T001 | T002 | T003 | T004 | T005 |
|------|------|------|------|------|------|------|
| 核心能力 | 技术选型证据驱动决策 | ✅ | | | | |
| 扩展功能 | 迁移/替换评估（TCO、退出） | | ✅ | | | |
| 防护栏 | 单点事实查询不误触发 | | | ✅ | | |
| 边界/歧义 | 概念解释 vs 选型评估 | | | | ✅ | |
| 边界/歧义 | 决策前提不明确时的引导 | | | | | ✅ |

### 验证方式说明

| 标记 | 含义 | 示例 |
|------|------|------|
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 '调研任务卡' / '证据矩阵' / '推荐方案'" |
| `[J]` | 人工判断 — 输出质量需要人审 | "TCO 是否覆盖退出成本" / "结论是否给出明确推荐而非'各有优劣'" |

### 验证结果

> 本 skill 为首次评审，SKILL.md 本身未包含行为验证测试用例。以下用例为本评审提出，**尚未在 Agent 上实际执行**，需在 CI 复审时执行并回填结果（见 P1 缺陷）。

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | — | 待执行 |
| 负向 | 1 | — | 待执行 |
| 边界 | 2 | — | 待执行 |
| **总计** | **5** | — | 待执行 |

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用
- 负向通过率 < 100% → **P1**：存在误触发风险
- 边界通过率 < 50% → **P2**：健壮性不足，建议改进

## Priority Fixes

### P0 — Fix Before Publishing
1. None.

### P1 — Should Fix
1. **Trigger Precision / Description**: `description` is only 30 chars (automated check FAIL). Add explicit "Use when..." / "不适用于" trigger contexts to the frontmatter description, e.g. "技术选型、方案对比、架构评估、框架/中间件/数据库/云服务/API/模型调研时触发。不用于单点事实查询或概念解释。"
2. **Behavior Verification**: SKILL.md has no built-in test cases. Execute the 5 cases above against an Agent with the skill loaded and record results; initial review provided the test case set.

### P2 — Nice to Have
1. **Token Cost**: SKILL.md body is 452 lines. Consider moving Step 5's detailed dimension checklists (功能/性能/稳定性/运维/安全/生态) into a `references/` file to shrink the core context.
2. **Error Reporting**: Add a short "状态速查" section mapping each conclusion state (CONFIRMED/INFERRED/UNVERIFIED/CONFLICTED) to its required evidence + next action.
3. **Testability**: Add a "验证策略" reference describing how to self-check research output against the quality gate items.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 91/100 | Baseline evaluation |
