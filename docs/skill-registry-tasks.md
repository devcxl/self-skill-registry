# Skill Registry 实施任务清单

## 0. 使用方式

本文档把 `docs/skill-registry-plan.md` 拆成可逐个 PR 推进的任务清单。

约定：

- 每个任务默认对应一个小 PR。
- 任务状态用 checkbox 维护。
- 不允许跳过依赖任务直接实现上层功能。
- 涉及用户可见行为、鉴权、审核门禁、CI 发布的任务，必须带验证记录。

---

## 1. 里程碑总览

| 里程碑 | 目标 | 完成标志 |
|---|---|---|
| M0 | 项目骨架 | Turborepo、TS、基础目录、Wrangler、D1 schema 初稿存在 |
| M1 | Registry Core | skill 校验、manifest、打包、安全校验可本地运行 |
| M2 | CI/CD 基础 | validate / release workflow 可跑通，能写 R2 / D1 |
| M3 | AI 审核门禁 | 一个 PR 一个 skill，OpenCode 调用 evaluator，产出 EVAL + JSON，rejected 硬阻断 |
| M4 | Worker API + Web UI | approved skill 可搜索、查看、下载，Web UI 可浏览审核结果 |
| M5 | OIDC + Admin | 用户登录、token、权限、人工审核可用 |
| M6 | skillr CLI | 能配置 registry/token，并安装到 OpenCode / Claude Code / Codex |
| M7 | 内部上线 | staging / production、文档、PR 模板、端到端验收完成 |

---

## 2. 依赖图

```text
T01
 ├─ T02
 ├─ T03 ─┬─ T07 ─ T08 ─ T09 ─ T10
 │       ├─ T11 ─ T12 ─ T13 ─┬─ T14
 │       │                   └─ T15
 │       └─ T16
 ├─ T04 ─ T05 ─ T21 ─ T22 ─ T23 ─ T24
 └─ T06 ─ T30

T08/T09/T10 + T18 + T19 -> T20
T13/T14/T15/T16 -> T17
T21/T22/T23 + T25/T26 -> Web UI MVP
T27/T28 -> T29
T22/T23 + T28 + T30 -> T31 -> T32
T20 + T24 + T29 + T32 -> T38 端到端验收
```

可并行：

- `T02 / T04 / T06` 可在 `T01` 后并行，`T05` 在 `T04` 后开始。
- `T07-T12` 与 `T21-T24` 可分支并行，但 Worker API 依赖 D1 schema。
- `T30-T32` 可与 Web UI 并行，但需要 API contract 稳定。
- OIDC / Admin 可在公开读 API 后并行推进。

---

## 3. 任务清单

### M0：项目骨架

#### T01 — 建立 Monorepo 基础骨架

- [ ] 创建根 `package.json`、`turbo.json`、`tsconfig.base.json`
- [ ] 配置 npm workspaces：`apps/*`、`packages/*`
- [ ] 创建目录：`apps/worker`、`apps/cli`、`packages/registry-core`、`scripts`、`db`、`skills`
- [ ] 统一 Node 版本要求与基础 npm scripts

依赖：无  
交付物：Monorepo 基础结构  
验证：

```bash
npm install
npm run build --if-present
```

退出标准：根项目可以安装依赖，workspace 可被 npm 识别。

---

#### T02 — 调整 skill-evaluator 目录结构

- [ ] 将现有 `.opencode/skill-evaluator/` 收敛为 `.opencode/skills/skill-evaluator/`
- [ ] 确认 `.opencode/skills/skill-evaluator/SKILL.md` 存在
- [ ] 确认 Git 会提交 `.opencode/skills/skill-evaluator/`

依赖：T01  
交付物：OpenCode GitHub Action 可发现的 evaluator skill 目录  
验证：

```bash
test -f .opencode/skills/skill-evaluator/SKILL.md
```

退出标准：仓库内 evaluator skill 位置与 Plan 一致。

---

#### T03 — 定义 registry-core 类型与导出面

- [ ] 定义 `Skill`、`SkillManifest`、`SkillVersion`、`RegistryIndex`、`ReviewReport`
- [ ] 定义 `review_status` 与 `lifecycle_status` 类型
- [ ] 建立 `packages/registry-core/src/index.ts` 导出面
- [ ] 不引入 fs、node:crypto、Cloudflare bindings 等平台 I/O

依赖：T01  
交付物：`@devcxl/registry-core` 类型基础  
验证：

```bash
npm run build -w packages/registry-core
```

退出标准：共享类型可被 worker、cli、scripts 引用。

---

#### T04 — 编写 D1 schema 初稿

- [ ] 创建 `db/schema.sql`
- [ ] 建表：`skills`、`skill_versions`、`skill_reviews`、`download_events`、`users`、`user_tokens`
- [ ] 拆分 `review_status` 与 `lifecycle_status`
- [ ] 增加必要唯一约束：`skills.name`、`skill_versions(skill_name, version)`、`users(oidc_provider, oidc_sub)`
- [ ] token 只存 hash

依赖：T01  
交付物：可手动初始化的 D1 schema  
验证：

```bash
wrangler d1 execute skill-registry --local --file=db/schema.sql
```

退出标准：本地 D1 初始化成功。

---

#### T05 — 初始化 Hono Worker 与 Wrangler 配置

- [ ] 创建 `apps/worker/src/index.ts`
- [ ] 接入 Hono
- [ ] 配置 staging / production 的 D1、R2 bindings
- [ ] 实现最小 `/health`
- [ ] 增加统一错误响应骨架

依赖：T01、T04  
交付物：Worker 可本地启动  
验证：

```bash
npm run dev:worker
curl http://localhost:8787/health
```

退出标准：`/health` 返回 JSON，D1 本地 binding 可用。

---

#### T06 — 初始化 skillr CLI 包

- [ ] 创建 `apps/cli`
- [ ] 包名设为 `@devcxl/skillr`
- [ ] Node engine 设为 `>=18`
- [ ] 创建 CLI 入口与基础 help 输出

依赖：T01  
交付物：可本地运行的 CLI 空壳  
验证：

```bash
npm run build -w apps/cli
node apps/cli/dist/main.js --help
```

退出标准：CLI 能执行并显示命令帮助。

---

### M1：Registry Core

#### T07 — 添加测试 fixture skill

- [ ] 创建 `skills/example-skill/SKILL.md`
- [ ] 包含合法 `name`、`description`、`version`、`compatibility`、`metadata`
- [ ] 增加 README、examples、references、scripts 的最小样例

依赖：T03  
交付物：用于本地测试的合法 skill fixture  
验证：后续 T08 校验用例通过。

退出标准：fixture 能代表标准 skill 目录结构。

---

#### T08 — 实现 Skill frontmatter 静态校验

- [ ] 校验 `SKILL.md` 是否存在
- [ ] 校验 name 规则与目录名一致
- [ ] 校验 description、version、compatibility 必填
- [ ] compatibility 支持 `opencode`、`claude-code`、`codex`
- [ ] metadata language 保持开放式，不做枚举限制

依赖：T03、T07  
交付物：`validateSkill`、`validateSkillDir`  
验证：

```bash
npm test -w packages/registry-core -- validator
```

退出标准：合法 fixture 通过，缺字段 / name mismatch fixture 失败。

---

#### T09 — 实现安全预检

- [ ] 扫描明显凭证模式
- [ ] 检测隐藏敏感文件
- [ ] 检测路径穿越风险
- [ ] 检测外部依赖 / 网络访问模式并标记 `needs_manual_review`
- [ ] 不限制 scripts 行数、语言或文件大小

依赖：T08  
交付物：`scanForSecrets`、`checkPathTraversal`、外部依赖检测结果  
验证：

```bash
npm test -w packages/registry-core -- security
```

退出标准：危险样例被识别，普通脚本不被误杀。

---

#### T10 — 实现版本不可变性校验

- [ ] 计算 skill 内容 hash
- [ ] 对比已发布版本 hash
- [ ] 内容变但 version 未变时失败
- [ ] version 变但内容未变时失败
- [ ] 支持 CI 从 D1 或 registry manifest 读取历史版本记录

依赖：T08、T09  
交付物：版本一致性校验逻辑  
验证：

```bash
npm test -w packages/registry-core -- version
```

退出标准：同版本内容漂移会被阻断。

---

#### T11 — 实现 Manifest / Index 构建

- [ ] 从 skill frontmatter 构建 manifest
- [ ] 生成 registry index
- [ ] 输出 `sourceCommit`、`publishedAt`、`latestVersion`
- [ ] 只将可展示状态的 skill 暴露给普通 index

依赖：T08  
交付物：`buildManifest`、`buildIndex`  
验证：

```bash
npm test -w packages/registry-core -- manifest
```

退出标准：manifest 结构与 Plan 一致。

---

#### T12 — 实现 tarball 打包 / 解包

- [ ] 全量打包 skill 目录
- [ ] 计算 sha256 与 size
- [ ] 解包时防路径穿越
- [ ] 确认包内必须包含 `SKILL.md`

依赖：T09、T11  
交付物：`packSkill`、`unpackSkill`  
验证：

```bash
npm test -w packages/registry-core -- pack
```

退出标准：合法包可解包，恶意路径包被拒绝。

---

### M2：脚本与 CI/CD 基础

#### T13 — 实现本地构建脚本

- [ ] `scripts/validate-skills.ts`
- [ ] `scripts/build-registry.ts`
- [ ] `scripts/pack-skills.ts`
- [ ] 输出 artifacts 目录结构

依赖：T08、T11、T12  
交付物：本地可运行的构建命令  
验证：

```bash
npm run validate:skills
npm run build:registry
npm run pack:skills
```

退出标准：example skill 可完整构建和打包。

---

#### T14 — 实现 D1 import/upsert 脚本

- [ ] 从 artifacts 读取 manifest 与 package metadata
- [ ] 生成 SQL 或直接调用 Wrangler D1 execute
- [ ] upsert `skills` 与 `skill_versions`
- [ ] 保持 `(skill_name, version)` 不可覆盖

依赖：T04、T13  
交付物：`npm run import:registry`  
验证：

```bash
npm run import:registry -- --local
```

退出标准：本地 D1 能查到 skill 与版本记录。

---

#### T15 — 实现 R2 发布脚本

- [ ] 读取 artifacts packages
- [ ] 上传到 `skills/<name>/<version>.tar.gz`
- [ ] 禁止覆盖已有 key
- [ ] 支持 staging / production bucket 参数

依赖：T12、T13  
交付物：`npm run publish:r2`  
验证：

```bash
npm run publish:r2 -- --dry-run
```

退出标准：dry-run 能列出准确 R2 key，真实上传需在 staging 验证。

---

#### T16 — 增加 Vitest 基础测试配置

- [ ] 配置 Vitest
- [ ] registry-core 单元测试纳入 CI
- [ ] worker 测试预留 miniflare 配置
- [ ] cli 测试预留文件系统临时目录工具

依赖：T01、T03  
交付物：统一测试入口  
验证：

```bash
npm test
```

退出标准：测试命令可在根目录运行。

---

#### T17 — 编写 validate / release GitHub Actions

- [ ] `validate.yml`：安装、校验、构建、打包、测试
- [ ] `release.yml`：main 合并后打包、上传 R2、导入 D1
- [ ] Cloudflare secret 使用 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`
- [ ] 不在 CI 自动执行 D1 schema 初始化

依赖：T13、T14、T15、T16  
交付物：CI/CD 基础 workflow  
验证：通过 PR 检查与 staging release dry-run。

退出标准：普通 PR 能完成 validate；main 合并流程可部署 staging。

---

### M3：AI 审核门禁

#### T18 — 定义 skill-review JSON schema

- [ ] 定义 8 大类评分结构
- [ ] 定义 criteria / findings 结构
- [ ] 定义 `needsManualReview`
- [ ] 创建 `scripts/validate-review-report.ts`

依赖：T03、T16  
交付物：结构化审核报告 schema 与校验器  
验证：

```bash
npm test -- validate-review-report
```

退出标准：缺字段、非法状态、非法分数均会失败。

---

#### T19 — 强化 skill-evaluator 输出协议

- [ ] 更新 `.opencode/skills/skill-evaluator/SKILL.md`
- [ ] 明确必须同时输出 `skills/<name>/EVAL.md` 与 `artifacts/skill-review.json`
- [ ] 明确只审核当前 PR 变更的一个 skill
- [ ] 明确 rejected / needs_manual_review 判定规则

依赖：T02、T18  
交付物：稳定的 evaluator prompt / skill 指令  
验证：人工检查 SKILL.md；后续 T20 集成验证。

退出标准：OpenCode 调用时有明确输出契约。

---

#### T20 — 编写 skill-review workflow

- [ ] 调用 `anomalyco/opencode/github@latest`
- [ ] 运行 TS 预检
- [ ] 校验一个 PR 只改一个 skill
- [ ] 校验 `EVAL.md` 与 JSON 均存在
- [ ] 将 `EVAL.md` 自动 commit 回 PR 分支，commit message 带 `[skip ci]`
- [ ] rejected 时硬阻断

依赖：T17、T18、T19  
交付物：完整 AI 审核门禁  
验证：用示例 skill PR 跑通一次 approved，一次 rejected。

退出标准：未通过审核的 skill PR 无法合并。

---

### M4：Worker API 与 Web UI

#### T21 — 实现 Worker 数据访问层

- [ ] 封装 D1 查询
- [ ] 封装 R2 读取
- [ ] 统一错误对象与错误码
- [ ] 增加 status 过滤基础逻辑

依赖：T04、T05  
交付物：Worker service / repository 层  
验证：

```bash
npm test -w apps/worker
```

退出标准：API 层不直接散落 SQL 细节。

---

#### T22 — 实现只读 Registry API

- [ ] `GET /v1/index.json`
- [ ] `GET /v1/skills`
- [ ] `GET /v1/skills/:name`
- [ ] `GET /v1/skills/:name/versions`
- [ ] `GET /v1/reviews/:id`
- [ ] `GET /v1/skills/:name/reviews`

依赖：T21  
交付物：基础只读 API  
验证：curl 本地 Worker，检查 approved 过滤。

退出标准：普通读接口返回 Plan 中定义的数据结构。

---

#### T23 — 实现搜索、分页、过滤与缓存头

- [ ] `GET /v1/search`
- [ ] 支持 `q`、`category`、`compat`、`sort`、`page`、`perPage`
- [ ] SQL 层 `LIMIT / OFFSET`
- [ ] `/v1/index.json` 和 `/v1/skills/:name` 设置 `Cache-Control: public, max-age=60`

依赖：T22  
交付物：可用搜索 API  
验证：本地插入多条 skill，验证分页与过滤结果。

退出标准：400+ skill 场景无需 Worker 内存过滤。

---

#### T24 — 实现下载接口与下载统计

- [ ] `GET /v1/skills/:name/download?version=...`
- [ ] 从 R2 读取 tarball
- [ ] 返回 `X-Skill-Sha256`
- [ ] 使用 `executionCtx.waitUntil` 写入 `download_events`
- [ ] 不提供 `POST /v1/download-events`

依赖：T21、T15  
交付物：下载 API  
验证：下载 example tarball，校验 sha256 header 与 D1 下载记录。

退出标准：下载不阻塞统计写入，失败时返回统一错误。

---

#### T25 — 搭建 Hono JSX + Tailwind UI 基础

- [ ] 配置 Tailwind CLI
- [ ] 创建 layout、导航、错误页
- [ ] Worker 直接渲染页面
- [ ] 不引入 React / shadcn/ui

依赖：T05  
交付物：Web UI 基础框架  
验证：

```bash
npm run dev:worker
```

退出标准：首页可打开并加载本地 CSS。

---

#### T26 — 实现 Web UI 普通用户页面

- [ ] `/`
- [ ] `/skills`
- [ ] `/skills/:name`
- [ ] `/skills/:name/reviews/:id`
- [ ] 展示安装命令、版本、sha256、审核摘要
- [ ] 普通用户只看到 approved skill

依赖：T22、T23、T25  
交付物：Web UI MVP  
验证：浏览器手动验证列表、详情、审核详情。

退出标准：内部用户无需 CLI 也能浏览 Registry。

---

### M5：认证、token 与 Admin

#### T27 — 实现 OIDC 登录与 session

- [ ] GitHub OAuth / OIDC
- [ ] 飞书 OIDC provider 适配
- [ ] 钉钉 OIDC provider 适配
- [ ] `/auth/login/:provider`
- [ ] `/auth/callback/:provider`
- [ ] session cookie

依赖：T04、T05  
交付物：Web UI 登录能力  
验证：至少先用 GitHub provider 在 staging 跑通。

退出标准：用户可登录并写入 `users` 表。

---

#### T28 — 实现用户 token 管理

- [ ] 首次登录自动生成默认 token
- [ ] token 原文只展示一次
- [ ] 数据库只存 SHA-256 hash
- [ ] `/settings` 查看、删除、重建 token
- [ ] `/v1/*` Bearer token 验证中间件

依赖：T27  
交付物：skillr 可用的用户 token 体系  
验证：用 token curl `/v1/index.json` 成功，无 token 失败。

退出标准：CLI 可通过 token 调用 API。

---

#### T29 — 实现 Admin API 与 Admin UI

- [ ] `GET /admin/skills/pending`
- [ ] `POST /admin/skills/:name/approve`
- [ ] `POST /admin/skills/:name/reject`
- [ ] `PUT /admin/skills/:name/status`
- [ ] `GET /admin/users`
- [ ] `POST /admin/users/:id/toggle-admin`
- [ ] `/admin` 页面

依赖：T26、T28  
交付物：管理员人工审核与用户管理能力  
验证：user 无法访问 admin；admin 可批准 needs_manual_review skill。

退出标准：人工审核闭环可用。

---

### M6：skillr CLI

#### T30 — 实现 CLI 配置与 lock 文件

- [ ] `skillr config set registry`
- [ ] `skillr config set token`
- [ ] `skillr config show`
- [ ] 支持 `~/.skillr/config.json`、`./.skillr/config.json`
- [ ] 支持 `SKILLR_REGISTRY_URL`、`SKILLR_TOKEN`
- [ ] 实现全局 / 项目 lock 文件

依赖：T06  
交付物：CLI 配置层  
验证：临时 HOME 下读写 config / lock。

退出标准：配置优先级符合 Plan。

---

#### T31 — 实现 CLI Registry Client

- [ ] 带 Authorization header 请求 API
- [ ] `search`
- [ ] `info`
- [ ] 错误响应解析
- [ ] sha256 metadata 读取

依赖：T22、T23、T28、T30  
交付物：CLI 查询能力  
验证：用 staging API 执行 search / info。

退出标准：CLI 能稳定读取私有 Registry。

---

#### T32 — 实现 CLI 安装、更新、删除、列表

- [ ] `install <name>[@version]`
- [ ] `--target opencode|claude-code|codex|all`
- [ ] `--project`
- [ ] `update`
- [ ] `remove`
- [ ] `list`
- [ ] 冲突检测与 `--force`
- [ ] 下载后 sha256 校验
- [ ] 解压路径穿越校验

依赖：T12、T24、T30、T31  
交付物：skillr 核心安装能力  
验证：临时目录模拟三种目标路径，安装 / 更新 / 删除均通过。

退出标准：能安装到 OpenCode / Claude Code / Codex 路径。

---

#### T33 — 配置 GitHub Packages 发布

- [ ] 配置 `@devcxl/skillr` 发布 workflow
- [ ] 配置 `@devcxl/registry-core` 包 metadata
- [ ] 增加内部安装说明
- [ ] 不发布到公共 npmjs.com

依赖：T32  
交付物：内部 npm 分发能力  
验证：从 GitHub Packages 安装 `@devcxl/skillr`。

退出标准：团队成员可按 README 安装 CLI。

---

### M7：上线收口

#### T34 — 完善测试覆盖

- [ ] registry-core 覆盖 validator / security / manifest / pack / version
- [ ] worker 覆盖 API、状态过滤、错误响应
- [ ] cli 覆盖 config、lock、安装冲突、sha256、路径穿越
- [ ] CI 强制运行测试

依赖：T16、T24、T32  
交付物：上线前测试基线  
验证：

```bash
npm test
```

退出标准：核心路径测试全部通过。

---

#### T35 — 固化 staging / production 部署

- [ ] staging 与 production D1 / R2 / Worker 配置分离
- [ ] staging 分支部署 staging
- [ ] main 分支部署 production
- [ ] 记录首次 D1 schema 初始化命令
- [ ] 记录 Cloudflare secrets 配置清单

依赖：T17、T24、T29  
交付物：可重复部署流程  
验证：staging 成功部署，production 走 dry-run 或受控部署。

退出标准：环境配置不会互相污染。

---

#### T36 — 补齐提交与使用文档

- [ ] README 写 skill 提交流程
- [ ] 创建 `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] 文档说明“一个 PR 一个 skill”
- [ ] 文档说明外部依赖 / 网络访问需人工审核

依赖：T20  
交付物：团队可执行文档  
验证：按 README 从零提交一个 example PR。

退出标准：开发者不需要口头说明即可提交 skill。

---

#### T37 — 制定 400+ skill 逐 PR 导入流程

- [ ] 编写导入操作说明
- [ ] 明确每个 PR 只含一个 skill
- [ ] 明确 AI 审核通过才展示
- [ ] 明确不提供 batch-import 例外
- [ ] 可选：提供本地辅助脚本生成分支名 / PR 标题，但不绕过审核

依赖：T20、T36  
交付物：初始 400+ skills 导入 runbook  
验证：用 1 个真实 skill 按 runbook 走通。

退出标准：批量导入流程不破坏质量门禁。

---

#### T38 — 端到端验收

- [ ] 提交一个合法 skill PR
- [ ] AI 审核产出 `EVAL.md` 与 JSON
- [ ] PR 合并后 release 写入 R2 + D1
- [ ] Web UI 可搜索、查看、下载
- [ ] 用户通过 OIDC 登录并拿到 token
- [ ] skillr 用 token 安装到三种目标路径
- [ ] admin 能处理一个 `needs_manual_review` skill

依赖：T29、T32、T35、T37  
交付物：一期内部版验收记录  
验证：完整走通 staging；production 按发布窗口执行。

退出标准：满足 `docs/skill-registry-plan.md` 第 17 节验收标准。

---

## 4. P0 / P1 / P2 优先级

### P0：没有这些不能开始导入 skill

- [ ] T01 Monorepo 基础骨架
- [ ] T02 evaluator 目录结构
- [ ] T03 registry-core 类型
- [ ] T04 D1 schema
- [ ] T08 静态校验
- [ ] T09 安全预检
- [ ] T18 review JSON schema
- [ ] T19 evaluator 输出协议
- [ ] T20 skill-review workflow
- [ ] T36 PR 模板与提交流程

### P1：没有这些不能内部试用

- [ ] T11 Manifest / Index
- [ ] T12 打包 / 解包
- [ ] T13 本地构建脚本
- [ ] T14 D1 import
- [ ] T15 R2 发布
- [ ] T17 release workflow
- [ ] T22 只读 API
- [ ] T23 搜索分页
- [ ] T24 下载接口
- [ ] T26 Web UI 普通页面
- [ ] T28 token 管理
- [ ] T32 CLI 安装能力

### P2：内部稳定与长期运维

- [ ] T27 完整 OIDC provider
- [ ] T29 Admin UI
- [ ] T33 GitHub Packages 发布
- [ ] T34 测试覆盖
- [ ] T35 双环境部署
- [ ] T37 400+ skill 导入 runbook
- [ ] T38 端到端验收

---

## 5. 每个 PR 的通用完成标准

每个实现 PR 必须满足：

- [ ] 范围只覆盖当前任务，不夹带无关重构
- [ ] 文档中对应任务 checkbox 可更新
- [ ] 新增或修改核心逻辑必须有测试
- [ ] 命令实际运行并记录结果
- [ ] 不提交 secret、token、`.env`
- [ ] 不绕过审核门禁
- [ ] 风险与验证说明写在 PR 描述中

---

## 6. 建议第一批 PR 顺序

第一批先完成基础骨架和审核门禁，不要急着做 UI：

1. T01 — 建立 Monorepo 基础骨架
2. T02 — 调整 skill-evaluator 目录结构
3. T03 — 定义 registry-core 类型与导出面
4. T04 — 编写 D1 schema 初稿
5. T07 — 添加测试 fixture skill
6. T08 — 实现 Skill frontmatter 静态校验
7. T09 — 实现安全预检
8. T18 — 定义 skill-review JSON schema
9. T19 — 强化 skill-evaluator 输出协议
10. T20 — 编写 skill-review workflow

完成这 10 个任务后，就可以开始让真实 skill 逐个 PR 进入审核流程。
