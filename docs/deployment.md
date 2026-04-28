# Deployment Guide

## 环境配置

项目使用两套 Cloudflare 环境：staging（开发测试）和 production（正式环境）。

### 环境对比

| 配置项 | Staging | Production |
|--------|---------|------------|
| Worker name | `skill-registry-staging` | `skill-registry-production` |
| D1 database | `skill-registry-staging` | `skill-registry-production` |
| R2 bucket | `skill-registry-packages-staging` | `skill-registry-packages-production` |
| 触发条件 | push to main | Git tag (e.g. `v1.0.0`) |

## 首次部署

### 1. 安装 Wrangler 并登录

```bash
npm install -g wrangler
wrangler login
```

### 2. 配置 Cloudflare secrets

```bash
# GitHub OAuth（可选，仅需 GitHub 登录时）
wrangler secret put GITHUB_CLIENT_ID --env staging
wrangler secret put GITHUB_CLIENT_SECRET --env staging
wrangler secret put GITHUB_CLIENT_ID --env production
wrangler secret put GITHUB_CLIENT_SECRET --env production
```

### 3. 创建 D1 数据库

```bash
# Staging
wrangler d1 create skill-registry-staging

# Production
wrangler d1 create skill-registry-production

# 更新 wrangler.toml 中的 database_id 为实际值
```

### 4. 初始化 D1 schema

```bash
# Staging
wrangler d1 execute skill-registry-staging --remote --file=db/schema.sql

# Production
wrangler d1 execute skill-registry-production --remote --file=db/schema.sql
```

### 5. 创建 R2 bucket

```bash
# Staging
wrangler r2 bucket create skill-registry-packages-staging

# Production
wrangler r2 bucket create skill-registry-packages-production
```

### 6. 部署 Worker

```bash
# Staging
wrangler deploy --env staging

# Production（通过 CI release workflow 自动触发）
# 或手动: wrangler deploy --env production
```

## CI/CD 流程

### validate.yml

- 触发：所有 PR（排除 docs/ 和 .md 文件）
- 执行：安装 → 构建 → 测试 → 校验 skills → 构建 registry → 打包 → dry-run 发布

### skill-review.yml

- 触发：PR 修改 `skills/` 目录
- 执行：TS 预检 → 单 skill 校验 → OpenCode AI 审核 → JSON 验证 → 评论结果 → 硬阻断

### release.yml

- 触发：push to main（staging）/ Git tag（production）
- 执行：校验 → 构建 → 打包 → 上传 R2 → 导入 D1 → 部署 Worker

## GitHub Actions 所需 Secrets

在仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `CLOUDFLARE_API_TOKEN` | 具有 Workers、D1、R2 权限的 API Token |

## 回滚流程

1. 确认问题版本
2. 创建 revert PR 或在 main 分支 `git revert` 问题提交
3. release workflow 自动重新部署

## 监控

- Cloudflare Dashboard → Workers → skill-registry → Metrics
- D1 Console → skill-registry → Activity
- GitHub Actions → check workflow 执行状态

## 常见运维操作

### 手动修复 D1 数据

```bash
# 查看所有 skills
wrangler d1 execute skill-registry-staging --remote --command="SELECT name, review_status FROM skills;"

# 批准一个 skill
wrangler d1 execute skill-registry-staging --remote --command="UPDATE skills SET review_status='approved' WHERE name='example-skill';"
```

### 手动上传 skill 到 R2

```bash
wrangler r2 object put skill-registry-packages-staging "skills/example-skill/1.0.0.tar.gz" --file artifacts/packages/example-skill-1.0.0.tar.gz
```
