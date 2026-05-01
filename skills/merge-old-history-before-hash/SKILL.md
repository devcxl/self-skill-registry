---
name: merge-old-history-before-hash
description: |
  将指定 commit（含）之前的 Git 历史压缩为一个新的根提交，再把之后的提交按顺序 cherry-pick 到新历史上。

  触发场景：
  - 用户说"把某个 hash 之前的历史合并成一个提交"
  - 压缩/折叠早期噪声提交，只保留近期增量历史
  - 发布前整理仓库，生成"一个基线 + 后续增量提交"结构
  - 清理历史再对外开源或归档

  不适用：含大量 merge commit 的复杂拓扑、多人共享且禁止 force push 的公共分支。
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - git
category: utilities
metadata:
  language: cn
  license: MIT
  author: devcxl
---

# merge-old-history-before-hash

将 `target_hash`（含）之前的所有提交压缩为一个新的根提交，保留其后的线性历史。

```
之前: A -- B -- C(target_hash) -- D -- E
之后: M(merged_message) -- D' -- E'
```

`M` 的文件树与 `C` 完全一致；`D'`、`E'` 是顺序 cherry-pick 的结果。

---

## 执行前：收集参数

向用户确认以下信息（未提供则按默认值处理）：

| 参数 | 说明 | 默认值 |
|---|---|---|
| `target_hash` | 边界提交 hash（含此提交被压缩） | 必填 |
| `merged_message` | 新根提交信息 | 必填 |
| `source_branch` | 待处理分支 | 当前分支 |

默认行为：生成新分支供人工验证，**不直接覆盖原分支**。

---

## 执行脚本

使用 [`scripts/merge-history.sh`](scripts/merge-history.sh)：

```bash
bash scripts/merge-history.sh <target_hash> "<merged_message>" [source_branch]
```

脚本会自动完成：前置校验 → 备份 → 创建孤儿根提交 → cherry-pick → 给出后续操作提示。

> **merge commit 检测**：若 `target_hash` 之后存在 merge commit，脚本会以 exit code 2 中止，需人工处理。

---

## 验证结果

```bash
# 查看新历史
git log --oneline --decorate

# 验证新根提交文件树与 target_hash 完全一致（输出为空即正确）
git diff "$target_hash" "$(git rev-list --max-parents=0 HEAD)"
```

---

## 替换原分支（验证通过后）

```bash
git branch -f <source_branch> <base_branch>
git switch <source_branch>
git push --force-with-lease
```

---

## 回滚

| 场景 | 命令 |
|---|---|
| cherry-pick 过程中失败 | `git cherry-pick --abort` |
| 放弃改写，回原分支 | `git switch <source_branch> && git reset --hard <backup_branch>` |
| 直接切回备份继续工作 | `git switch <backup_branch>` |
