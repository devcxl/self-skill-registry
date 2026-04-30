# Skill Registry 最终实施 Plan

## 0. 文档目的

本文档用于整合以下两份来源，并给出单一、可执行、可实现的最终方案：

- `GitHub Cloudflare Skill Registry.md`
- `2026-04-27-220947-github-cloudflare-skill-registrymd.txt`

本文档优先级高于原始设计草案中的冲突表述。凡与已确认决策冲突之处，以本文档为准。

---

## 1. 目标与边界

### 1.1 当前目标

- 服务对象：公司内部开发部门，约 30 人
- 初始规模：400+ skills
- 当前定位：内部私有 Registry
- 后续方向：内部稳定后，再考虑对外公开

### 1.2 核心能力

- GitHub 托管 skill 源码、PR、审核证据
- Cloudflare 承载 Registry API、Web UI、对象分发、元数据存储
- 外部 `npx skill` 负责多平台安装
- 支持 OpenCode、Claude Code、Codex 三类目标安装路径
- 所有 skill 必须经过 AI 审核流程；未通过不得展示给普通用户

### 1.3 明确不做

- 不走纯静态 Registry 路线
- 第一版不做 `install.sh` 作为主安装入口
- 第一版不做 `.platform/` 平台覆盖层
- 不提供 postinstall 或安装时自动执行脚本能力
- 不在 Worker 中暴露写 D1 / 写 R2 的管理 API
- 不在第一版实现复杂限流、Turbo Remote Cache、自动 D1 schema migration
- 不引入 React / shadcn/ui，保持 Hono JSX + Tailwind CLI

---

## 2. 最终决策总览

| 维度 | 最终决策 |
|---|---|
| 场景 | 400+ skills，30 人内部使用，稳定后再对外公开 |
| 技术路线 | 直接采用 Worker + D1 + R2 + Web UI |
| Worker 框架 | Hono |
| 仓库形态 | Monorepo + Turborepo |
| skill 目录 | `skills/` 扁平目录，不做字母分桶 |
| skill 版本 | `SKILL.md` 中手写 `version`，系统补充 `sourceCommit` / `publishedAt` |
| 包格式 | 全量打包整个 skill 目录 |
| R2 Key | 语义化：`skills/<name>/<version>.tar.gz` |
| 审核门禁 | 硬阻断；一个 PR 只允许一个 skill |
| 审核执行器 | `anomalyco/opencode/github@latest` + 仓库内 `skill-evaluator` |
| 审核输出 | 同时产出 `EVAL.md` 与结构化 JSON |
| 审核证据权威源 | `EVAL.md` 是人类可读权威原文；JSON 为数据库入库载体 |
| 鉴权 | OIDC 登录（GitHub / 飞书 / 钉钉）+ 用户独立 token |
| token 策略 | 首次登录自动生成，默认永不过期，可手动撤销 / 重建 |
| 安装入口 | 外部 `npx skill`，本仓库不维护内置 CLI |
| Web UI | Hono JSX + Tailwind CLI |
| 数据同步 | CI 通过 `wrangler d1 execute` / `wrangler r2 object put` 直写 Cloudflare 资源 |
| 环境 | staging / production 两套 |
| 测试 | Vitest 统一测试，重点覆盖 `registry-core` |

---

## 3. 目标架构

```text
GitHub Repo
  ├── skills/                         # 业务 skill 源码
  ├── .opencode/skills/skill-evaluator/ # 审核 skill
  ├── apps/worker/                    # Hono Worker + Web UI
  ├── packages/registry-core/         # 共享纯逻辑
  ├── scripts/                        # 构建 / 校验 / 导入脚本
  ├── db/schema.sql                   # D1 初始化 SQL
  └── .github/workflows/              # validate / review / release / deploy

GitHub Actions
  ├── validate
  ├── skill-review
  ├── release
  └── deploy

Cloudflare
  ├── Worker API + Web UI
  ├── D1: skills / versions / reviews / users / tokens / downloads
  ├── R2: tarball 包
  └── Static Assets: CSS 等静态资源

Consumers
  ├── OpenCode
  ├── Claude Code
  └── Codex
```

---

## 4. 仓库结构与模块边界

## 4.1 目标目录结构

```text
.
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md
│       ├── README.md
│       ├── references/
│       ├── examples/
│       ├── scripts/
│       └── EVAL.md
├── .opencode/
│   └── skills/
│       └── skill-evaluator/
├── apps/
│   ├── worker/
│   └── cli/
├── packages/
│   └── registry-core/
├── scripts/
├── db/
│   └── schema.sql
└── docs/
    └── skill-registry-plan.md
```

## 4.2 共享包边界

`@devcxl/registry-core` 只放纯逻辑，不放平台 I/O：

```ts
export { validateSkill, validateSkillDir } from './validator'
export { buildManifest, buildIndex } from './manifest'
export { packSkill, unpackSkill } from './pack'
export { sha256, checkPathTraversal, scanForSecrets } from './security'
export type {
  Skill,
  SkillManifest,
  SkillVersion,
  RegistryIndex,
  ReviewReport,
} from './types'
```

## 4.3 现状与目标差异

当前仓库里已存在 `.opencode/skill-evaluator/`。最终实现应统一到：

```text
.opencode/skills/skill-evaluator/
```

原因：GitHub Action 运行时需要按 OpenCode 可发现结构加载该审核 skill。

---

## 5. Skill 包规范

## 5.1 基本规范

- 每个 skill 必须是独立目录
- 入口文件必须是 `SKILL.md`
- `name` 必须与目录名一致
- `name` 规则：`^[a-z0-9]+(-[a-z0-9]+)*$`
- `description` 必填
- `compatibility` 必填，由作者声明，AI 负责审核一致性

## 5.2 建议目录

```text
skills/<skill-name>/
  SKILL.md
  README.md
  references/
  examples/
  scripts/
  EVAL.md
```

## 5.3 版本策略

- 版本号来源：`SKILL.md` frontmatter 中的 `version`
- 系统补充：`sourceCommit`、`publishedAt`
- 版本不可变：同一 `(skill_name, version)` 不允许对应不同内容
- CI 校验规则：
  - 内容变了但版本没变：失败
  - 版本变了但内容没变：失败
  - 内容和版本同步变化：通过

## 5.4 平台兼容性策略

- `compatibility` 由作者声明
- 静态校验只检查合法值与格式
- AI 审核检查声明与正文是否一致
- 不引入 `.platform/` 目录
- 安装时 `SKILL.md` 原样复制，不做平台变换

---

## 6. 打包、存储与分发

## 6.1 打包策略

- tarball 全量打包 skill 目录
- 不裁剪 `references/`、`examples/`、`scripts/`
- 后续如有必要，再补 `.skillignore`

## 6.2 R2 存储策略

- bucket：按环境拆分 staging / production
- key：`skills/<name>/<version>.tar.gz`
- key 不可覆盖
- tarball 必须记录 sha256 与 source commit

## 6.3 D1 存储策略

当前阶段可接受全量 upsert：

- `build-registry` 扫描所有 skills
- `pack-skills` 计算 sha256 与 size
- `publish:r2` 上传对象
- `import:registry` 全量 upsert 到 D1

后续如有性能需求，再优化为增量导入。

---

## 7. 状态模型

原始讨论里“status”承担了两种语义。为避免歧义，Plan 中明确拆成两个字段。

## 7.1 审核状态 `review_status`

- `pending`
- `approved`
- `rejected`
- `needs_manual_review`

规则：

- `approved`：可展示、可安装
- `rejected`：不可合并、不可展示、不可发布
- `needs_manual_review`：管理员人工确认前不可展示
- `pending`：未完成审核前不可展示

## 7.2 生命周期状态 `lifecycle_status`

- `active`
- `deprecated`
- `archived`

规则：

- `active`：正常展示、正常安装
- `deprecated`：展示警告，仍可安装
- `archived`：不搜索、不安装，仅保留历史追溯

---

## 8. 审核体系

## 8.1 审核执行模型

审核链路由两层组成：

1. TypeScript 预检
2. OpenCode + `skill-evaluator` 语义审核

## 8.2 预检职责

预检负责结构性与确定性问题：

- 缺少 `SKILL.md`
- name / 目录名不一致
- frontmatter 缺失或非法
- 明显凭证泄露模式
- 路径穿越风险
- 危险文件结构
- 版本与内容不可变性校验
- 单 PR 多 skill 校验

预检逻辑统一使用 TypeScript，不保留 Python 依赖。

## 8.3 AI 审核职责

AI 审核负责语义性问题：

- 触发描述是否过宽
- 指令是否清晰可执行
- 是否存在平台专有假设
- scripts 是否存在安全风险
- examples / references 是否支撑可用性
- 外部依赖 / 网络访问是否需要人工确认
- 是否适合进入 Registry

## 8.4 审核输出

同一次审核必须同时得到两类结果：

1. `skills/<name>/EVAL.md`
2. `artifacts/skill-review.json`

约束：

- `EVAL.md`：提交回 PR 分支，作为人类可读审核证据；workflow 会把结构化结果同步进它的 YAML front matter
- `artifacts/skill-review.json`：AI 审核直接产出的结构化结果
- release/import 只解析 `EVAL.md` 的 front matter，不解析正文
- 两者必须来自同一次审核，内容保持一致

## 8.5 审核 skill 的位置

审核 skill 提交到仓库：

```text
.opencode/skills/skill-evaluator/
```

而不是作为可安装业务 skill 对外发布。

## 8.6 审核门禁

- 一个 PR 只允许一个 skill
- `rejected` 直接硬阻断
- 管理员可在 GitHub 层面保留 bypass 能力，但不是默认流程
- 只有 `approved` 或管理员人工确认通过的 skill 才能展示

---

## 9. CI / CD 设计

## 9.1 validate.yml

职责：

- 安装依赖
- 静态校验
- 版本不可变性校验
- 单 PR 单 skill 校验
- 构建 registry metadata
- 打包校验

## 9.2 skill-review.yml

触发范围：

- 新增 skill
- 修改 `SKILL.md`
- 修改 `references/`
- 修改 `scripts/`
- 修改 `examples/`、`README.md` 时可按需要纳入

不触发范围：

- `.github/`
- `apps/`
- `packages/`
- `docs/`

流程：

1. checkout
2. Node 环境准备
3. TS 预检
4. 调用 `anomalyco/opencode/github@latest`
5. 产出 `EVAL.md` 与 `skill-review.json`
6. 校验 JSON schema
7. 将 `skill-review.json` 同步进 `EVAL.md` 的 YAML front matter
8. 评论审核摘要
9. 提交 `EVAL.md` 回 PR 分支（`[skip ci]`）
10. 若 `rejected` 则 job fail

## 9.3 release.yml

合并到 `main` 后执行：

1. validate
2. build-registry
3. pack-skills
4. `wrangler r2 object put`
5. `wrangler d1 execute` 执行 import/upsert
6. 部署 Worker

说明：

- Worker 只负责读，不负责 CI 写操作
- D1 schema 初始化不放进 CI，由人工一次性执行

---

## 10. D1 数据模型

至少包含以下表：

- `skills`
- `skill_versions`
- `skill_reviews`
- `download_events`
- `users`
- `user_tokens`

建议补充的关键字段语义：

- `skills.review_status`
- `skills.lifecycle_status`
- `skills.latest_score`
- `skill_versions.source_commit`
- `user_tokens.token_hash`
- `download_events.ip_hash`

说明：

- `compatibility`、`tags` 继续用逗号分隔 TEXT
- 当前规模下用 `LIKE` 查询可接受
- 搜索在 SQL 层做，不在 Worker 内存中过滤

---

## 11. 认证与权限

## 11.1 登录方式

- GitHub OAuth / OIDC
- 飞书 OIDC
- 钉钉 OIDC

## 11.2 用户与 token

- 用户首次登录 Web UI 时自动生成默认 token
- token 只显示一次，数据库仅保存 hash
- token 默认永不过期
- 用户可在 `/settings` 查看、复制、删除、重建 token
- 外部安装入口通过 registry 地址 + token 工作

## 11.3 权限模型

- `user`：只能浏览 / 安装 `approved` skill
- `admin`：可处理人工审核、用户授权、状态维护、查看统计

---

## 12. Worker API 设计

保留以下读 API：

```text
GET /health
GET /v1/index.json
GET /v1/skills
GET /v1/skills/:name
GET /v1/skills/:name/versions
GET /v1/skills/:name/download?version=...
GET /v1/search?q=...&category=...&compat=...&page=1&perPage=20
GET /v1/reviews/:id
GET /v1/skills/:name/reviews
```

管理能力通过 admin API 暴露，仅管理员可用：

```text
GET  /admin/skills/pending
POST /admin/skills/:name/approve
POST /admin/skills/:name/reject
PUT  /admin/skills/:name/status
GET  /admin/users
POST /admin/users/:id/toggle-admin
```

统一要求：

- 统一 JSON 错误格式
- `Cache-Control` 缓存读接口 60 秒
- `/health` 校验 D1 连通性
- 下载记录使用 `waitUntil` 异步落表
- 第一版不做额外 API 限流

---

## 13. Web UI 设计

## 13.1 页面

- `/`：首页
- `/skills`：skill 列表
- `/skills/:name`：skill 详情
- `/skills/:name/reviews/:id` 或等价详情页：单次审核详情
- `/settings`：用户 token / 账户设置
- `/admin`：管理员面板

## 13.2 技术栈

- Hono JSX
- Tailwind CLI 构建 CSS
- Worker 直接渲染页面
- 不引入 React / shadcn/ui

## 13.3 管理员面板能力

- 查看待人工审核 skill
- 人工批准 / 拒绝
- 查看全部审核报告
- 用户管理与 admin 授权
- 切换 `active / deprecated / archived`

---

## 14. 外部安装入口（`npx skill`）约定

## 14.1 入口与边界

- 统一安装入口：`npx skill`
- 本仓库不维护旧内置 CLI 或旧安装包
- 本仓库只提供 Registry API、下载链路、用户 token 与目标路径约定

## 14.2 安装目标路径

| target | global | project |
|---|---|---|
| opencode | `~/.config/opencode/skills/<name>` | `.opencode/skills/<name>` |
| claude-code | `~/.claude/skills/<name>` | `.claude/skills/<name>` |
| codex | `~/.agents/skills/<name>` | `.agents/skills/<name>` |

## 14.3 仓库职责

- 保证 `GET /v1/index.json`、skill 详情、版本列表、下载接口稳定可用
- 保证用户 token 可用于外部安装入口鉴权
- 不在本仓库内维护安装器实现细节

---

## 15. 实施阶段与依赖顺序

以下顺序按依赖展开，优先解决根依赖，再解决上层功能。

## Phase 1：仓库骨架与共享基础

目标：搭出后续所有能力的公共地基。

交付：

- Turborepo 基础结构
- `apps/worker`
- `packages/registry-core`
- `db/schema.sql`
- `wrangler` staging / production 配置
- TypeScript 基线配置

完成标准：

- 本地可启动 Worker
- D1 schema 可手动初始化
- Worker、registry-core、脚本链路可本地运行

## Phase 2：Skill 规范、校验、打包、发布基础能力

目标：实现 Registry 的静态构建与包分发能力。

交付：

- `validate-skills`
- `build-registry`
- `pack-skills`
- sha256 / 路径穿越校验
- R2 上传脚本
- D1 import/upsert 脚本

完成标准：

- 任一 skill 可被校验、打包、写入 R2、导入 D1
- `index.json` 与 manifest 可稳定生成

## Phase 3：审核链路与门禁

目标：建立 PR 审核与发布前质量门禁。

交付：

- `.opencode/skills/skill-evaluator`
- `skill-review.yml`
- JSON schema 校验脚本
- `EVAL.md` 自动回写 PR
- 硬阻断规则
- “一个 PR 一个 skill” 校验

完成标准：

- skill PR 未通过审核时无法合并
- 审核成功后同时存在 `EVAL.md` 与结构化 JSON

## Phase 4：Worker API 与 Web UI

目标：让内部用户能检索、查看、下载 skill。

交付：

- `/health`
- `/v1/*` 查询 API
- 首页、列表、详情、审核详情、设置页
- Tailwind 构建
- 搜索、分页、过滤、缓存头

完成标准：

- 普通用户可浏览 approved skills
- 可查看审核摘要与安装命令

## Phase 5：认证、管理员与人工审核

目标：完成私有 Registry 的身份体系与管理能力。

交付：

- GitHub / 飞书 / 钉钉 OIDC 登录
- 用户表 / token 表
- `/settings`
- `/admin`
- 人工审核、用户授权、状态维护

完成标准：

- 用户首次登录自动拿到 token
- admin 可处理 `needs_manual_review`

## Phase 6：外部安装入口接入

目标：明确 `npx skill` 与 Registry API、下载链路、token、目标路径之间的对接约定。

交付：

- 统一安装入口为 `npx skill`
- API / 下载 / token 约定稳定
- OpenCode / Claude Code / Codex 目标路径约定明确

完成标准：

- 用户能用 token 连接私有 Registry
- 能通过 `npx skill` 安装到 OpenCode / Claude Code / Codex 路径

## Phase 7：运维增强与上线收口

目标：把系统稳定到可长期内部使用。

交付：

- staging / production 发布流程固化
- 下载统计
- 管理端收口
- 文档与 PR 模板
- 测试补齐

完成标准：

- release 流程稳定
- 管理员可处理日常审核与废弃流程

---

## 16. 初始 400 个 skill 导入策略

最终结论已经收敛为：

- 不走单个大批量导入例外流程
- 400+ skills 逐个 PR 提交
- 每个 PR 只允许一个 skill
- 每个 skill 都必须经过 AI 审核
- AI 审核通过才展示
- AI 审核不通过则转人工审核或拒绝

这意味着“质量门禁”从第一批数据开始就成立，不存在“先导入后补审”的灰区。

---

## 17. 验收标准

当以下条件全部满足时，说明一期内部版完成：

- 任一 skill 能通过 PR 审核、产出 `EVAL.md` 和 JSON、合并后发布到 R2 + D1
- Web UI 能检索、浏览、查看审核结果与安装命令
- `npx skill` 能用用户 token 连接私有 Registry
- `npx skill` 能安装到 OpenCode、Claude Code、Codex 目标路径
- 普通用户看不到未审核 / 被拒绝的 skill
- admin 能处理人工审核、用户授权、状态变更
- staging / production 两套环境可独立部署

---

## 18. 关键风险与对应验证

| 风险 | 影响 | 对应验证 |
|---|---|---|
| 审核输出不稳定，JSON 与 EVAL 不一致 | Web UI 数据错误，证据链断裂 | CI 中同时校验 `EVAL.md` 与 JSON 必存在，并校验 JSON schema；增加一致性测试 |
| 版本号未正确递增 | 同版本内容漂移 | 为 `version` 与内容 hash 建立校验测试 |
| scripts 含外部依赖或网络访问未被识别 | 风险 skill 被误放行 | 增加规则测试样例，验证 `needs_manual_review` 路径 |
| 外部安装入口覆盖本地修改 | 用户数据丢失 | 为本地修改检测、备份、覆盖行为写测试 |
| D1 状态字段语义混乱 | UI / API 逻辑错误 | 单独测试 `review_status` 与 `lifecycle_status` 的过滤逻辑 |
| OIDC 与 token 流程出错 | 用户无法使用 `npx skill` | 联调登录、token 生成、token 校验、撤销流程 |
| 单 PR 单 skill 规则被绕过 | 审核粒度失控 | 在 CI 加变更目录检测测试 |

---

## 19. 最终结论

这不是“静态 skill 文件托管”方案，而是一个完整的私有 Skill Registry 系统：

- GitHub 是源码与审核中心
- Cloudflare 是分发与展示中心
- `skill-evaluator` 是审核门禁核心
- `npx skill` 是安装入口
- `approved` 是唯一对普通用户可见的发布状态

后续实现工作应严格按本文档分阶段推进，不再回退到纯静态路线，也不再引入未确认的新抽象。
