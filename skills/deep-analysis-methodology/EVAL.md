---
skillName: deep-analysis-methodology
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 89
categoryScores:
  functional-suitability: 12
  reliability: 9
  performance: 6
  usability-ai: 16
  usability-human: 6
  security: 12
  maintainability: 11
  agent-specific: 17
findings:
  - id: F001
    criterion: trigger-precision
    category: agent-specific
    score: 3
    description: >-
      Frontmatter description is only 8 words ('深度分析方法论 — MECE 拆解、5 Why
      根因分析、假设驱动验证、12 步 SOP') and contains no 'Use when...' trigger contexts. The
      automated check FAILED on description length. Specific domain keywords
      (MECE, 5 Why, 根因, 复盘) reduce false-positive risk, but generic '分析'
      mentions could still cause ambiguous activation.
    priority: P1
    suggestion: >-
      Expand description with explicit 'Use when...' contexts
      (事故排查、技术复盘、业务分析、根因定位) and '不要用于...' boundaries, e.g.
      '当用户要求进行事故分析、根因排查、复盘或业务分析时触发；不要用于编写代码'
  - id: F002
    criterion: token-cost
    category: performance
    score: 2
    description: >-
      SKILL.md is 283 body lines, falling in the 250-400 range. Content is dense
      and high-value for a methodology reference, but the entire skill loads
      into context on every activation.
    priority: P1
    suggestion: >-
      Move per-method deep-dives (MECE 详解, 5 Why 深入, 因果链, 风险矩阵) into a
      references/ directory linked from SKILL.md to reduce context load
  - id: F003
    criterion: progressive-disclosure
    category: agent-specific
    score: 2
    description: >-
      Single monolithic SKILL.md with no references/ directory. The domain is
      rich (10 methodologies + 12-step SOP + output templates) and would benefit
      from a 2-level disclosure hierarchy.
    priority: P1
    suggestion: >-
      Create references/ with per-methodology deep-dive files and link them from
      SKILL.md, keeping the main file to the SOP overview and trigger flow
  - id: F004
    criterion: error-reporting
    category: reliability
    score: 2
    description: >-
      No structured error/troubleshooting reference. Recovery guidance exists
      only implicitly via confidence labeling ('无法完整验证时标注置信度') and the Step 12
      verification checklist.
    priority: P2
    suggestion: >-
      Add a troubleshooting subsection covering common failure modes
      (问题不可复现、证据不足、因果无法完整验证) with concrete fallback steps
  - id: F005
    criterion: testability
    category: maintainability
    score: 3
    description: >-
      Verification strategy exists via Step 12 checklist and per-measure 验证标准,
      but there is no dedicated testing/verification reference file and the
      skill ships no test cases.
    priority: P2
    suggestion: >-
      Add a worked example analysis (references/example-analysis.md) that
      doubles as a verification reference for evaluating future outputs
summary: >-
  deep-analysis-methodology v1.0.0 is a well-structured, high-quality
  documentation-only methodology skill covering MECE, 5 Why, hypothesis-driven
  verification, risk matrix, and a 12-step analysis SOP with output templates.
  Automated checks: 12 pass / 1 warn / 1 fail (86%), with the failure being the
  short 8-word description lacking trigger contexts. Manual scoring: 89/100.
  Behavior verification passed 5/5 test cases (2 positive, 1 negative, 2
  boundary), confirming correct triggering on accident analysis and postmortem
  prompts, no misfiring on code-writing prompts, and sensible handling of
  ambiguous boundary prompts. No security issues, no credentials, no scripts, no
  external dependencies. Approved for publishing with recommended improvements
  to the frontmatter description and a references/ split for token efficiency.
reviewedAt: '2026-08-11T14:45:00Z'
reviewer: AI-Evaluator
sourceCommit: d9b74adf8b9d6ce25e01e861944722e2874cc65c
---
<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# deep-analysis-methodology Evaluation

**Date:** 2026-08-11
**Evaluator:** AI-Evaluator
**Skill version:** 1.0.0
**Skill type:** documentation-only
**Automated score:** 12 pass / 1 warn / 1 fail (86% structural)

---

## Automated Checks

```
SKILL.md exists                          PASS
SKILL.md has valid frontmatter           PASS
Skill name matches directory             PASS
Skill type identified                    PASS (documentation-only, no scripts/)
No extraneous files                      PASS
Resource directories are non-empty       PASS
Description length adequate              FAIL (only 8 words)
Description includes trigger contexts    WARN (no "Use when..." phrases)
SKILL.md body length                     PASS (283 body lines)
References are linked from SKILL.md      PASS (no references/ directory)
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
| 1.1 | Completeness | 4/4 | Covers MECE, 5W2H, 5 Why, fishbone, first principles, hypothesis-driven analysis, comparison, causal chain, risk matrix, PDCA + a full 12-step SOP with output templates, evidence table format, and usage examples. Comprehensive for its domain. |
| 1.2 | Correctness | 4/4 | Methodology is sound and standard: MECE, 5 Why, one-variable-at-a-time hypothesis verification, causal verification criteria all correct. |
| 1.3 | Appropriateness | 4/4 | Pure documentation methodology skill. Zero deps, fully portable. Appropriate for accident investigation/postmortem/analysis scenarios. |
| 2.1 | Fault Tolerance `[adj]` | 3/4 | Guides handling of edge cases: "问题必须可以观察、验证和复现" (non-reproducible problems), "无法完整验证时标注置信度", "避免分析无限扩散". No dedicated error scenario section. |
| 2.2 | Error Reporting `[adj]` | 2/4 | No structured error/troubleshooting reference. Recovery guidance implicit in Step 12 verification checklist and confidence labeling. |
| 2.3 | Recoverability | 4/4 | No state or execution. N/A. |
| 3.1 | Token Cost | 2/4 | SKILL.md is 283 body lines (250–400 range). Dense but valuable content; a reference-split would reduce context load. |
| 3.2 | Execution Efficiency `[exempt]` | 4/4 | N/A. |
| 4.1 | Learnability | 4/4 | 12-step SOP with templates at each step plus a standard output template. A fresh AI instance can follow it directly. |
| 4.2 | Consistency | 4/4 | Uniform structure: each step = heading + template/principle + notes. Consistent table and code-block formats. |
| 4.3 | Feedback Quality `[adj]` | 4/4 | Clear section hierarchy (方法 → 12 步 SOP → 输出模板 → 示例), checkpoints per step, actionable output template. |
| 4.4 | Error Prevention `[adj]` | 4/4 | Constraints stated up front: problem must be observable/verifiable/reproducible, avoid unbounded analysis, verify one variable at a time, direct-cause vs root-cause distinction. |
| 5.1 | Discoverability | 3/4 | Frontmatter description lists core methods (MECE, 5 Why, 假设驱动验证, 12 步 SOP) but is only 8 words; lacks "Use when..." guidance. |
| 5.2 | Forgiveness `[adj]` | 3/4 | Version present (1.0.0). Step 11 requires 回滚方案 (rollback plan) per measure — recovery-oriented guidance. |
| 6.1 | Credential Handling | 4/4 | No credentials involved. |
| 6.2 | Input Validation | 4/4 | No user inputs/scripts. N/A. |
| 6.3 | Data Safety | 4/4 | No file operations. N/A. |
| 7.1 | Modularity `[adj]` | 4/4 | Logical sections: 核心方法论 → 通用 12 步 SOP → 标准输出模板 → 使用示例. Easy to navigate. |
| 7.2 | Modifiability `[adj]` | 4/4 | Consistent per-step template; adding a new step/methodology follows a clear copy-paste pattern. |
| 7.3 | Testability `[adj]` | 3/4 | Step 12 verification checklist and per-measure 验证标准 provide verification strategy. No dedicated testing reference file. |
| 8.1 | Trigger Precision | 3/4 | Specific domain keywords (MECE, 5 Why, 根因, 分析, 复盘). Description too short and lacks explicit "Use when" contexts; some ambiguity risk with generic "分析" mentions. |
| 8.2 | Progressive Disclosure | 2/4 | Single 283-line SKILL.md. No references/ directory despite a rich, multi-part domain. Could split per-method deep-dives. |
| 8.3 | Composability `[exempt]` | 4/4 | N/A. |
| 8.4 | Idempotency `[exempt]` | 4/4 | Documentation is inherently idempotent. |
| 8.5 | Escape Hatches `[exempt]` | 4/4 | N/A. |
| | **TOTAL** | **89/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | 使用 deep-analysis-methodology skill 分析以下事故：数据库连接池耗尽导致线上服务不可用。按照 12 步 SOP 执行，输出标准模板格式的报告。 | zh | ✅ | 输出包含问题定义、时间线、证据表、假设及验证、5 Why 根因、四类措施（止损/修复/预防/治理）、验证标准、防止复发措施 | [D] | ✅ |
| T002 | 正向 | Use deep-analysis-methodology to conduct a postmortem of the payment service outage where checkout requests started timing out after the last deployment. | en | ✅ | 输出遵循标准模板（Problem Definition / Timeline / Evidence / Hypotheses / Root Cause via 5 Whys / Solutions with stop-loss/fix/prevent/govern / Verification / Prevention） | [J] | ✅ |
| T003 | 负向 | 帮我写一段 Python 代码解析 JSON 文件。 | zh | ❌ | 不套用分析方法论；直接给出代码实现 | [D] | ✅ |
| T004 | 边界 | 分析一下我们项目的性能问题，为什么会变慢？ | zh | ? | 触发后可给出合理回应：先定义问题、MECE 拆解、假设驱动验证建议，并请求补充可观察指标 | [J] | ✅ |
| T005 | 边界 | Can you review this bug fix pull request and check if the logic is correct? | en | ? | 触发时不强行套用 12 步 SOP；以代码评审方式回应，避免误触发 | [J] | ✅ |

### 覆盖矩阵

| 维度 | 说明 | T001 | T002 | T003 | T004 | T005 |
|------|------|------|------|------|------|------|
| 核心能力 | 12 步 SOP + 标准模板（事故分析） | ✅ | | | | |
| 扩展功能 | 英文复盘场景（postmortem） | | ✅ | | | |
| 防护栏 | 无关场景（写代码）不误触发 | | | ✅ | | |
| 边界/歧义 | 模糊性能问题 / 跨领域代码评审 | | | | ✅ | ✅ |

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | 2 | 2 | 100% |
| 负向 | 1 | 1 | 100% |
| 边界 | 2 | 2 | 100% |
| **总计** | **5** | **5** | **100%** |

**风险标记**：正向 100% 通过（无 P0）；负向 100% 通过（无 P1）；边界 100% 通过（无 P2）。全部通过，无风险。

## Priority Fixes

### P0 — Fix Before Publishing
_(none)_

### P1 — Should Fix
1. **8.1 / Description length (FAIL)** — Frontmatter description is only 8 words and contains no trigger phrases. Add explicit "Use when..." contexts (e.g., 事故排查、技术复盘、业务分析、根因定位) and "不要用于..." boundaries to improve trigger precision and reduce false positives on generic "分析".
2. **3.1 / 8.2 Token Cost & Progressive Disclosure** — SKILL.md is 283 lines in a single file. Consider splitting per-method deep-dives (MECE, 5 Why, 因果链, 风险矩阵) into `references/` to reduce context load and enable progressive disclosure.

### P2 — Nice to Have
1. **2.2 Error Reporting** — Add a troubleshooting note for common failure modes (不可复现、证据不足、无法完整验证因果) with concrete fallback guidance.
2. **7.3 Testability** — Add a dedicated verification reference (e.g., a checklist/example analysis) to strengthen test strategy documentation.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-08-11 | 89/100 | Baseline review |
