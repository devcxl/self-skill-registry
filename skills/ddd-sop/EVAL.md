---
skillName: ddd-sop
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 95
categoryScores:
  functional-suitability: 12
  reliability: 10
  performance: 7
  usability-ai: 16
  usability-human: 7
  security: 12
  maintainability: 12
  agent-specific: 19
findings:
  - id: F001
    criterion: error-reporting
    category: reliability
    score: 3
    description: >-
      dev-checklist documents forbidden patterns with correct replacements and
      the requirement template enumerates exception scenarios
      (重复回调/金额不一致/回调乱序/消息发送失败), but there is no structured error/troubleshooting
      reference with per-error recovery steps.
    priority: P2
    suggestion: >-
      Add a troubleshooting section or reference file mapping each exception
      scenario to explicit recovery/retry/compensation steps.
  - id: F002
    criterion: fault-tolerance
    category: reliability
    score: 3
    description: >-
      Exception branches are marked during event storming and idempotency is
      covered in the dev checklist, but recovery/retry strategy detail for
      out-of-order or failed messages is not explicit in the consistency design.
    priority: P2
    suggestion: >-
      Document explicit strategies for message ordering, retries, and
      compensation in the consistency design phase.
  - id: F003
    criterion: token-cost
    category: performance
    score: 3
    description: >-
      SKILL.md body is 233 lines (within the 150-250 band) but the '每个需求的开发流程'
      section substantially duplicates content already in
      references/dev-checklist.md.
    priority: P2
    suggestion: >-
      Replace the duplicated checklist with a pointer-style reference to
      dev-checklist.md to reduce token load.
  - id: F004
    criterion: forgiveness
    category: usability-human
    score: 3
    description: >-
      Version 1.0.0 is documented, but there is no rollback or version-migration
      guidance for generated docs/ artifacts.
    priority: P2
    suggestion: >-
      Add a note on how to handle/rollback artifacts when the SOP version
      changes.
  - id: F005
    criterion: trigger-precision
    category: agent-specific
    score: 3
    description: >-
      The Chinese description contains rich trigger contexts (DDD
      落地、领域模型、限界上下文、业务用例、SOP), but overlaps with the sibling domain-modeling
      skill on 限界上下文/统一语言 topics, creating false-trigger risk.
    priority: P1
    suggestion: >-
      Clarify the boundary in the description, e.g., emphasize '完整落地流程/SOP' and
      add exclusion phrases for pure glossary-maintenance tasks handled by
      domain-modeling.
  - id: F006
    criterion: testability
    category: maintainability
    score: 4
    description: >-
      This initial review found no pre-existing behavior-verification test cases
      in EVAL.md. 5 test cases (2 positive, 1 negative, 2 boundary) have been
      written in the Behavior Verification section and must be executed in a
      live agent session and backfilled.
    priority: P1
    suggestion: >-
      Run the provided test cases in CI/manual review; the deterministic [D]
      case T002 can be automated.
summary: >-
  ddd-sop is a high-quality documentation-only skill delivering a complete DDD
  landing SOP (business goals → event storming → bounded contexts → ubiquitous
  language → aggregates → use cases → consistency → layered implementation →
  quality gates) with 5 well-linked reference files. Automated checks pass
  12/14; the two trigger failures are false negatives caused by CJK text in
  eval-skill.py's whitespace-based word count and English-only trigger-phrase
  scan, not actual defects. DDD guidance is technically correct, content is
  comprehensive and consistent, security is clean (no scripts, no credentials,
  docs-only). Score 95/100 with no P0 blockers. Minor improvements recommended:
  structured error reference, trigger-boundary clarification vs domain-modeling,
  token trimming of duplicated checklist, and executing the newly added
  behavior-verification test cases.
reviewedAt: '2026-08-11T11:15:51Z'
reviewer: AI-Evaluator
sourceCommit: 5467ad61eb4953b645f6a7dfdcd07b494cd241b3
---
<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# ddd-sop Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 86% (12/14 checks passed; 1 warn, 1 fail)

---

## Automated Checks

```
📋 Skill Evaluation: ddd-sop
==================================================
Path: .../skills/ddd-sop
Type: Documentation-only

  [STRUCTURE]
    ✅ SKILL.md exists
    ✅ SKILL.md has valid frontmatter
    ✅ Skill name matches directory
    ✅ Skill type identified (Documentation-only skill, no scripts/)
    ✅ No extraneous files
    ✅ Resource directories are non-empty

  [TRIGGER]
    ❌ Description length adequate
       Description is only 5 words — too short for reliable triggering
    ⚠️  Description includes trigger contexts
       No trigger phrases found — add 'Use when...' to improve activation

  [DOCUMENTATION]
    ✅ SKILL.md body length (233 lines)
    ✅ References are linked from SKILL.md

  [SCRIPTS]
    ✅ Python scripts parse without errors (No scripts/ directory)
    ✅ Scripts use no external dependencies (No scripts/)

  [SECURITY]
    ✅ No hardcoded credentials or emails
    ✅ Environment variables documented (No scripts/)

==================================================
  ✅ Pass: 12  ⚠️  Warn: 1  ❌ Fail: 1
  Structural score: 86% (12/14 checks passed)
```

> **Automated-check caveat:** The two TRIGGER findings are **false negatives of the tool** for CJK text. `eval-skill.py` counts words by `str.split()` (whitespace only) and searches English trigger phrases. The Chinese description is actually comprehensive (single long sentence without spaces) and does contain trigger contexts ("当用户想要落地 DDD、设计领域模型、划分限界上下文、编写业务用例，或提到 DDD、领域驱动设计、SOP 时使用"). Manual assessment below confirms the description is adequate.

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | Covers the full DDD landing lifecycle: business goals → event storming → bounded contexts → ubiquitous language → aggregates → use cases → consistency → layered implementation → quality gates. 5 references (document-structure, module-structure, dev-checklist, examples, requirement-template) deepen every phase. |
| 1.2 | Correctness | 4/4 | DDD guidance follows established practice: aggregates by consistency boundary, one transaction = one aggregate, ID-only cross-aggregate references, anti-corruption layer, domain events for eventual consistency, modular-monolith-first. Java examples are valid and idiomatic. |
| 1.3 | Appropriateness | 4/4 | Zero external deps, pure documentation, portable. Aligns file conventions with the sibling `domain-modeling` skill (CONTEXT.md / docs/adr/). |
| 2.1 | Fault Tolerance `[adj]` | 3/4 | Error scenarios well covered: event storming marks exception branches, requirement template lists exception cases (重复回调/金额不一致/回调乱序/消息发送失败), dev-checklist covers idempotency. Recovery/retry strategy detail could be more explicit. |
| 2.2 | Error Reporting `[adj]` | 3/4 | dev-checklist documents forbidden patterns (setStatus, generic method names, cross-context DB access) with correct replacements; requirement template enumerates exception scenarios. No dedicated structured error/troubleshooting reference. |
| 2.3 | Recoverability | 4/4 | Documentation outputs are idempotent by nature — re-running the SOP regenerates the same docs. Lazy file creation (document-structure.md) avoids stale-state risk. |
| 3.1 | Token Cost | 3/4 | SKILL.md body is 233 lines (150–250 band). Good progressive disclosure, but the "每个需求的开发流程" section substantially duplicates dev-checklist.md content. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | No code to execute. |
| 4.1 | Learnability | 4/4 | SKILL.md + 5 references are sufficient for a fresh agent. Each phase states its artifact (产物写入) and rules. No source code to reverse-engineer. |
| 4.2 | Consistency | 4/4 | Uniform structure: every section follows "产物写入 X + 约束/示例", consistent naming (动词-名词), consistent tables and code blocks across all files. |
| 4.3 | Feedback Quality `[adj]` | 4/4 | Clear hierarchy: numbered phases, flow diagram, per-requirement 10-question checklist, final quality-gate (落地质量门禁) list of concrete checks. |
| 4.4 | Error Prevention `[adj]` | 4/4 | Strong warnings: forbidden patterns explicitly banned (`order.setStatus(PAID)` 禁止), generic method names prohibited, cross-context DB access banned, "不要从 Controller 开始写". |
| 5.1 | Discoverability | 4/4 | Description states when to use; SKILL.md fully documents the SOP; references are discoverable and linked. |
| 5.2 | Forgiveness `[adj]` | 3/4 | Version 1.0.0 documented. No rollback/recovery instructions, though the skill only creates markdown artifacts (low risk). |
| 6.1 | Credential Handling | 4/4 | No credentials present. |
| 6.2 | Input Validation | 4/4 | No user input processed — documentation only. |
| 6.3 | Data Safety | 4/4 | Only creates documentation files, lazily. No destructive operations. |
| 7.1 | Modularity `[adj]` | 4/4 | Clean layering: SKILL.md (SOP flow) + 5 focused references (structure / module / checklist / examples / template). Easy to navigate. |
| 7.2 | Modifiability `[adj]` | 4/4 | Consistent section pattern; adding a new phase or reference follows a clear copy-paste-modify pattern. |
| 7.3 | Testability `[adj]` | 4/4 | Strong test guidance: dev-checklist mandates "用什么测试证明规则正确", coding order starts with 领域测试, requirement-template includes 验收测试 lists. |
| 8.1 | Trigger Precision | 3/4 | Description is specific with clear trigger contexts (DDD 落地、领域模型、限界上下文、用例、SOP). Some overlap ambiguity with the sibling `domain-modeling` skill on 限界上下文/统一语言 topics. |
| 8.2 | Progressive Disclosure | 4/4 | 3 levels: description → SKILL.md → 5 reference files. Agent loads only what each phase needs. |
| 8.3 | Composability `[exempt]` | 4/4 | No pipeline to compose. |
| 8.4 | Idempotency `[exempt]` | 4/4 | Loading SKILL.md always yields the same instructions. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | No behavior to override. |
| | **TOTAL** | **95/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
>
> **每个 skill 必须包含至少 4 条测试用例**：2 条正向、1 条负向、1 条边界场景。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | 我要在真实项目中按 DDD 落地开发，帮我设计一个订单系统的领域模型，从业务目标开始。 | zh | ✅ | 输出按 SKILL.md 顺序：先 `docs/business-goals.md` 结构，再事件风暴、限界上下文；包含"限界上下文"、"聚合"等术语 | [J] | ⬜ |
| T002 | 正向 | 帮我写支付上下文的用例：确认支付成功。 | zh | ✅ | 输出包含 `docs/use-cases/confirm-payment.md` 结构，含"所属上下文/业务规则/聚合/状态变化/领域事件/验收测试"字段 | [D] | ⬜ |
| T003 | 负向 | 帮我写一个简单的用户登录 CRUD Controller，不需要复杂设计。 | zh | ❌ | 不启动完整 DDD SOP；不产出 event-storming/context-map 文档 | [J] | ⬜ |
| T004 | 边界 | 什么是 DDD？和微服务有什么区别？ | zh | ? | 触发或解释均可；若触发则输出应是 DDD 概念讲解而非套用完整落地流程 | [J] | ⬜ |
| T005 | 边界 | 帮我划分订单和支付两个限界上下文。 | zh | ? | 若触发则产出 `docs/context-map.md`，区分订单状态/支付状态，不合并同一状态表 | [J] | ⬜ |

### 覆盖矩阵

| 维度 | 说明 | T001 | T002 | T003 | T004 | T005 |
|------|------|------|------|------|------|------|
| 核心能力 | 最基础、"不测试就发布不了"的功能 | ✅ | | | | |
| 扩展功能 | skill 声称覆盖但使用频率较低的路径 | | ✅ | | | |
| 防护栏 | 无关或危险场景下不误触发、不乱来 | | | ✅ | | |
| 边界/歧义 | 跨领域、旧版参数、多 skill 竞争 | | | | ✅ | ✅ |

### 验证方式说明

| 标记 | 含义 | 示例 |
|------|------|------|
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 `所属上下文` / `验收测试` 字段" |
| `[J]` | 人工判断 — 输出质量需要人审 | "输出按 business-goals → event-storming 顺序展开" |

> **原则**：能写 `[D]` 就不写 `[J]`。`[D]` 的用例可以进 CI 自动化；`[J]` 的用例在评审时逐条人工核对。

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | — | — |
| 负向 | 1 | — | — |
| 边界 | 2 | — | — |
| **总计** | 5 | — | — |

> ⬜ 待执行：本初审未在 live agent 会话中执行上述用例。T002 的 `[D]` 用例可纳入后续 CI 行为验证。

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用
- 负向通过率 < 100% → **P1**：存在误触发风险
- 边界通过率 < 50% → **P2**：健壮性不足，建议改进

## Priority Fixes

### P0 — Fix Before Publishing
None.

### P1 — Should Fix
1. **Behavior Verification (F006)**：初审时 EVAL.md 无既有测试用例；本评审已补充 5 条用例（2 正向 + 1 负向 + 2 边界），需在 CI 或人工会话中执行并回填验证结果。
2. **Trigger Precision (F005)**：与 `domain-modeling` skill 在"限界上下文/统一语言"场景存在触发重叠。建议在 description 中补充排除语境（如"完整落地流程 / SOP"），降低误触发。

### P2 — Nice to Have
1. **Error Reporting (F001)**：增加结构化错误/排查参考（如 troubleshooting 章节），为每个异常场景（回调乱序、金额不一致）补充恢复步骤。
2. **Fault Tolerance (F002)**：在一致性设计中补充乱序消息、重试与补偿的明确策略。
3. **Token Cost (F003)**：SKILL.md 的"每个需求的开发流程"与 dev-checklist.md 内容重复，可精简为指针式引用。
4. **Forgiveness (F004)**：补充版本变更/回滚说明（如升级到 2.0.0 时如何迁移已生成的 docs/ 产物）。

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 95/100 | Baseline evaluation (PR #11) |
