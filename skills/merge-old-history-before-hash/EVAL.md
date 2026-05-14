---
skillName: merge-old-history-before-hash
skillVersion: 1.0.0
reviewStatus: approved
needsManualReview: false
totalScore: 82
categoryScores:
  functional-suitability: 12
  reliability: 10
  performance: 8
  usability-ai: 15
  usability-human: 7
  security: 10
  maintainability: 11
  agent-specific: 9
findings:
  - id: F001
    criterion: completeness-edge-cases
    category: functional-suitability
    score: 3
    description: >-
      SKILL.md 96 行，覆盖了核心流程（fetch origin、创建孤儿分支、读取 commit
      log、cherry-pick + 冲突提示、reset）。清晰指明了不适用场景（含大量 merge
      的高复杂度拓扑、共享公共分支）。缺少对签名提交（GPG）的说明。
    priority: P2
    suggestion: >-
      可在"注意事项"部分补充 GPG 签名提交被 cherry-pick 后会变 untrusted 的说明。
  - id: F002
    criterion: safety-guardrails
    category: reliability
    score: 2
    description: >-
      Git 历史重写是高危操作。SKILL.md 声明了"公共/共享分支不适用"的边界，但
      未内嵌任何检查（如检测远程多人协作分支、强制用户确认后再执行）。
    priority: P1
    suggestion: >-
      在第 2-3 步之间增加交互确认："准备好 force push 了？"以及建议先 push
      --dry-run 检查。
  - id: F003
    criterion: trigger-precision
    category: agent-specific
    score: 3
    description: >-
      触发场景列表清晰（说"把某个 hash 之前的历史合并"、压缩早期噪声）。但
      部分触发场景用短语描述而非完整问句，激活率可能不够高。
    priority: P1
    suggestion: >-
      在 description 中补充更完整的问法示例，如"如何把某个 commit 之前的提交
      压缩成一条"、"怎样清理 Git 早期 commit 历史"。
summary: >-
  Skill 分数 82/100，通过审核。主要改进点：增加 GPG 签名说明和安全确认步骤。
reviewedAt: 2026-05-10T12:00:00Z
reviewer: system-migration
---

# merge-old-history-before-hash Evaluation

## Purpose

Automated evaluation of the git history squashing skill for the self-skill-registry.

## Verdict

Approved (82/100). The skill correctly implements the core workflow:
orphan branch → cherry-pick → reset. Trigger scenarios are well-documented
and the safety boundary ("不适用于公共分支") is clearly stated.

## Recommendations

1. Add interactive safety confirmation before force push.
2. Explain GPG signature implications after cherry-pick.
3. Expand trigger phrases for better skill activation.
