---
skillName: mysql-database-design
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 89
categoryScores:
  functional-suitability: 11
  reliability: 8
  performance: 7
  usability-ai: 16
  usability-human: 6
  security: 12
  maintainability: 11
  agent-specific: 18
findings:
  - id: F001
    criterion: 8.1-trigger-precision
    category: agent-specific
    score: 3
    description: >-
      Description is Chinese-only. Semantically precise (「当…时使用」 = 'Use when'),
      but no English trigger keywords, reducing reliability for English-language
      agents. The automated 'Description length adequate' check fails because
      CJK text has no whitespace and split() counts 3 'words' — a checker
      artifact, not a real defect.
    priority: P2
    suggestion: >-
      Append an English trigger phrase or keyword list, e.g. 'Use when
      designing, reviewing, or optimizing MySQL table structures / schemas /
      indexes'.
  - id: F002
    criterion: 2.2-error-reporting
    category: reliability
    score: 2
    description: >-
      No troubleshooting or error-reference content. Common MySQL design
      failures (unique-key conflicts, unused indexes revealed by EXPLAIN, wrong
      composite-index order, lock waits/deadlocks tied to indexes) are not
      covered with actionable guidance.
    priority: P1
    suggestion: >-
      Add a troubleshooting section listing common failure scenarios and
      concrete resolution steps.
  - id: F003
    criterion: 5.2-forgiveness
    category: usability-human
    score: 2
    description: >-
      Version is present in frontmatter but no rollback/recovery guidance exists
      for applying these conventions to an existing schema (ALTER TABLE,
      migration strategy, revert path).
    priority: P2
    suggestion: >-
      Add a short section on evolving existing tables (ALTER / migrations /
      rollback) rather than only new-table templates.
  - id: F004
    criterion: 1.2-correctness
    category: functional-suitability
    score: 3
    description: >-
      DDL examples are valid, but the unconditional recommendation of
      timestamp(6) for business time fields omits the MySQL timestamp 2038-year
      range and timezone behavior, and when datetime(6) would be preferable.
    priority: P2
    suggestion: >-
      Document the timestamp vs datetime(6) trade-off and justify the
      timestamp(6) default.
  - id: F005
    criterion: 7.3-testability
    category: maintainability
    score: 3
    description: >-
      The skill advises EXPLAIN-based validation but provides no dedicated
      verification/test reference (field checklist, SQL syntax check, EXPLAIN
      self-check list).
    priority: P2
    suggestion: >-
      Add a verification checklist section covering mandatory fields and EXPLAIN
      review points.
  - id: F006
    criterion: behavior-verification
    category: maintainability
    score: 0
    description: >-
      Initial review: the skill ships with no behavior-verification test cases.
      Evaluator has drafted 5 cases (T001-T005, 2 positive / 1 negative / 2
      boundary) in EVAL.md; they must be executed and results backfilled during
      re-review.
    priority: P1
    suggestion: >-
      Author confirms or replaces T001-T005; CI re-review executes them and
      enforces positive 100% / negative 100% / boundary >=50%.
summary: >-
  mysql-database-design 1.0.0 is a well-structured, documentation-only MySQL
  schema-design skill. It delivers consistent conventions for
  fixed/status/soft-delete/time fields, unique constraints and composite
  indexes, a worked t_order example, a blank template, quick-start steps, and
  explicit caveats. No scripts, no external dependencies, no credentials, no
  destructive operations. Automated structural score 86%; the single automated
  FAIL is a CJK word-count artifact of the checker, not a real defect. Manual
  rubric total 89/100. No P0 findings; no manual-review triggers. Approved —
  publishable after addressing P1 items (test-case execution and a
  troubleshooting section).
reviewedAt: '2026-08-11T11:20:00Z'
reviewer: AI-Evaluator
sourceCommit: 7416763d761799b97fa311526d372d0cf0d59b72
---
<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# mysql-database-design Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 86% (12/14 checks passed, 1 warn, 1 fail)

---

## Automated Checks

```
📋 Skill Evaluation: mysql-database-design
==================================================
Type: Documentation-only

  [STRUCTURE]
    ✅ SKILL.md exists
    ✅ SKILL.md has valid frontmatter
    ✅ Skill name matches directory
    ✅ Skill type identified (Documentation-only)
    ✅ No extraneous files
    ✅ Resource directories are non-empty

  [TRIGGER]
    ❌ Description length adequate
       Description is only 3 words — too short for reliable triggering
    ⚠️  Description includes trigger contexts
       No trigger phrases found — add 'Use when...' to improve activation

  [DOCUMENTATION]
    ✅ SKILL.md body length (220 lines)
    ✅ References are linked from SKILL.md (no references/ directory)

  [SCRIPTS]
    ✅ Python scripts parse without errors (no scripts/)
    ✅ Scripts use no external dependencies (no scripts/)

  [SECURITY]
    ✅ No hardcoded credentials or emails
    ✅ Environment variables documented (no scripts/)

  ✅ Pass: 12  ⚠️  Warn: 1  ❌ Fail: 1
  Structural score: 86% (12/14 checks passed)
```

> **Note on the two trigger findings:** both stem from a CJK artifact in the checker. The description
> `当在项目中设计、评审或优化 MySQL 表结构，需要统一固定字段、状态字段、时间字段、唯一约束与索引设计规范时使用。`
> is a single space-free Chinese sentence, so `desc.split()` counts only 3 "words". Semantically the
> description is complete and contains the "Use when" pattern (「当…时使用」). The real gap is the
> absence of English trigger keywords, which matters for English-language agents.

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | Covers fixed fields, status fields, soft-delete, time fields, unique constraints, index design principles, worked example, blank template, quick start, naming conventions and caveats. Complete for the stated scope. |
| 1.2 | Correctness | 3/4 | SQL DDL is valid (`timestamp(6)`, `CURRENT_TIMESTAMP(6)`, `ON UPDATE`, InnoDB/utf8mb4). Index advice is sound and explicitly defers to `EXPLAIN`. Minor gap: `timestamp` 2038-range/timezone behavior vs `datetime(6)` not discussed. |
| 1.3 | Appropriateness | 4/4 | Zero dependencies, portable, doc-only. Correct medium for a design convention. |
| 2.1 | Fault Tolerance `[adj]` | 3/4 | Cautions against mechanical template use, flags `deleted` selectivity edge cases, advises execution-plan verification. No explicit error-scenario recovery list. |
| 2.2 | Error Reporting `[adj]` | 2/4 | No troubleshooting/error-reference section (e.g., duplicate-key, lock-wait, unused-index diagnosis). |
| 2.3 | Recoverability | 3/4 | Produces design artifacts only; safe to re-run. `CREATE TABLE` DDL is not idempotent and no migration/ALTER guidance is given. |
| 3.1 | Token Cost | 3/4 | 220 body lines, within 150–250 band; single-file. Acceptable; some sections could move to references. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | N/A for documentation. |
| 4.1 | Learnability | 4/4 | Self-contained: blank template + step-by-step quick start + naming suggestions. Fresh agent succeeds on first use. |
| 4.2 | Consistency | 4/4 | Uniform conventions: `t_` table prefix, `uk_`/`idx_` index naming, consistent DDL style across example and template. |
| 4.3 | Feedback Quality `[adj]` | 4/4 | Clear numbered sections, tables, code blocks, 5-step quick start, closing "注意事项" checklist. |
| 4.4 | Error Prevention `[adj]` | 4/4 | Pitfalls documented (soft-delete default, enum-not-string status, microsecond ≠ concurrency control, index-from-SQL-not-template). Safe defaults throughout. |
| 5.1 | Discoverability | 4/4 | Clear title, informative description, logical section flow; easy to locate any topic. |
| 5.2 | Forgiveness `[adj]` | 2/4 | Version noted (1.0.0). No rollback/recovery guidance for applying these conventions to an existing schema. |
| 6.1 | Credential Handling | 4/4 | No scripts, no credentials anywhere. |
| 6.2 | Input Validation | 4/4 | No user-input processing surface. |
| 6.3 | Data Safety | 4/4 | No destructive operations; all guidance is additive DDL. |
| 7.1 | Modularity `[adj]` | 4/4 | Logical layers: 通用规范 → 示例 → 索引原则 → 空白模板 → 快速开始 → 注意事项. |
| 7.2 | Modifiability `[adj]` | 4/4 | Blank template supports copy-paste-modify for new business tables; section format is consistent. |
| 7.3 | Testability `[adj]` | 3/4 | Recommends `EXPLAIN` validation, but no dedicated testing/verification reference. |
| 8.1 | Trigger Precision | 3/4 | Chinese "Use when" trigger is precise (MySQL table structure + design/review/optimize + unified conventions). Lacks English trigger keywords; automated checker flags it. |
| 8.2 | Progressive Disclosure | 3/4 | Two levels (description → SKILL.md); all content in one file, concise enough. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A for documentation. |
| 8.4 | Idempotency `[exempt]` | 4/4 | Loading the same SKILL.md always yields the same instructions. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A for documentation. |
| | **TOTAL** | **89/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
>
> **每个 skill 必须包含至少 4 条测试用例**：2 条正向、1 条负向、1 条边界场景。
>
> ⚠️ **初审说明**：本次为首次评审，SKILL.md 未随附任何测试用例（P1 缺陷）。以下用例由评审者
> 依据 skill 内容编写，供作者确认并在复审中实际执行。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | 帮我设计一张订单表 `t_order`，需要包含订单号、用户、状态、金额，并考虑幂等与软删 | zh | ✅ | 输出包含 `CREATE TABLE`、`deleted tinyint NOT NULL DEFAULT 0`、`timestamp(6)`、唯一键（如 `uk_order_id`） | [D] | ⬜ |
| T002 | 正向 | 评审下面的索引设计是否合理，给出联合索引顺序建议 | zh | ✅ | 输出包含 `EXPLAIN`、`deleted` 分布判断、等值/范围/排序字段分析、具体索引建议 | [J] | ⬜ |
| T003 | 负向 | 帮我写一个 Django 的 ORM 模型文件 | zh | ❌ | 不输出 MySQL DDL 模板；不套用 `t_` 前缀/`timestamp(6)` 规范 | [D] | ⬜ |
| T004 | 边界 | 设计用户表时用什么时间字段类型比较好？ | zh | ? | 若触发应给出 `timestamp(6)` 建议及"设置类时间字段例外"说明；至少给出语义合理的取舍 | [J] | ⬜ |
| T005 | 边界 | MySQL 出现死锁/锁等待，怎么排查？ | zh | ? | 若触发则输出应聚焦表结构/索引设计层面（如索引顺序、唯一键、状态机），而非 DDL 模板 | [J] | ⬜ |

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
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 `CREATE TABLE`" / "`grep -c 'deleted tinyint'` >= 1" |
| `[J]` | 人工判断 — 输出质量需要人审 | "联合索引顺序取舍是否合理" |

> **原则**：能写 `[D]` 就不写 `[J]`。`[D]` 的用例可以进 CI 自动化；`[J]` 的用例在评审时逐条人工核对。

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | — | — |
| 负向 | 1 | — | — |
| 边界 | 2 | — | — |
| **总计** | 5 | — | — |

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用
- 负向通过率 < 100% → **P1**：存在误触发风险
- 边界通过率 < 50% → **P2**：健壮性不足，建议改进

> ⚠️ 本次评审未实际执行行为验证（初审未发现既有用例）。T001–T005 需在复审中执行并回填结果。

## Priority Fixes

### P0 — Fix Before Publishing
1. 无

### P1 — Should Fix
1. **补充/确认行为验证用例**：首次评审时 SKILL.md 未随附测试用例，评审者已编写 5 条（T001–T005），复审时必须实际执行并回填"验证结果"表（正向 100% / 负向 100% / 边界 ≥50%）。
2. **补充错误处理/排障章节**（2.2 Error Reporting）：SKILL.md 无任何排障指导。建议新增一节，覆盖常见问题：唯一键冲突导致插入失败、`EXPLAIN` 显示索引未命中、联合索引顺序选错、锁等待/死锁与索引的关系等，并给出应对建议。

### P2 — Nice to Have
1. **补充英文触发词**（8.1 Trigger Precision）：当前 description 仅有中文，英语环境的 Agent 触发可靠性下降；自动检查对 CJK 描述会误报"描述过短"。建议补充英文 `Use when designing/reviewing MySQL schemas...` 或英文关键词列表。
2. **补充 schema 变更/回滚指引**（5.2 Forgiveness）：文档只面向新建表；可补充已有表如何应用规范（`ALTER TABLE`、迁移脚本、回滚策略）。
3. **说明 `timestamp` vs `datetime` 取舍**（1.2 Correctness）：提示 `timestamp` 2038 年范围与时区依赖，说明选择 `timestamp(6)` 的理由及何时用 `datetime(6)`。
4. **增加专门的验证/测试章节**（7.3 Testability）：除 `EXPLAIN` 外，可补充覆盖率检查点（如字段清单核对表、SQL 语法校验命令），或提供 `EXPLAIN` 结果自查清单。

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 89/100 | Baseline — approved (no P0, no manual-review triggers) |
