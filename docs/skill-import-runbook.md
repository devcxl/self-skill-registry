# Skill Import Runbook

为现有 400+ skills 逐个 PR 导入 Registry 的操作指南。

## 原则

1. **一个 PR 一个 skill** — 绝不批量导入
2. **AI 审核通过才展示** — 未通过审核的 skill 不会出现在 Web UI 中
3. **不绕过审核门禁** — 管理员 bypass 仅用于紧急情况，不作为常规流程
4. **不提供 batch-import 脚本** — 刻意不提供，确保每个 skill 都经过审核

## 前置条件

- [ ] 仓库已配置 Cloudflare secrets（`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`）
- [ ] D1 数据库已初始化（`wrangler d1 execute --file=db/schema.sql`）
- [ ] R2 bucket 已创建
- [ ] CI workflows（validate, skill-review, release）已运行通过至少一次

## 导入流程

### 1. 准备 skill 目录

将现有 skill 按照标准目录结构组织：

```text
skills/<skill-name>/
├── SKILL.md          # 必需的入口文件，包含 YAML frontmatter
├── README.md         # 可选，但推荐
├── references/       # 参考文档
├── examples/         # 使用示例
└── scripts/          # 辅助脚本
```

### 2. 检查 frontmatter

确保 `SKILL.md` 的 YAML frontmatter 包含：

```yaml
---
name: <skill-name>          # 必须与目录名一致
description: <description>   # 必填，清晰描述 skill 用途
version: 1.0.0              # 必填，semver 格式
compatibility:               # 必填，至少一个
  - opencode
  - claude-code
  - codex
tags:                        # 可选
  - tag1
  - tag2
category: <category>         # 可选
metadata:                    # 可选，自由格式
  language: zh-CN
---
```

### 3. 本地验证

```bash
# 校验 frontmatter
npm run validate:skills

# 构建 registry metadata
npm run build:registry

# 打包 skill
npm run pack:skills
```

### 4. 创建 PR

```bash
# 使用辅助脚本生成分支名
BRANCH="skill/$(echo $SKILL_NAME | tr '[:upper:]' '[:lower:]')"
git checkout -b "$BRANCH"
git add "skills/$SKILL_NAME/"
git commit -m "feat: add skill $SKILL_NAME v1.0.0"
git push -u origin "$BRANCH"

# 创建 PR（描述参考 PR 模板）
```

### 5. 等待 AI 审核

- CI 自动运行 validate workflow
- skill-review workflow 调用 OpenCode 执行审核
- 审核产出 `EVAL.md` 和 `artifacts/skill-review.json`
- 审核结果自动评论在 PR 上

### 6. 处理审核结果

| 审核状态 | 操作 |
|----------|------|
| `approved` | 合并 PR，自动部署到 staging |
| `rejected` | 查看 EVAL.md，修复问题后更新 PR |
| `needs_manual_review` | 管理员在 /admin 面板手动审核 |

### 7. 合并后部署

合并到 main 后，release workflow 自动：
1. 打包 skill 为 tarball
2. 上传到 R2（staging）
3. 导入元数据到 D1
4. 部署 Worker

Production 部署需要手动触发（通过 Git tag）。

## 批量导入辅助脚本

使用以下脚本生成一批 skill 的导入分支：

```bash
#!/bin/bash
# scripts/gen-import-branches.sh
# 用法: bash scripts/gen-import-branches.sh skills/

SKILLS_DIR="${1:-skills/}"
COUNT=0

for dir in "$SKILLS_DIR"*/; do
  SKILL_NAME=$(basename "$dir")
  COUNT=$((COUNT + 1))
  echo "[$COUNT] $SKILL_NAME"
  echo "  git checkout -b skill/$SKILL_NAME"
  echo "  git add skills/$SKILL_NAME/"
  echo "  git commit -m \"feat: add skill $SKILL_NAME\""
  echo "  git push -u origin skill/$SKILL_NAME"
  echo ""
done

echo "Total: $COUNT skills"
```

**注意**：此脚本仅用于生成 git 命令，不会绕过审核门禁。每个 PR 仍需通过 AI 审核。

## 常见问题

### Q: 一个 skill 审核需要多久？
A: AI 审核通常在 PR 提交后 2-5 分钟内完成。

### Q: 可以同时提交多个 skill PR 吗？
A: 可以，每个 skill 一个独立 PR，互不影响。

### Q: rejected skill 如何处理？
A: 查看 EVAL.md 了解具体问题，修复后在同一个 PR 中更新。CI 会重新审核。

### Q: 如何查看审核进度？
A: 查看 PR 的 checks 和 comments；Web UI 的 /admin 面板可查看所有 pending 状态 skill。

## 进度追踪

建议使用以下表格追踪导入进度：

| # | Skill Name | PR | Status | Notes |
|---|------------|----|--------|-------|
| 1 | example-skill | #1 | ✅ approved | 第一个通过审核的 skill |
| 2 | ... | | | |
| ... | | | | |
| 400 | ... | | | |
