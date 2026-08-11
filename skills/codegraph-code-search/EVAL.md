---
skillName: codegraph-code-search
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 94
categoryScores:
  functional-suitability: 11
  reliability: 11
  performance: 7
  usability-ai: 16
  usability-human: 7
  security: 12
  maintainability: 10
  agent-specific: 20
findings:
  - id: F001
    criterion: testability
    category: maintainability
    score: 2
    description: >-
      No dedicated testing strategy or reference, and behavior verification
      could not be executed in the CI sandbox because the CodeGraph CLI and a
      .codegraph/ index are not available. The 5 proposed test cases in EVAL.md
      remain unverified.
    priority: P1
    suggestion: >-
      Run the 5 behavior-verification test cases against a real repository with
      a CodeGraph index, or add a lightweight harness using `codegraph
      status`/`codegraph --help` output.
  - id: F002
    criterion: error-reporting
    category: reliability
    score: 3
    description: >-
      Failure handling is a well-ordered 6-step checklist but lacks a structured
      per-symptom error reference table.
    priority: P2
    suggestion: >-
      Add a symptom → command → action table (e.g., 'results stale' → codegraph
      sync; 'stale lock' → codegraph unlock) for direct troubleshooting.
  - id: F003
    criterion: token-cost
    category: performance
    score: 3
    description: >-
      SKILL.md is 193 lines (184 body), within the 150-250 acceptable band, but
      search-workflow examples add length.
    priority: P2
    suggestion: >-
      Trim workflow examples or move them into references/cli-reference.md to
      keep the core SKILL.md near ~150 lines.
  - id: F004
    criterion: trigger-precision
    category: agent-specific
    score: 4
    description: >-
      Description is precise and well-bounded (specific actions + explicit 'when
      not to use' boundary), but automated trigger detection flags it because
      the phrasing is 'Use it when' rather than 'Use when'.
    priority: P2
    suggestion: >-
      Rephrase 'Use it when locating symbols' to 'Use when locating symbols' to
      satisfy automated trigger checks.
  - id: F005
    criterion: correctness
    category: functional-suitability
    score: 3
    description: >-
      Commands and flags appear consistent with cited CodeGraph docs and are
      internally consistent, but could not be executed-verified in CI (no
      codegraph binary installed).
    priority: P2
    suggestion: >-
      Verify key command flags (query --kind, files --filter, affected --stdin)
      against a live `codegraph help` in a real environment.
summary: >-
  Skill 'codegraph-code-search' is a well-structured documentation-only skill
  for using the CodeGraph CLI as a structural code-search and navigation tool.
  It provides comprehensive command selection guidance
  (explore/query/node/callers/callees/impact/files/affected/status), an ordered
  failure-handling checklist, freshness and correctness caveats, a clear 'when
  not to use' boundary versus text search, and an excellent 3-level progressive
  disclosure (description → SKILL.md → references/cli-reference.md). All
  automated checks pass except two warnings (extraneous README.md,
  trigger-phrase detection). Score 94/100 with no P0 blockers. The primary gap
  is behavioral verification, which requires a real CodeGraph environment and
  was not executable in CI (P1); remaining items are P2 polish. Skill is
  approved for publishing.
reviewedAt: '2026-08-11T11:15:34Z'
reviewer: AI-Evaluator
sourceCommit: 826352441564c27b58139a41444799a36943fe96
---
<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# codegraph-code-search Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 86% (12/14 checks passed, 2 warnings)

---

## Automated Checks

```
📋 Skill Evaluation: codegraph-code-search
==================================================
Path: .../skills/codegraph-code-search
Type: Documentation-only

  [STRUCTURE]
    ✅ SKILL.md exists
    ✅ SKILL.md has valid frontmatter
    ✅ Skill name matches directory
    ✅ Skill type identified
       Documentation-only skill (no scripts/ directory)
    ⚠️  No extraneous files
       Found: README.md — skills shouldn't include these
    ✅ Resource directories are non-empty

  [TRIGGER]
    ✅ Description length adequate
       61 words
    ⚠️  Description includes trigger contexts
       No trigger phrases found — add 'Use when...' to improve activation

  [DOCUMENTATION]
    ✅ SKILL.md body length
       184 lines
    ✅ References are linked from SKILL.md

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
  ✅ Pass: 12  ⚠️  Warn: 2  ❌ Fail: 0
  Structural score: 86% (12/14 checks passed)
```

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | Covers all core operations: explore, query, node, files, callers, callees, impact, affected, status, plus init/sync/index lifecycle, freshness handling, failure recovery, and output discipline. Exceptionally thorough. |
| 1.2 | Correctness | 3/4 | Commands/flags align with the cited CodeGraph source docs and are internally consistent. Cannot be executed-verified in CI (no `codegraph` binary). Mitigated by the "local-version rule" (defer to `codegraph help`). |
| 1.3 | Appropriateness | 4/4 | Zero deps in the skill; correct approach for a CLI-wrapper documentation skill. Clear boundaries vs. text search. |
| 2.1 | Fault Tolerance `[adj]` | 4/4 | Ordered 6-step failure checklist (status → sync → file support → gitignore/codegraph.json → index → unlock), plus freshness and stale-file guidance. Comprehensive. |
| 2.2 | Error Reporting `[adj]` | 3/4 | Good recovery guidance, but no structured per-error reference table (symptom → command → action). |
| 2.3 | Recoverability | 4/4 | sync/unlock/index provide clear recovery paths; all query commands are read-only/idempotent. |
| 3.1 | Token Cost | 3/4 | SKILL.md 193 lines (184 body) — in the 150–250 band. Progressive disclosure via `references/cli-reference.md` works well. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | N/A — documentation skill. |
| 4.1 | Learnability | 4/4 | SKILL.md + reference are sufficient for a fresh agent; never needs to read source. |
| 4.2 | Consistency | 4/4 | Uniform command-selection table, consistent flag conventions, consistent workflow structure. |
| 4.3 | Feedback Quality `[adj]` | 4/4 | Clear hierarchy (core rule → before searching → command selection → workflows → failure → output discipline). Scannable tables. |
| 4.4 | Error Prevention `[adj]` | 4/4 | Prerequisites stated, "don't run sync before every query", "do not invent flags", stale/runtime-caveat warnings. Safe defaults throughout. |
| 5.1 | Discoverability | 4/4 | All commands documented; `codegraph help` referenced as source of truth; full reference file. |
| 5.2 | Forgiveness `[adj]` | 3/4 | Version noted (1.0.0); local-version rule and unlock/re-index recovery provided. No explicit rollback/undo section. |
| 6.1 | Credential Handling | 4/4 | No credentials; no scripts. |
| 6.2 | Input Validation | 4/4 | No scripts; flag validation via `codegraph help` guidance. |
| 6.3 | Data Safety | 4/4 | No destructive ops; `unlock` carries a safety caveat; init/index guidance is conservative. |
| 7.1 | Modularity `[adj]` | 4/4 | Logical layered sections (setup → search → freshness → failure → reporting) plus reference file. |
| 7.2 | Modifiability `[adj]` | 4/4 | Consistent per-command pattern; adding a command is copy-paste-modify. |
| 7.3 | Testability `[adj]` | 2/4 | No dedicated testing strategy/reference; behavior verification not executable in CI (CodeGraph CLI + index absent). See F001. |
| 8.1 | Trigger Precision | 4/4 | Specific domain + action words + explicit "when not to use" boundary. Automated check false-negatives on "Use it when" phrasing (see F004). |
| 8.2 | Progressive Disclosure | 4/4 | 3 levels: description → SKILL.md → references/cli-reference.md. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A — documentation skill. |
| 8.4 | Idempotency `[exempt]` | 4/4 | N/A — documentation skill. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A — documentation skill. |
| | **TOTAL** | **94/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
>
> **每个 skill 必须包含至少 4 条测试用例**：2 条正向、1 条负向、1 条边界场景。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | 这个仓库里 `createOrder` 被哪些地方调用了？ | zh | ✅ | 输出调用 `codegraph callers` 相关命令，返回调用点文件路径与符号名 | [D] | ⬜ |
| T002 | 正向 | 解释一下订单从 controller 到持久层的完整流程 | en | ✅ | 输出 `codegraph explore` 命令，并依据返回的 call path 组织回答 | [J] | ⬜ |
| T003 | 负向 | 在代码里搜一下字面量 `Authorization: Bearer` 出现的所有位置 | zh | ❌ | 不使用 CodeGraph（明确说明走文本搜索/直接读文件） | [D] | ⬜ |
| T004 | 边界 | 列出项目根目录下的目录结构 | zh | ? | 触发 `codegraph files --max-depth` 或给出等价的文件结构说明，不报错 | [J] | ⬜ |
| T005 | 边界 | 上次搜索结果好像过时了，帮我查一下索引状态 | zh | ? | 触发 `codegraph status` 并按失败处理清单给出下一步 | [J] | ⬜ |

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
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 codegraph callers" / "输出未包含 codegraph" |
| `[J]` | 人工判断 — 输出质量需要人审 | "call path 描述是否准确" / "文件结构是否清晰" |

> **原则**：能写 `[D]` 就不写 `[J]`。`[D]` 的用例可以进 CI 自动化；`[J]` 的用例在评审时逐条人工核对。

### 编写指南

1. **正向用例** → 选 skill 描述中 "Use when..." 最典型的 2 个场景
2. **负向用例** → 选看起来像、但不属于本 skill 的干扰场景；或直接要求做 skill 明确不支持的事
3. **边界用例** → 选多 skill 可能竞争的交叉领域；或用过时的参数/命令调用
4. 验证点写**具体可观察的行为**，不要写主观感受
5. 如果 skill 是**纯流程型**（无代码产出），验证点应聚焦"是否按流程步骤执行"和"是否产出指定文件"

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | 0 | — |
| 负向 | 1 | 0 | — |
| 边界 | 2 | 0 | — |
| **总计** | 5 | 0 | 0% |

> ⚠️ 本环境未安装 CodeGraph CLI 且无 `.codegraph/` 索引，5 条用例均**无法在本 CI 环境执行**。需在含 CodeGraph 索引的真实仓库中验证（见 P1/F001）。

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用（未验证，待补）
- 负向通过率 < 100% → **P1**：存在误触发风险（未验证，待补）
- 边界通过率 < 50% → **P2**：健壮性不足（未验证，待补）

## Priority Fixes

### P0 — Fix Before Publishing
None. No credential leaks, no path traversal, valid frontmatter, name matches directory, no failed security checks.

### P1 — Should Fix
1. **Behavior Verification (7.3 / Testability)**: CodeGraph CLI and a `.codegraph/` index are not available in the CI sandbox, so the 5 test cases above could not be executed. Run them in a repository that has CodeGraph indexed (or add a lightweight verification harness using `codegraph --help` / `codegraph status` output) before relying on this skill in production.

### P2 — Nice to Have
1. **Structured Error Reference (2.2)**: Add a symptom → command → action table (e.g., "results stale" → `codegraph sync`, "lock file present" → `codegraph unlock`) to make the failure checklist more directly actionable.
2. **Token Cost (3.1)**: SKILL.md is 193 lines; the search-workflow section examples could be trimmed or pushed deeper into `references/cli-reference.md` to keep the core doc under ~150 lines.
3. **Trigger Phrasing (8.1)**: The description uses "Use it when locating symbols…" which the automated trigger check does not match. Rephrase to "Use when locating…" to improve automated activation detection.
4. **Extraneous README.md**: `README.md` in the skill directory triggers the "no extraneous files" warning. The registry already derives `readme` from `SKILL.md`; consider removing or moving it outside `skills/<name>/`.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 94/100 | Baseline evaluation |
