---
skillName: merge-old-history-before-hash
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 90
categoryScores:
  functional-suitability: 12
  reliability: 11
  performance: 7
  usability-ai: 14
  usability-human: 7
  security: 12
  maintainability: 10
  agent-specific: 17
findings:
  - id: F001
    criterion: trigger-precision
    category: agent-specific
    score: 3
    description: >-
      描述包含触发场景但缺少显式的 "Use when..." 模式，可能降低激活率。
      "压缩/折叠早期噪声提交" 等用词偏间接。
    priority: P1
    suggestion: >-
      在 description 开头添加 "Use when 用户需要将 Git 历史中某个 commit
      之前的提交压缩为一条" 等直接触发句式。
  - id: F002
    criterion: testability
    category: maintainability
    score: 2
    description: >-
      无测试套件。merge-history.sh 是单体脚本，函数未拆分为独立单元，
      难以在 CI 中做单元测试。需要真实 git 仓库才能集成测试。
    priority: P2
    suggestion: >-
      将前置校验逻辑拆分为独立函数（如 check_clean_workspace、
      validate_target_hash），可单独测试。补充一个最小集成测试脚本。
  - id: F003
    criterion: discoverability
    category: usability-human
    score: 3
    description: >-
      脚本在文件头有使用说明，但没有 `--help` 标志。用户只能通过
      阅读 SKILL.md 或脚本源码了解用法。
    priority: P2
    suggestion: >-
      添加 `--help` 处理，输出用法和示例。
  - id: F004
    criterion: execution-efficiency
    category: performance
    score: 3
    description: >-
      `git add -A` 在孤儿分支中会添加所有文件（含 .gitignore 排除项）。
      通常无害但在大型仓库中可能引入不必要的文件。
    priority: P2
    suggestion: >-
      考虑使用 `git reset HEAD . && git add .` 或 `git ls-files` 范围限定。
  - id: F005
    criterion: idempotency
    category: agent-specific
    score: 3
    description: >-
      脚本不可安全重放：第二次运行会在不洁工作区失败；若通过会创建重复
      备份分支。
    priority: P2
    suggestion: >-
      建议在脚本开头检查备份分支是否已存在，若存在则提示清理后重试。
  - id: F006
    criterion: feedback
    category: usability-ai
    score: 3
    description: >-
      脚本有完成提示和验证命令，但 cherry-pick 逐个过程中无进度输出。
      大量提交时 AI/用户不知道进度。
    priority: P2
    suggestion: >-
      在 cherry-pick 循环中添加 `echo "[$i/$total] cherry-picking $short_hash"`。
  - id: F007
    criterion: error-prevention
    category: usability-ai
    score: 3
    description: >-
      有备份和预检，但缺少 `--dry-run` 模式让用户先预览将要执行的变更。
    priority: P2
    suggestion: >-
      添加 `--dry-run` 模式：输出将要创建的分支名、cherry-pick 的提交列表等。
  - id: F008
    criterion: composability
    category: agent-specific
    score: 3
    description: >-
      脚本使用清晰的退出码（0/1/2/3）和 stderr 错误输出，但没有
      `--json` 输出格式，无法被上游工具结构化解析。
    priority: P2
    suggestion: >-
      考虑添加 `--json` 标志，在完成时输出结构化 JSON 结果。
summary: >-
  评估分数 90/100，通过审核。脚本健壮：预校验、
  备份分支、明确的退出码和回滚路径均到位。8 个 P1/P2 建议改善点：
  添加 "Use when" 描述模式、--help/--dry-run/--json 标志、
  进度输出和测试。
reviewedAt: 2026-05-14T20:50:00Z
reviewer: AI-Evaluator
---

# merge-old-history-before-hash Evaluation

**Date:** 2026-05-14
**Evaluator:** AI-Evaluator (skill-evaluator v1.0)
**Skill version:** 1.0.0
**Skill type:** Tool

---

## Automated Checks

```
📋 Skill Evaluation: merge-old-history-before-hash
  ✅ Pass: 12  ⚠️  Warn: 2  ❌ Fail: 0
  Structural score: 86% (12/14 checks passed)

  [STRUCTURE]
    ✅ SKILL.md exists, valid frontmatter, name matches directory
    ✅ Tool skill (1 executable script)
    ✅ No extraneous files

  [TRIGGER]
    ⚠️  Description length adequate (26 words)
    ⚠️  No trigger phrases found — add 'Use when...'

  [DOCUMENTATION]
    ✅ SKILL.md body: 71 lines
    ✅ No dangling references

  [SCRIPTS]
    ✅ No Python scripts (bash only)
    ✅ No external dependencies

  [SECURITY]
    ✅ No hardcoded credentials
    ✅ Environment variables documented
```

---

## Manual Assessment — 25 Criteria

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | Completeness | 4/4 | 覆盖完整流程：参数收集→预检→备份→孤儿根→cherry-pick→验证→替换→回滚。检测 merge commit 阻止危险操作。 |
| 1.2 | Correctness | 4/4 | `set -euo pipefail` + 孤儿分支 `git add -A` + cherry-pick 回放模式正确。备份分支创建不切换，验证 diff 命令准确。 |
| 1.3 | Appropriateness | 4/4 | 纯 bash，零外部依赖，仅需 git。跨平台可移植。 |
| 2.1 | Fault Tolerance | 3/4 | `set -euo pipefail` + 前置校验覆盖脏工作区/无效 hash/祖先关系。cherry-pick 失败有捕获。缺少信号(SIGINT/SIGTERM)清理和重试逻辑。 |
| 2.2 | Error Reporting | 4/4 | 清晰的中文错误信息到 stderr，明确退出码(1/2/3)，可操作（"请先提交或 stash"、"人工处理"、"可切回备份分支"）。 |
| 2.3 | Recoverability | 4/4 | 自动创建备份分支，cherry-pick --abort 路径，SKILL.md 有完整回滚章节，多条恢复路径。 |
| 3.1 | Token Cost | 4/4 | SKILL.md 96 行，远低于 150，简洁参数表+命令行示例，无冗余内容。 |
| 3.2 | Execution Efficiency | 3/4 | `git rev-list --reverse` O(n) 无外部 API 调用。`git add -A` 在孤儿分支可能包含 .gitignore 排除文件（通常无害但不够精确）。 |
| 4.1 | Learnability | 4/4 | SKILL.md 清晰解释 what/why/how，参数表含默认值，ASCII 图示展示前后变化。Agent 无需读脚本源码。 |
| 4.2 | Consistency | 4/4 | 单一脚本接口清晰，SKILL.md 结构一致：执行→验证→替换→回滚。 |
| 4.3 | Feedback Quality | 3/4 | 脚本输出清晰的完成提示和验证命令，退出码一致。缺少 cherry-pick 逐一进度输出和 JSON 格式。 |
| 4.4 | Error Prevention | 3/4 | 强预检（脏工作区、无效 hash、祖先关系），默认仅创建新分支不覆盖。缺少 `--dry-run` 预览模式。 |
| 5.1 | Discoverability | 3/4 | SKILL.md 完整记录了所有参数和命令。缺少 `--help` 标志。 |
| 5.2 | Forgiveness | 4/4 | 自动备份分支，SKILL.md 有回滚章节，cherry-pick abort 路径，替换步骤手动可选的。 |
| 6.1 | Credentials | 4/4 | 无凭据，纯本地 git 操作。 |
| 6.2 | Input Validation | 4/4 | `${1:?}` / `${2:?}` 强制必填参数，`git rev-parse --verify` 验证 hash，`git merge-base --is-ancestor` 检查祖先。 |
| 6.3 | Data Safety | 4/4 | 修改前自动备份，替换步骤手动可选，默认仅创建新分支。建议 `push --force-with-lease` 而非 `--force`。 |
| 7.1 | Modularity | 4/4 | 脚本按阶段分节（前置检查→备份→创建新历史→回放→完成），标注清晰。SKILL.md 结构良好。 |
| 7.2 | Modifiability | 4/4 | 分节标记清晰，退出码/错误消息模式一致。添加新的预检或修改流程容易。 |
| 7.3 | Testability | 2/4 | 无测试套件，函数未拆分。需真实 git 仓库做集成测试。建议拆分预检函数为可单元测试单元。 |
| 8.1 | Trigger Precision | 3/4 | 描述含触发场景和关键词（"将指定 commit"、"Git 历史压缩"、"cherry-pick"）。缺少显式 "Use when..." 模式。 |
| 8.2 | Progressive Disclosure | 4/4 | 3 层：description → SKILL.md body → 脚本源码。SKILL.md 简洁，引用了脚本路径。 |
| 8.3 | Composability | 3/4 | 退出码明确(0/1/2/3)，stderr 错误输出。无 `--json` 结构化输出。 |
| 8.4 | Idempotency | 3/4 | 重跑会在脏工作区或重复备份分支时报错，失败优雅但不可安全重放。 |
| 8.5 | Escape Hatches | 4/4 | 参数完整（hash/message/branch），默认安全行为，手动替换步骤，多条恢复路径。 |
| | **TOTAL** | **90/100** | |

---

## Priority Fixes

### P1 — Should Fix
1. **F001 — 添加 "Use when..." 触发模式**：在 description 开头加入显式触发句式，提升代理激活率。

### P2 — Nice to Have
2. **F002 — 提高可测试性**：拆分脚本函数，添加最小集成测试。
3. **F003 — 添加 --help 标志**：输出用法和示例。
4. **F004 — 优化 git add 范围**：使用更精确的文件添加方式。
5. **F005 — 改善幂等性**：检测备份分支是否存在。
6. **F006 — 添加 cherry-pick 进度**：循环中显示提交进度。
7. **F007 — 添加 --dry-run 模式**：预览将要执行的变更。
8. **F008 — 添加 --json 输出**：支持结构化结果解析。

---

## Revision History
| Date | Score | Notes |
|------|-------|-------|
| 2026-05-14 | 90/100 | Baseline evaluation |
