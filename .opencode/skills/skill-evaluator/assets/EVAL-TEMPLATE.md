<!-- Front matter is injected by CI from artifacts/skill-review.json. Do not add it manually. -->

# [SKILL_NAME] Evaluation

**Date:** YYYY-MM-DD
**Evaluator:** [agent/human]
**Skill version:** [version or commit]
**Skill type:** [documentation-only | tool]
**Automated score:** [run eval-skill.py and paste summary]

---

## Automated Checks

```
[paste eval-skill.py output here]
```

## Manual Assessment

> **For documentation-only skills:** Criteria marked `[exempt]` are auto-scored 4.
> Criteria marked `[adj]` use documentation-adjusted standards (see rubric.md).

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | /4 | |
| 1.2 | Correctness | /4 | |
| 1.3 | Appropriateness | /4 | |
| 2.1 | Fault Tolerance `[adj]` | /4 | |
| 2.2 | Error Reporting `[adj]` | /4 | |
| 2.3 | Recoverability | /4 | |
| 3.1 | Token Cost | /4 | |
| 3.2 | Execution Efficiency `[exempt]` | /4 | |
| 4.1 | Learnability | /4 | |
| 4.2 | Consistency | /4 | |
| 4.3 | Feedback Quality `[adj]` | /4 | |
| 4.4 | Error Prevention `[adj]` | /4 | |
| 5.1 | Discoverability | /4 | |
| 5.2 | Forgiveness `[adj]` | /4 | |
| 6.1 | Credential Handling | /4 | |
| 6.2 | Input Validation | /4 | |
| 6.3 | Data Safety | /4 | |
| 7.1 | Modularity `[adj]` | /4 | |
| 7.2 | Modifiability `[adj]` | /4 | |
| 7.3 | Testability `[adj]` | /4 | |
| 8.1 | Trigger Precision | /4 | |
| 8.2 | Progressive Disclosure | /4 | |
| 8.3 | Composability `[exempt]` | /4 | |
| 8.4 | Idempotency `[exempt]` | /4 | |
| 8.5 | Escape Hatches `[exempt]` | /4 | |
| | **TOTAL** | **/100** | |

## Behavior Verification

> 行为验证是通过实际向 Agent 发送提示词、检查输出是否符预期，来验证 skill 的**真实表现**。
> 静态检查（Automated Checks）验证 skill 文件本身，行为验证验证 skill **在使用中的效果**。
> 
> **每个 skill 必须包含至少 4 条测试用例**：2 条正向、1 条负向、1 条边界场景。

### 测试用例

**符号说明**：`[D]` = 确定性验证（可自动化），`[J]` = 人工判断

| ID | 类型 | 提示词 | 语言 | 应触发 | 验证点（预期行为） | 验证 | 结果 |
|----|------|--------|------|--------|-------------------|------|------|
| T001 | 正向 | [该 skill 最典型的触发场景] | zh | ✅ | [输出应包含的关键词/结构/行为] | [D] | ⬜ |
| T002 | 正向 | [另一个核心功能场景] | en | ✅ | [输出应包含的关键词/结构/行为] | [J] | ⬜ |
| T003 | 负向 | [不应触发此 skill 的提示词] | zh | ❌ | 不应被此 skill 截获；或触发后能正确拒绝 | [D] | ⬜ |
| T004 | 边界 | [模棱两可、可能误触发的提示词] | zh | ? | [行为预期：触发或不触发均可，但必须给出合理回应] | [J] | ⬜ |
| T005 | 边界 | [跨领域/歧义场景] | zh | ? | 若触发则输出应与 skill 领域相关；若未触发则不干涉 | [J] | ⬜ |

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
| `[D]` | 确定性验证 — 可写成正则或脚本 | "输出包含 CREATE TABLE" / "`grep -c 'import requests'` == 0" |
| `[J]` | 人工判断 — 输出质量需要人审 | "代码风格符合项目规范" / "方案取舍是否合理" |

> **原则**：能写 `[D]` 就不写 `[J]`。`[D]` 的用例可以进 CI 自动化；`[J]` 的用例在评审时逐条人工核对。

### 编写指南

1. **正向用例** → 选 skill 描述中 "Use when..." 最典型的 2 个场景
2. **负向用例** → 选看起来像、但不属于本 skill 的干扰场景；或直接要求做 skill 明确不支持的事
3. **边界用例** → 选多 skill 可能竞争的交叉领域；或用过时的参数/命令调用
4. 验证点写**具体可观察的行为**，不要写主观感受：
   - ❌ "输出质量好"
   - ✅ "输出包含 EXPLAIN 关键字" / "输出包含至少一个 SQL 代码块"
5. 如果 skill 是**纯流程型**（无代码产出，如 skill-evaluator 自身），验证点应聚焦"是否按流程步骤执行"和"是否产出指定文件"

### 验证结果

| 维度 | 用例数 | 通过数 | 通过率 |
|------|--------|--------|--------|
| 正向 | | | — |
| 负向 | | | — |
| 边界 | | | — |
| **总计** | | | — |

**风险标记**：
- 正向通过率 < 100% → **P0**：核心功能不可用
- 负向通过率 < 100% → **P1**：存在误触发风险
- 边界通过率 < 50% → **P2**：健壮性不足，建议改进

## Priority Fixes

### P0 — Fix Before Publishing
1.

### P1 — Should Fix
1.

### P2 — Nice to Have
1.

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| | /100 | Baseline |
