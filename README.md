# Self-Skill Registry

AI 编程智能体（OpenCode / Claude Code / Codex）技能的私有注册表 — 管理、审核、分发技能包，基于 Cloudflare Workers + D1 + R2 构建。

## 架构

```
skills/                  业务 Skill 集合（SKILL.md + EVAL.md）
    ↓
scripts/                 构建管道：校验 → 构建索引 → 打包 → 入库 → 上传
    ↓
apps/worker/             Cloudflare Worker（Hono + JSX）
    ├── API 路由         搜索、下载、审核、管理
    ├── Web UI           Hono JSX 渲染的管理面板
    └── 中间件           OIDC 鉴权（GitHub / 飞书 / 钉钉）
    ↓
packages/registry-core/  纯逻辑共享包（校验、安全扫描、Manifest 生成）
    ↓
Cloudflare
    ├── D1               SQLite 数据库（skills / versions / reviews / downloads / users）
    └── R2               对象存储（skills/<name>/<version>.tar.gz）
```

## 快速开始

```bash
# 环境要求
node >= 18

# 安装依赖
npm install

# 本地开发 Worker
npm run dev:worker

# 校验所有 Skill
npm run validate:skills

# 构建注册表索引 & Manifest
npm run build:registry

# 打包 Skill 为 .tar.gz
npm run pack:skills

# 导入 D1（需配置 wrangler.toml 中的 D1 database_id）
npm run import:registry

# 上传 R2
npm run publish:r2
```

## Skill 发布流程

1. **提交 Skill** — 在 `skills/<name>/` 下创建 `SKILL.md`（含前置元数据）
2. **AI 审核** — CI 自动运行 OpenCode 对 Skill 进行质量评估，产出 `EVAL.md` + `skill-review.json`
3. **合并入主干** — 审核通过后合并到 main
4. **自动发布** — CI 触发构建管道：校验 → 打包 → R2 上传 → D1 写入 → 自动部署

## 项目结构

```
.
├── apps/worker/            Cloudflare Worker 主应用
├── packages/registry-core/ 共享核心逻辑
├── skills/                 业务 Skill 集合
├── scripts/                构建与校验脚本
├── db/schema.sql           D1 数据库 Schema
├── .github/workflows/      CI/CD（skill-review / release-skills）
└── .opencode/              OpenCode 扩展（skill-evaluator + commands）
```

## 技术栈

| 组件 | 技术 |
|------|------|
| Worker 框架 | Hono + JSX |
| 部署平台 | Cloudflare Workers |
| 数据库 | Cloudflare D1（SQLite） |
| 对象存储 | Cloudflare R2 |
| 构建工具 | Turborepo |
| 脚本运行时 | tsx |
| 测试 | Vitest |
| 鉴权 | OIDC（GitHub / 飞书 / 钉钉） |

## 环境

| 环境 | 触发条件 |
|------|----------|
| staging | push to main |
| production | git tag `v*` |

## License

[MIT](./LICENSE)
