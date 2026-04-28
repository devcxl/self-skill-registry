---
title: "GitHub Cloudflare Skill Registry"
source: "https://chatgpt.com/c/69ecb22e-614c-83e8-a540-ac6ac9b7ca76"
model: "gpt-5"
model_slug: "gpt-5-5-thinking"
create_time: "2026-04-25T12:23:56.206Z"
update_time: "2026-04-26T04:18:31.533Z"
exported_at: "2026-04-27T09:23:48.223Z"
author: ChatGPT
---
# GitHub Cloudflare Skill Registry

---

## 用户

如何利用github cloudflare 等平台创建自己的 skill registry？

---

## ChatGPT

我会按“可落地的 Registry 设计”来回答：先确认 skill 包格式与索引协议，再给 GitHub + Cloudflare 的两种实现路径、目录结构、同步/发布流程和安全校验。

---

## ChatGPT

可以。核心思路是：**GitHub 负责源码、审核、版本、Release；Cloudflare 负责 Registry API、CDN、索引缓存、下载加速；本地 CLI/插件负责安装到 `.opencode/skills` 或全局 skills 目录。**

OpenCode 当前的 skill 本质上还是**文件系统发现机制**：一个 skill 一个目录，里面放 `SKILL.md`；OpenCode 会从项目级和全局目录加载，例如 `.opencode/skills/<name>/SKILL.md`、`~/.config/opencode/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md`、`.agents/skills/<name>/SKILL.md` 等。`SKILL.md` 需要 YAML frontmatter，识别字段包括 `name`、`description`、`license`、`compatibility`、`metadata`，并且 `name` 要符合小写字母数字加单横线的规则。([OpenCode](https://opencode.ai/docs/skills/))

所以你要做的不是“改 OpenCode 的加载机制”，而是做一个 **Skill Registry + Installer**，最终把 skill 安装到 OpenCode 能发现的位置。

---

## 1. 推荐总体架构

```text
GitHub Repo
  ├── skills/
  │   ├── git-release/
  │   │   ├── SKILL.md
  │   │   ├── README.md
  │   │   └── examples/
  │   ├── spring-ddd-review/
  │   │   └── SKILL.md
  │   └── opencode-plugin-dev/
  │       └── SKILL.md
  │
  ├── registry/
  │   ├── index.json
  │   └── skills/*.json
  │
  ├── scripts/
  │   ├── validate-skills.ts
  │   ├── build-registry.ts
  │   ├── pack-skills.ts
  │   └── publish.ts
  │
  └── .github/workflows/
      ├── validate.yml
      ├── release.yml
      └── deploy-worker.yml


Cloudflare
  ├── Worker API
  │   ├── GET /v1/index.json
  │   ├── GET /v1/skills
  │   ├── GET /v1/skills/:name
  │   ├── GET /v1/skills/:name/versions
  │   └── GET /v1/skills/:name/download
  │
  ├── R2，可选
  │   └── skill tarball / zip 包
  │
  ├── D1，可选
  │   └── metadata、下载统计、搜索索引
  │
  └── Static Assets，可选
      └── Registry Web UI
```

GitHub 是**可信源头**，Cloudflare 是**分发层**。

---

## 2. 最小可行版本：GitHub 静态 Registry

先不要一开始上 D1/R2/复杂 API。最小方案：

```text
skill-registry/
  skills/
    git-release/
      SKILL.md
    spring-ddd-review/
      SKILL.md

  public/
    index.json
    skills/
      git-release.json
      spring-ddd-review.json
    packages/
      git-release-1.0.0.tar.gz
      spring-ddd-review-1.0.0.tar.gz
```

然后用 GitHub Actions 每次 push 后：

1. 扫描 `skills/*/SKILL.md`
2. 校验 frontmatter
3. 生成 `public/index.json`
4. 打包每个 skill
5. 计算 `sha256`
6. 部署 `public/` 到 Cloudflare Worker Static Assets 或 Cloudflare Pages/Workers 静态资源

Cloudflare Workers 现在可以把静态资源和 Worker 代码作为一个部署单元上传，并由 Cloudflare 负责缓存和边缘分发；`wrangler` 配置里可以指定 assets 目录。([Cloudflare Docs](https://developers.cloudflare.com/workers/static-assets/))

---

## 3. Skill 包规范

每个 skill 目录建议这样：

```text
skills/spring-ddd-review/
  SKILL.md
  README.md
  examples/
    bad-service.java
    good-service.java
  tests/
    metadata.test.ts
```

`SKILL.md` 示例：

```md
---
name: spring-ddd-review
description: Review Spring Boot multi-module DDD code structure, dependency direction, transaction boundary, repository usage, and API contract design.
license: MIT
compatibility: opencode
metadata:
  category: code-review
  language: java
  framework: spring-boot
  author: char-lamada
---

# Spring DDD Review Skill

## When to use

Use this skill when reviewing Spring Boot microservice code that follows a layered architecture.

## Rules

- web 层不能直接访问 dal
- service 层不能直接使用 mapper/entity
- api 层只放 Feign contract 和 DTO
- dal 层负责 repository、mapper、entity、SQL
- 事务边界应集中管理，避免 service 到处散落事务控制
```

OpenCode 对 skill 名称有明确限制：`name` 必须是 1-64 个字符、小写字母数字、单横线分隔，且要和目录名匹配。([OpenCode](https://opencode.ai/docs/skills/))

---

## 4. Registry index.json 设计

`index.json` 是整个 registry 的入口。

```json
{
  "registryVersion": "1.0",
  "generatedAt": "2026-04-25T00:00:00Z",
  "baseUrl": "https://skills.example.com",
  "skills": [
    {
      "name": "spring-ddd-review",
      "description": "Review Spring Boot multi-module DDD architecture.",
      "latestVersion": "1.0.0",
      "license": "MIT",
      "compatibility": ["opencode"],
      "category": "code-review",
      "tags": ["spring-boot", "ddd", "java", "architecture"],
      "manifestUrl": "https://skills.example.com/v1/skills/spring-ddd-review.json"
    }
  ]
}
```

单个 skill 的 manifest：

```json
{
  "name": "spring-ddd-review",
  "description": "Review Spring Boot multi-module DDD architecture.",
  "versions": [
    {
      "version": "1.0.0",
      "publishedAt": "2026-04-25T00:00:00Z",
      "compatibility": ["opencode"],
      "license": "MIT",
      "tarball": "https://skills.example.com/packages/spring-ddd-review-1.0.0.tar.gz",
      "sha256": "7a4f...e91c",
      "size": 18432,
      "entry": "SKILL.md",
      "source": {
        "type": "github",
        "repo": "your-org/skill-registry",
        "path": "skills/spring-ddd-review",
        "commit": "abc123..."
      }
    }
  ]
}
```

这套格式的关键点：

```text
name          用于安装目录名
description   给 agent/用户判断用途
version       用于升级/回滚
tarball       下载地址
sha256        安全校验
source.commit 可追溯
compatibility 支持 opencode / claude / agents 等
```

---

## 5. GitHub Actions：校验、构建、发布

### validate.yml

```yaml
name: Validate Skills

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v5
        with:
          node-version: 22

      - run: npm ci

      - name: Validate skill metadata
        run: npm run validate:skills

      - name: Build registry index
        run: npm run build:registry
```

### deploy-worker.yml

Cloudflare 官方文档建议在 CI/CD 中使用 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN` 作为 secret，并且不要把 API token 写进仓库；Cloudflare 也提供官方 `cloudflare/wrangler-action` 用于 GitHub Actions 部署 Workers。([Cloudflare Docs](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/))

```yaml
name: Deploy Registry

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v5
        with:
          node-version: 22

      - run: npm ci
      - run: npm run validate:skills
      - run: npm run build:registry
      - run: npm run pack:skills

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

GitHub Actions 支持 OIDC，用于让工作流向云服务获取短期凭证，减少长期 secret 的使用；不过 Cloudflare Worker 部署常见路径仍然是 Wrangler + Cloudflare API token，除非你额外搭建 OIDC 到 Cloudflare API 的中间授权层。([GitHub Docs](https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect), [Cloudflare Docs](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/))

---

## 6. Cloudflare Worker 静态分发配置

`wrangler.jsonc`：

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "skill-registry",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-25",
  "assets": {
    "directory": "./public",
    "binding": "ASSETS"
  }
}
```

Cloudflare Workers 的 static assets 配置需要指定资源目录，常见目录是 `./public`、`./dist` 或 `./build`；如果配置 assets binding，Worker 代码里还能动态读取静态资源。([Cloudflare Docs](https://developers.cloudflare.com/workers/static-assets/binding/))

`src/index.ts`：

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname === "/v1/index.json") {
      const assetUrl = new URL("/index.json", url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    if (url.pathname.startsWith("/v1/skills/")) {
      const name = url.pathname
        .replace("/v1/skills/", "")
        .replace(".json", "");

      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        return Response.json({ error: "invalid skill name" }, { status: 400 });
      }

      const assetUrl = new URL(`/skills/${name}.json`, url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request);
  }
};

interface Env {
  ASSETS: Fetcher;
}
```

这个版本不需要数据库，部署简单，适合个人或小团队。

---

## 7. 如果要做“真正的 Registry API”

当 skill 数量多、需要搜索、下载统计、权限控制时，再引入 D1 / R2 / KV。

Cloudflare Workers 可以构建 API，也能绑定 D1、KV、R2、Queues 等资源；D1 是 serverless SQL 数据库，KV 适合低延迟键值读取，R2 是对象存储。([Cloudflare Docs](https://developers.cloudflare.com/workers/))

推荐分工：

| 组件 | 用途 |
|---|---|
| GitHub | skill 源码、PR 审核、版本标签 |
| GitHub Release | 不可变发布产物 |
| Cloudflare Worker | Registry API |
| Cloudflare Static Assets | Web UI、index.json |
| Cloudflare R2 | tarball/zip 包存储 |
| Cloudflare D1 | skill metadata、版本、下载统计 |
| Cloudflare KV | 热门 index 缓存 |
| GitHub Actions | 校验、打包、发布、部署 |

D1 表结构示例：

```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  license TEXT,
  compatibility TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  source_repo TEXT NOT NULL,
  source_path TEXT NOT NULL,
  latest_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE skill_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  tarball_url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  source_commit TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE(skill_name, version)
);

CREATE TABLE download_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT,
  downloaded_at TEXT NOT NULL
);
```

---

## 8. Installer CLI 设计

你需要一个安装器，例如：

```bash
skillr search spring
skillr info spring-ddd-review
skillr install spring-ddd-review
skillr install spring-ddd-review@1.0.0
skillr update spring-ddd-review
skillr remove spring-ddd-review
skillr list
```

安装路径默认：

```text
~/.config/opencode/skills/<skill-name>/SKILL.md
```

也可以支持：

```bash
skillr install spring-ddd-review --project
```

安装到：

```text
./.opencode/skills/<skill-name>/SKILL.md
```

这和 OpenCode 的 project/global skill 发现目录对应。([OpenCode](https://opencode.ai/docs/skills/))

安装流程：

```text
1. 拉取 /v1/index.json
2. 找到 skill manifest
3. 选择版本
4. 下载 tarball
5. 校验 sha256
6. 解压到临时目录
7. 校验 SKILL.md frontmatter
8. 移动到 ~/.config/opencode/skills/<name>
9. 写入 lock 文件
```

lock 文件：

```json
{
  "registry": "https://skills.example.com",
  "installed": {
    "spring-ddd-review": {
      "version": "1.0.0",
      "sha256": "7a4f...",
      "installedAt": "2026-04-25T00:00:00Z",
      "path": "~/.config/opencode/skills/spring-ddd-review"
    }
  }
}
```

---

## 9. validate-skills.ts 核心逻辑

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SKILLS_DIR = "skills";
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

for (const name of fs.readdirSync(SKILLS_DIR)) {
  const skillDir = path.join(SKILLS_DIR, name);
  const stat = fs.statSync(skillDir);

  if (!stat.isDirectory()) continue;

  const skillPath = path.join(skillDir, "SKILL.md");

  if (!fs.existsSync(skillPath)) {
    fail(`Missing SKILL.md: ${skillDir}`);
  }

  if (!NAME_RE.test(name)) {
    fail(`Invalid directory name: ${name}`);
  }

  const raw = fs.readFileSync(skillPath, "utf8");
  const parsed = matter(raw);

  const fm = parsed.data;

  if (!fm.name) {
    fail(`Missing frontmatter.name in ${skillPath}`);
  }

  if (fm.name !== name) {
    fail(`frontmatter.name must match directory name: ${skillPath}`);
  }

  if (!NAME_RE.test(fm.name)) {
    fail(`Invalid skill name: ${fm.name}`);
  }

  if (!fm.description || fm.description.length > 1024) {
    fail(`Invalid description in ${skillPath}`);
  }

  if (fm.compatibility && fm.compatibility !== "opencode") {
    console.warn(`Non-opencode compatibility: ${skillPath}`);
  }
}

console.log("All skills are valid.");
```

---

## 10. build-registry.ts 核心逻辑

```ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SKILLS_DIR = "skills";
const PUBLIC_DIR = "public";

fs.mkdirSync(path.join(PUBLIC_DIR, "skills"), { recursive: true });

const skills = [];

for (const name of fs.readdirSync(SKILLS_DIR)) {
  const skillDir = path.join(SKILLS_DIR, name);
  const skillPath = path.join(skillDir, "SKILL.md");

  if (!fs.existsSync(skillPath)) continue;

  const raw = fs.readFileSync(skillPath, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data;

  const manifest = {
    name: fm.name,
    description: fm.description,
    license: fm.license ?? "UNLICENSED",
    compatibility: [fm.compatibility ?? "opencode"],
    metadata: fm.metadata ?? {},
    latestVersion: "0.1.0",
    versions: [
      {
        version: "0.1.0",
        tarball: `/packages/${name}-0.1.0.tar.gz`,
        sha256: "TO_BE_FILLED_BY_PACK_STEP",
        entry: "SKILL.md"
      }
    ]
  };

  fs.writeFileSync(
    path.join(PUBLIC_DIR, "skills", `${name}.json`),
    JSON.stringify(manifest, null, 2)
  );

  skills.push({
    name: manifest.name,
    description: manifest.description,
    latestVersion: manifest.latestVersion,
    license: manifest.license,
    compatibility: manifest.compatibility,
    metadata: manifest.metadata,
    manifestUrl: `/v1/skills/${name}.json`
  });
}

fs.writeFileSync(
  path.join(PUBLIC_DIR, "index.json"),
  JSON.stringify(
    {
      registryVersion: "1.0",
      generatedAt: new Date().toISOString(),
      skills
    },
    null,
    2
  )
);
```

---

## 11. 安全设计

自己的 registry 不要只做“下载 zip”。至少要有这些约束：

| 安全项 | 目的 |
|---|---|
| PR review | 防止恶意 skill 混入 |
| name 校验 | 防止路径穿越、目录污染 |
| tarball sha256 | 防止下载内容被篡改 |
| source commit | 方便追溯 |
| license 字段 | 避免团队内部使用不明授权内容 |
| lock 文件 | 保证可复现 |
| allowlist registry | 防止用户误装未知源 |
| 禁止安装脚本自动执行 | skill 应该是文档能力，不应该执行任意脚本 |
| 解压路径校验 | 防止 tarball 内包含 `../../` |

最重要的是：**skill registry 只分发文本/示例/模板，不要让 skill 包具备 postinstall 脚本能力。**  
一旦支持 postinstall，就变成 npm/pip 类供应链风险。

---

## 12. 推荐 API 设计

```http
GET /v1/index.json
GET /v1/skills
GET /v1/skills/:name
GET /v1/skills/:name/versions
GET /v1/skills/:name/versions/:version
GET /v1/skills/:name/download
GET /v1/search?q=spring
```

返回示例：

```json
{
  "name": "spring-ddd-review",
  "description": "Review Spring Boot multi-module DDD architecture.",
  "latestVersion": "1.0.0",
  "versions": [
    {
      "version": "1.0.0",
      "tarball": "https://skills.example.com/packages/spring-ddd-review-1.0.0.tar.gz",
      "sha256": "7a4f..."
    }
  ]
}
```

---

## 13. Web UI 可以很简单

首页功能：

```text
- 搜索 skill
- 按 category/tag 过滤
- 查看 SKILL.md 摘要
- 展示安装命令
- 展示版本历史
- 展示源码链接
```

例如：

```bash
skillr install spring-ddd-review
```

或者兼容更直接的方式：

```bash
curl -fsSL https://skills.example.com/install.sh | sh -s spring-ddd-review
```

但不建议默认推广 `curl | sh`，团队内部可以接受，公开 registry 最好提供二进制 CLI 或 npm 包。

---

## 14. 私有 Registry 方案

如果你不想公开 skill：

```text
GitHub Private Repo
  ↓ GitHub Actions
Cloudflare Worker
  ↓ Bearer Token / Access
Private Skill Registry
  ↓
skillr install --token xxx spring-ddd-review
```

Cloudflare 可以做：

```text
1. Cloudflare Access 保护 registry.example.com
2. Worker 校验 Authorization Bearer Token
3. GitHub Actions 发布时只允许 main 分支
4. skillr 本地读取 ~/.skillr/config.json token
```

配置示例：

```json
{
  "registries": {
    "private": {
      "url": "https://skills.example.com",
      "token": "env:SKILL_REGISTRY_TOKEN"
    }
  },
  "defaultRegistry": "private",
  "installPath": "~/.config/opencode/skills"
}
```

---

## 15. 三种落地路线

### 路线 A：极简静态 Registry

适合个人使用。

```text
GitHub repo + GitHub Actions + Cloudflare Static Assets
```

优点：

```text
简单、便宜、稳定、无需数据库
```

缺点：

```text
搜索弱、统计弱、权限弱
```

建议你先从这个做。

---

### 路线 B：Worker API + Static Assets

适合小团队。

```text
GitHub repo + Worker API + Static Assets
```

优点：

```text
可以加搜索、鉴权、版本 API、缓存控制
```

缺点：

```text
需要维护 Worker 代码
```

---

### 路线 C：Worker + D1 + R2 + Web UI

适合公开生态。

```text
GitHub repo + Worker + D1 + R2 + KV + Web UI
```

优点：

```text
完整 registry 能力：搜索、统计、版本、分类、审计
```

缺点：

```text
复杂度明显上升
```

---

## 16. 我建议你的实现顺序

第一阶段，不要搞复杂：

```text
1. 建 skill-registry GitHub 仓库
2. 定义 skills/<name>/SKILL.md 规范
3. 写 validate-skills.ts
4. 写 build-registry.ts
5. 写 pack-skills.ts
6. GitHub Actions 自动生成 public/index.json
7. Cloudflare Worker Static Assets 托管 public/
8. 写一个最小 skillr CLI，只支持 install/list/remove
```

第二阶段再加：

```text
1. search
2. update
3. lock 文件
4. 版本号
5. sha256 校验
6. 私有 token
```

第三阶段再考虑：

```text
1. Web UI
2. D1 元数据
3. R2 包分发
4. 下载统计
5. 推荐/评分
6. 多 registry 源
```

---

## 17. 最终推荐形态

你的场景下最合理的是：

```text
GitHub = skill 源码和审核中心
Cloudflare Worker Static Assets = registry 静态索引和包分发
skillr CLI = 安装器
OpenCode = 只负责从本地 skills 目录加载
```

也就是：

```text
skill 作者提交 PR
        ↓
GitHub Actions 校验 SKILL.md
        ↓
生成 index.json + manifest + tarball
        ↓
部署到 Cloudflare
        ↓
用户执行 skillr install xxx
        ↓
安装到 ~/.config/opencode/skills/xxx/SKILL.md
        ↓
OpenCode 自动发现
```

这个设计符合“简单可靠”的原则：OpenCode 不需要改，Registry 不需要一开始上数据库，Cloudflare 只做高可用分发层，GitHub 保留完整审计链路。

---

## 用户

skill安装脚本不仅要支持opencode 还要支持claude code、 codex。

使用Github Action的 anomalyco/opencode/github@latest 来进行审核 内置 skill-evaluator 技能输出审核报告，展示到webui中。  

最后整理成最终形态的开发文档给我。

---

## ChatGPT

我会把你的新增约束合并进去：安装器同时适配 OpenCode / Claude Code / Codex，Registry 增加审核报告链路，Web UI 展示 skill-evaluator 的结构化结果。

---

## ChatGPT

我查到一个需要纳入设计的现实约束：OpenCode 官方 GitHub Action 文档确实使用 `anomalyco/opencode/github@latest`，但社区 issue 曾指出 `latest` 可能滞后。因此文档里会按你的要求默认使用 `latest`，同时给出生产环境 pin 版本/commit 的保底策略。

---

## ChatGPT

下面是合并你新增要求后的**最终形态开发文档**。我把 `skill-evaluator` 视为你这个 Registry 项目内置的审核 skill，而不是假设 OpenCode 官方已经内置该 skill；我没有找到公开文档能确认 OpenCode 官方自带名为 `skill-evaluator` 的 skill。

# Skill Registry 最终形态开发文档

## 1. 目标

建设一个自托管 Skill Registry，用于统一管理、审核、分发、安装 AI Agent Skills。

目标平台：

```text
OpenCode
Claude Code
Codex
```

核心能力：

```text
1. GitHub 托管 skill 源码、PR、版本、Release
2. GitHub Actions 自动校验、打包、发布
3. 使用 anomalyco/opencode/github@latest 调用 skill-evaluator 进行 AI 审核
4. 审核报告结构化输出，并展示到 Web UI
5. Cloudflare Worker 提供 Registry API
6. Cloudflare Static Assets 托管 Web UI
7. Cloudflare R2 存储 skill 压缩包
8. Cloudflare D1 存储 metadata、版本、审核报告、下载记录
9. 安装脚本同时支持 OpenCode、Claude Code、Codex
```

OpenCode 的 skill 支持 `.opencode/skills`、`.claude/skills`、`.agents/skills` 等路径，且 `SKILL.md` frontmatter 识别 `name`、`description`、`license`、`compatibility`、`metadata` 等字段；`name` 必须是小写字母数字和单横线格式，并与目录名一致。([OpenCode](https://opencode.ai/docs/skills/))  
Claude Code 的个人 skill 路径是 `~/.claude/skills/<skill-name>/SKILL.md`，项目级路径是 `.claude/skills/<skill-name>/SKILL.md`，且 skill 的 `name` 会成为 slash command，`description` 用于自动触发判断。([Claude](https://code.claude.com/docs/en/skills))  
Codex 的 skill 使用 `.agents/skills` 体系，支持 repo、user、admin、system 多级位置；用户级默认是 `$HOME/.agents/skills`，管理级是 `/etc/codex/skills`。([OpenAI开发者](https://developers.openai.com/codex/skills))

---

## 2. 总体架构

```text
┌──────────────────────────────┐
│ GitHub Repository             │
│ - skills/                     │
│ - evaluator/                  │
│ - registry builder            │
│ - GitHub Actions              │
└───────────────┬──────────────┘
                │
                │ PR / push / release
                ▼
┌──────────────────────────────┐
│ GitHub Actions                │
│ 1. static validation          │
│ 2. pack skill                 │
│ 3. run OpenCode review        │
│ 4. output skill-review.json   │
│ 5. publish registry           │
└───────────────┬──────────────┘
                │
                │ upload metadata/package/report
                ▼
┌──────────────────────────────┐
│ Cloudflare                    │
│ - Worker API                  │
│ - Static Assets Web UI        │
│ - D1 metadata/report DB       │
│ - R2 package storage          │
└───────────────┬──────────────┘
                │
                │ install/search/view
                ▼
┌──────────────────────────────┐
│ skillr CLI / install.sh       │
│ - install for opencode        │
│ - install for claude-code     │
│ - install for codex           │
└───────────────┬──────────────┘
                ▼
┌──────────────────────────────┐
│ Local Agent Tools             │
│ OpenCode / Claude Code / Codex│
└──────────────────────────────┘
```

Cloudflare Workers Static Assets 可以把 Worker 代码和静态资源作为一个部署单元，资源目录由 Wrangler 配置，部署后 Cloudflare 会缓存并分发这些静态资源；Worker 也可以通过 `ASSETS` binding 读取静态文件。([Cloudflare Docs](https://developers.cloudflare.com/workers/static-assets/))  
D1 适合存储 Registry metadata、审核报告、下载统计等结构化数据，因为它是 Cloudflare 的 serverless SQL 数据库，具备 SQLite SQL 语义和 Worker / HTTP API 访问能力。([Cloudflare Docs](https://developers.cloudflare.com/d1/))  
R2 适合存储 skill tarball/zip，因为它是 Cloudflare 的对象存储服务，面向大量非结构化数据。([Cloudflare Docs](https://developers.cloudflare.com/r2/))

---

## 3. 仓库结构

```text
skill-registry/
  skills/
    spring-ddd-review/
      SKILL.md
      README.md
      references/
      examples/
      scripts/
    opencode-plugin-dev/
      SKILL.md
      README.md

  evaluator/
    skill-evaluator/
      SKILL.md
      rubrics/
        default.md
        security.md
        portability.md
        clarity.md

  apps/
    web/
      src/
      package.json

    worker/
      src/
        index.ts
        routes/
        services/
      wrangler.jsonc

    cli/
      src/
        main.ts
        commands/
        installers/
      package.json

  packages/
    registry-core/
      src/
        manifest.ts
        validator.ts
        pack.ts
        checksum.ts

  scripts/
    validate-skills.ts
    build-registry.ts
    pack-skills.ts
    import-review-report.ts
    publish-r2.ts

  .github/
    workflows/
      validate.yml
      skill-review.yml
      release.yml
      deploy-worker.yml

  public/
    index.json
    skills/
    reviews/
    packages/
```

---

## 4. Skill 包规范

每个 skill 必须是一个目录，入口文件必须是 `SKILL.md`。

```text
skills/<skill-name>/
  SKILL.md
  README.md
  references/
  examples/
  scripts/
  assets/
```

推荐 `SKILL.md`：

```md
---
name: spring-ddd-review
description: Review Spring Boot multi-module DDD architecture, dependency direction, transaction boundaries, repository usage, DTO contracts, and anti-patterns.
license: MIT
compatibility: opencode,claude-code,codex
metadata:
  category: code-review
  language: java
  framework: spring-boot
  risk: low
---

# Spring DDD Review

## When to use

Use this skill when reviewing Spring Boot microservice code using layered architecture or DDD-style modular boundaries.

## Rules

- web 层不能直接访问 dal
- server 层不能直接使用 mapper/entity
- api 层只放 Feign contract 和 DTO
- dal 层负责 repository、mapper、entity、SQL
- 事务边界应集中管理
```

为了兼容三方，建议只依赖最小公共字段：

```text
name
description
license
compatibility
metadata
```

不要把 Claude Code 专用字段、OpenCode 权限字段、Codex agent 配置硬塞进公共 `SKILL.md`。如果确实需要平台差异，放到：

```text
.platform/
  opencode.json
  claude-code.json
  codex.json
```

---

## 5. Registry Manifest 设计

### 5.1 全局 index

`GET /v1/index.json`

```json
{
  "registryVersion": "1.0",
  "generatedAt": "2026-04-25T00:00:00Z",
  "baseUrl": "https://skills.example.com",
  "skills": [
    {
      "name": "spring-ddd-review",
      "description": "Review Spring Boot multi-module DDD architecture.",
      "latestVersion": "1.0.0",
      "license": "MIT",
      "compatibility": ["opencode", "claude-code", "codex"],
      "category": "code-review",
      "tags": ["spring-boot", "ddd", "java"],
      "status": "approved",
      "score": 91,
      "manifestUrl": "https://skills.example.com/v1/skills/spring-ddd-review"
    }
  ]
}
```

### 5.2 单个 skill manifest

`GET /v1/skills/:name`

```json
{
  "name": "spring-ddd-review",
  "description": "Review Spring Boot multi-module DDD architecture.",
  "latestVersion": "1.0.0",
  "license": "MIT",
  "compatibility": ["opencode", "claude-code", "codex"],
  "metadata": {
    "category": "code-review",
    "language": "java",
    "framework": "spring-boot"
  },
  "source": {
    "repo": "your-org/skill-registry",
    "path": "skills/spring-ddd-review"
  },
  "versions": [
    {
      "version": "1.0.0",
      "publishedAt": "2026-04-25T00:00:00Z",
      "tarball": "https://skills.example.com/v1/skills/spring-ddd-review/download?version=1.0.0",
      "sha256": "abc123...",
      "size": 18432,
      "sourceCommit": "da6683f..."
    }
  ],
  "latestReview": {
    "reviewId": "rev_20260425_abc123",
    "status": "approved",
    "score": 91,
    "reportUrl": "https://skills.example.com/v1/reviews/rev_20260425_abc123"
  }
}
```

---

## 6. 数据库设计：Cloudflare D1

```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  license TEXT,
  compatibility TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  latest_version TEXT,
  latest_score INTEGER,
  source_repo TEXT NOT NULL,
  source_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE skill_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  tarball_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  source_commit TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE(skill_name, version)
);

CREATE TABLE skill_reviews (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  version TEXT,
  pr_number INTEGER,
  commit_sha TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE download_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  target TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT,
  downloaded_at TEXT NOT NULL
);
```

---

## 7. 安装器设计

安装器名称建议：

```text
skillr
```

命令：

```bash
skillr search ddd
skillr info spring-ddd-review
skillr install spring-ddd-review
skillr install spring-ddd-review@1.0.0
skillr install spring-ddd-review --target opencode
skillr install spring-ddd-review --target claude-code
skillr install spring-ddd-review --target codex
skillr install spring-ddd-review --target all
skillr install spring-ddd-review --project --target opencode
skillr update spring-ddd-review
skillr remove spring-ddd-review
skillr list
```

### 7.1 平台安装路径

| target | global path | project path |
|---|---|---|
| OpenCode | `~/.config/opencode/skills/<name>/SKILL.md` | `.opencode/skills/<name>/SKILL.md` |
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/<name>/SKILL.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` |

OpenCode 同时兼容 `.opencode/skills`、`.claude/skills` 和 `.agents/skills`，所以最省事的跨平台安装路径其实是 `.agents/skills` 或 `~/.agents/skills`；但为了让用户明确知道安装目标，CLI 仍应保留 `--target opencode|claude-code|codex|all`。([OpenCode](https://opencode.ai/docs/skills/))

### 7.2 安装流程

```text
1. 读取 registry config
2. 拉取 /v1/skills/:name
3. 选择版本
4. 下载 tarball
5. 校验 sha256
6. 解压到临时目录
7. 校验 SKILL.md
8. 根据 target 选择安装目录
9. 原子替换目标目录
10. 写入 lock 文件
```

lock 文件：

```json
{
  "registry": "https://skills.example.com",
  "installed": {
    "spring-ddd-review": {
      "version": "1.0.0",
      "sha256": "abc123",
      "target": ["opencode", "claude-code", "codex"],
      "installedAt": "2026-04-25T00:00:00Z"
    }
  }
}
```

### 7.3 install.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="${SKILL_REGISTRY_URL:-https://skills.example.com}"
TARGET="${TARGET:-opencode}"
SCOPE="${SCOPE:-global}"
SKILL_NAME="${1:-}"

if [ -z "$SKILL_NAME" ]; then
  echo "usage: install.sh <skill-name> [version]"
  exit 1
fi

VERSION="${2:-latest}"

case "$TARGET:$SCOPE" in
  opencode:global)
    BASE_DIR="${HOME}/.config/opencode/skills"
    ;;
  opencode:project)
    BASE_DIR=".opencode/skills"
    ;;
  claude-code:global)
    BASE_DIR="${HOME}/.claude/skills"
    ;;
  claude-code:project)
    BASE_DIR=".claude/skills"
    ;;
  codex:global)
    BASE_DIR="${HOME}/.agents/skills"
    ;;
  codex:project)
    BASE_DIR=".agents/skills"
    ;;
  all:global)
    BASE_DIR=""
    ;;
  all:project)
    BASE_DIR=""
    ;;
  *)
    echo "unsupported TARGET/SCOPE: $TARGET/$SCOPE"
    exit 1
    ;;
esac

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MANIFEST_URL="${REGISTRY_URL}/v1/skills/${SKILL_NAME}"
MANIFEST_FILE="${TMP_DIR}/manifest.json"

curl -fsSL "$MANIFEST_URL" -o "$MANIFEST_FILE"

if [ "$VERSION" = "latest" ]; then
  VERSION="$(node -e "console.log(require('$MANIFEST_FILE').latestVersion)")"
fi

TARBALL_URL="$(node -e "
const m=require('$MANIFEST_FILE');
const v=m.versions.find(x=>x.version==='${VERSION}');
if(!v) process.exit(1);
console.log(v.tarball);
")"

EXPECTED_SHA="$(node -e "
const m=require('$MANIFEST_FILE');
const v=m.versions.find(x=>x.version==='${VERSION}');
if(!v) process.exit(1);
console.log(v.sha256);
")"

curl -fsSL "$TARBALL_URL" -o "${TMP_DIR}/skill.tar.gz"

ACTUAL_SHA="$(sha256sum "${TMP_DIR}/skill.tar.gz" | awk '{print $1}')"

if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "sha256 mismatch"
  echo "expected: $EXPECTED_SHA"
  echo "actual:   $ACTUAL_SHA"
  exit 1
fi

mkdir -p "${TMP_DIR}/extract"
tar -xzf "${TMP_DIR}/skill.tar.gz" -C "${TMP_DIR}/extract"

if [ ! -f "${TMP_DIR}/extract/SKILL.md" ]; then
  echo "invalid package: missing SKILL.md"
  exit 1
fi

install_one() {
  local dir="$1"
  mkdir -p "$dir"
  rm -rf "${dir:?}/${SKILL_NAME}"
  mkdir -p "${dir}/${SKILL_NAME}"
  cp -R "${TMP_DIR}/extract/." "${dir}/${SKILL_NAME}/"
}

if [ "$TARGET" = "all" ]; then
  if [ "$SCOPE" = "global" ]; then
    install_one "${HOME}/.config/opencode/skills"
    install_one "${HOME}/.claude/skills"
    install_one "${HOME}/.agents/skills"
  else
    install_one ".opencode/skills"
    install_one ".claude/skills"
    install_one ".agents/skills"
  fi
else
  install_one "$BASE_DIR"
fi

echo "installed ${SKILL_NAME}@${VERSION} for target=${TARGET}, scope=${SCOPE}"
```

---

## 8. skill-evaluator 审核设计

### 8.1 skill-evaluator 位置

```text
evaluator/skill-evaluator/SKILL.md
```

在 GitHub Action 运行前，把它复制到：

```text
.opencode/skills/skill-evaluator/SKILL.md
```

这样 `anomalyco/opencode/github@latest` 运行时可以发现该 skill。

OpenCode 的 GitHub Action 官方示例使用 `anomalyco/opencode/github@latest`，并支持 `model`、`agent`、`share`、`prompt`、`token` 等输入；它也支持 `pull_request` 事件用于自动 PR review。([OpenCode](https://opencode.ai/docs/github/))  
需要注意：公开 issue 曾指出 `anomalyco/opencode/github@latest` 可能出现滞后到旧发布的问题。你要求用 `latest`，文档里默认保留；但生产环境建议在验证后 pin 到具体 tag 或 commit。([GitHub](https://github.com/anomalyco/opencode/issues/19865?utm_source=chatgpt.com))

### 8.2 skill-evaluator/SKILL.md

```md
---
name: skill-evaluator
description: Evaluate an AI Agent Skill package for correctness, portability, safety, clarity, trigger quality, platform compatibility, and registry readiness. Use when reviewing changes under skills/*.
license: MIT
compatibility: opencode
metadata:
  category: review
  purpose: skill-registry-quality-gate
---

# Skill Evaluator

## Objective

Evaluate one or more skill packages changed in the current pull request.

## Inputs

Inspect:

- `skills/<name>/SKILL.md`
- `README.md`
- `references/`
- `scripts/`
- `examples/`
- package metadata generated by registry scripts
- changed files in the pull request

## Evaluation dimensions

Score each dimension from 0 to 100.

1. Metadata correctness
2. Description trigger quality
3. Instruction clarity
4. Platform portability
5. Security risk
6. Script safety
7. Context efficiency
8. Examples quality
9. Versioning readiness
10. Registry readiness

## Hard fail rules

Return `rejected` if any of these are true:

- Missing `SKILL.md`
- Missing `name`
- Missing `description`
- `name` does not match directory name
- Contains suspicious postinstall behavior
- Contains credential exfiltration behavior
- Contains destructive shell commands without explicit safeguards
- Depends on unavailable private files
- Platform compatibility claim is false

## Required output

Write a JSON report to:

`artifacts/skill-review.json`

Use this exact schema:

```json
{
  "status": "approved | changes_requested | rejected",
  "score": 0,
  "summary": "",
  "skills": [
    {
      "name": "",
      "status": "approved | changes_requested | rejected",
      "score": 0,
      "changedFiles": [],
      "findings": [
        {
          "severity": "info | warning | error | critical",
          "category": "metadata | portability | safety | clarity | trigger | packaging | compatibility",
          "message": "",
          "file": "",
          "line": null,
          "recommendation": ""
        }
      ],
      "checks": {
        "metadata": 0,
        "triggerQuality": 0,
        "clarity": 0,
        "portability": 0,
        "security": 0,
        "contextEfficiency": 0,
        "examples": 0,
        "registryReadiness": 0
      }
    }
  ]
}
```

Also write a Markdown report to:

`artifacts/skill-review.md`
```

---

## 9. GitHub Actions 设计

### 9.1 validate.yml

```yaml
name: validate-skills

on:
  pull_request:
    paths:
      - "skills/**"
      - "packages/registry-core/**"
      - "scripts/**"
      - ".github/workflows/**"
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Validate skills
        run: npm run validate:skills

      - name: Build registry
        run: npm run build:registry

      - name: Pack skills
        run: npm run pack:skills
```

### 9.2 skill-review.yml

```yaml
name: skill-review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths:
      - "skills/**"

jobs:
  skill-review:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read
      pull-requests: write
      issues: write

    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Prepare evaluator skill
        run: |
          mkdir -p .opencode/skills/skill-evaluator
          cp -R evaluator/skill-evaluator/. .opencode/skills/skill-evaluator/

      - name: Prepare artifacts
        run: mkdir -p artifacts

      - name: Static validation before AI review
        run: npm run validate:skills

      - name: Run OpenCode skill evaluator
        uses: anomalyco/opencode/github@latest
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          model: anthropic/claude-sonnet-4-20250514
          use_github_token: true
          prompt: |
            Use the skill-evaluator skill.

            Review only the changed skill packages in this pull request.

            Required:
            - Read the changed files.
            - Evaluate each changed skill.
            - Write machine-readable JSON to artifacts/skill-review.json.
            - Write Markdown summary to artifacts/skill-review.md.
            - Do not modify files outside artifacts/.
            - Do not approve unsafe skills.
            - If the output file cannot be written, explain why in the GitHub comment.

      - name: Validate review report exists
        run: |
          test -f artifacts/skill-review.json
          test -f artifacts/skill-review.md
          node scripts/validate-review-report.ts artifacts/skill-review.json

      - name: Upload review artifact
        uses: actions/upload-artifact@v4
        with:
          name: skill-review
          path: artifacts/

      - name: Comment review summary
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("fs");
            const body = fs.readFileSync("artifacts/skill-review.md", "utf8");

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body
            });

      - name: Fail if rejected
        run: |
          node - <<'NODE'
          const fs = require("fs");
          const report = JSON.parse(fs.readFileSync("artifacts/skill-review.json", "utf8"));
          if (report.status === "rejected") {
            console.error("skill review rejected");
            process.exit(1);
          }
          NODE
```

重点：不要只依赖 AI 评论。必须强制 `artifacts/skill-review.json` 存在，并用脚本校验 schema。否则 Web UI 没有稳定数据源。

### 9.3 release.yml

```yaml
name: release-registry

on:
  push:
    branches:
      - main
    paths:
      - "skills/**"

jobs:
  release:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Validate
        run: npm run validate:skills

      - name: Build registry metadata
        run: npm run build:registry

      - name: Pack skills
        run: npm run pack:skills

      - name: Publish packages to R2
        run: npm run publish:r2
        env:
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET: ${{ secrets.R2_BUCKET }}
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}

      - name: Import metadata to D1
        run: npm run import:registry
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## 10. Worker API 设计

### 10.1 API 列表

```http
GET /v1/index.json
GET /v1/skills
GET /v1/skills/:name
GET /v1/skills/:name/versions
GET /v1/skills/:name/download?version=1.0.0&target=opencode
GET /v1/reviews
GET /v1/reviews/:id
GET /v1/skills/:name/reviews
GET /v1/search?q=ddd
POST /v1/download-events
```

### 10.2 Worker 路由示例

```ts
export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname === "/v1/index.json") {
      return handleIndex(env);
    }

    if (url.pathname === "/v1/skills") {
      return handleSkills(env, url);
    }

    const skillMatch = url.pathname.match(/^\/v1\/skills\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (skillMatch) {
      return handleSkill(env, skillMatch[1]);
    }

    const downloadMatch = url.pathname.match(/^\/v1\/skills\/([a-z0-9]+(?:-[a-z0-9]+)*)\/download$/);
    if (downloadMatch) {
      return handleDownload(request, env, downloadMatch[1]);
    }

    const reviewMatch = url.pathname.match(/^\/v1\/reviews\/([^/]+)$/);
    if (reviewMatch) {
      return handleReview(env, reviewMatch[1]);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleIndex(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(`
    SELECT name, description, latest_version, license, compatibility, category, tags, status, latest_score
    FROM skills
    ORDER BY name ASC
  `).all();

  return Response.json({
    registryVersion: "1.0",
    generatedAt: new Date().toISOString(),
    skills: rows.results
  });
}

async function handleSkill(env: Env, name: string): Promise<Response> {
  const skill = await env.DB.prepare(`
    SELECT * FROM skills WHERE name = ?
  `).bind(name).first();

  if (!skill) {
    return Response.json({ error: "skill not found" }, { status: 404 });
  }

  const versions = await env.DB.prepare(`
    SELECT version, tarball_key, sha256, size, source_commit, published_at
    FROM skill_versions
    WHERE skill_name = ?
    ORDER BY published_at DESC
  `).bind(name).all();

  const review = await env.DB.prepare(`
    SELECT id, status, score, summary, created_at
    FROM skill_reviews
    WHERE skill_name = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(name).first();

  return Response.json({
    ...skill,
    versions: versions.results,
    latestReview: review
  });
}

async function handleDownload(request: Request, env: Env, name: string): Promise<Response> {
  const url = new URL(request.url);
  const version = url.searchParams.get("version");

  const row = await env.DB.prepare(`
    SELECT tarball_key, sha256
    FROM skill_versions
    WHERE skill_name = ? AND version = COALESCE(?, version)
    ORDER BY published_at DESC
    LIMIT 1
  `).bind(name, version).first<{ tarball_key: string; sha256: string }>();

  if (!row) {
    return Response.json({ error: "version not found" }, { status: 404 });
  }

  const object = await env.R2.get(row.tarball_key);
  if (!object) {
    return Response.json({ error: "package not found" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/gzip",
      "X-Skill-Sha256": row.sha256,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}

async function handleReview(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(`
    SELECT * FROM skill_reviews WHERE id = ?
  `).bind(id).first();

  if (!row) {
    return Response.json({ error: "review not found" }, { status: 404 });
  }

  return Response.json(row);
}
```

---

## 11. Web UI 设计

### 11.1 页面

```text
/
  Registry 首页
  - skill 总数
  - approved / changes_requested / rejected 统计
  - 最近更新
  - 最近审核

/skills
  Skill 列表
  - 搜索
  - tag filter
  - target filter: opencode / claude-code / codex
  - status filter
  - score sort

/skills/:name
  Skill 详情
  - description
  - compatibility
  - version list
  - install command
  - latest review report
  - source link
  - sha256

/skills/:name/reviews
  历史审核报告

/reviews/:id
  单次审核详情
  - score
  - status
  - findings
  - changed files
  - markdown summary
  - raw JSON
```

### 11.2 Skill 详情页展示

```text
spring-ddd-review

Status: approved
Score: 91
Compatibility: OpenCode, Claude Code, Codex
Latest version: 1.0.0
License: MIT

Install:

OpenCode:
curl -fsSL https://skills.example.com/install.sh | TARGET=opencode bash -s spring-ddd-review

Claude Code:
curl -fsSL https://skills.example.com/install.sh | TARGET=claude-code bash -s spring-ddd-review

Codex:
curl -fsSL https://skills.example.com/install.sh | TARGET=codex bash -s spring-ddd-review

All:
curl -fsSL https://skills.example.com/install.sh | TARGET=all bash -s spring-ddd-review
```

### 11.3 审核报告展示

```text
Review: rev_20260425_abc123

Status: approved
Score: 91

Checks:
- Metadata: 100
- Trigger Quality: 88
- Clarity: 92
- Portability: 90
- Security: 95
- Context Efficiency: 86
- Examples: 80
- Registry Readiness: 96

Findings:
[warning] trigger
description 过宽，可能在普通 Spring 问题中误触发。
Recommendation: 在 description 中加入 “multi-module DDD architecture review” 等限定词。

[info] examples
建议增加 bad/good 对照案例。
```

---

## 12. wrangler 配置

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "skill-registry",
  "main": "apps/worker/src/index.ts",
  "compatibility_date": "2026-04-25",
  "assets": {
    "directory": "apps/web/dist",
    "binding": "ASSETS",
    "run_worker_first": ["/v1/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "skill-registry",
      "database_id": "replace-me"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "skill-registry-packages"
    }
  ]
}
```

---

## 13. 校验规则

### 13.1 静态校验

必须失败：

```text
1. 缺少 SKILL.md
2. 缺少 name
3. 缺少 description
4. name 和目录名不一致
5. name 不符合 ^[a-z0-9]+(-[a-z0-9]+)*$
6. description 超过 1024 字符
7. tarball 解压后存在路径穿越
8. 包内包含隐藏敏感文件
9. compatibility 声称支持的平台无法通过路径/字段兼容检查
```

### 13.2 AI 审核

AI 审核不替代静态校验，只补充：

```text
1. 触发描述是否过宽
2. 指令是否含糊
3. 是否上下文过长
4. 是否有危险 shell 脚本
5. 是否有平台专有假设
6. 是否缺少示例
7. 是否适合发布到 Registry
```

### 13.3 发布门禁

```text
approved:
  允许合并和发布

changes_requested:
  允许人工决定是否合并
  默认不自动发布

rejected:
  阻断合并
  禁止发布
```

---

## 14. 安全策略

必须坚持：

```text
1. skill 默认是文档能力，不支持 postinstall
2. 不允许安装时自动执行脚本
3. tarball 必须 sha256 校验
4. 解压必须防路径穿越
5. R2 package key 必须不可变
6. 每个版本绑定 source commit
7. Web UI 明确展示审核状态
8. 默认只安装 approved skill
9. 安装 rejected skill 需要 --allow-rejected
10. 私有 Registry 必须加 token 或 Cloudflare Access
```

安装器默认拒绝：

```text
status = rejected
sha256 mismatch
missing SKILL.md
name mismatch
package path traversal
unknown registry without --allow-unknown-registry
```

---

## 15. 推荐开发顺序

第一阶段：基础 Registry

```text
1. 建仓库结构
2. 实现 SKILL.md 静态校验
3. 实现 pack-skills
4. 实现 index.json / manifest.json
5. Cloudflare Worker + Static Assets 部署
6. 安装器支持 opencode / claude-code / codex
```

第二阶段：审核链路

```text
1. 编写 evaluator/skill-evaluator/SKILL.md
2. GitHub Action 中安装 evaluator skill
3. 使用 anomalyco/opencode/github@latest 运行审核
4. 强制输出 artifacts/skill-review.json
5. 校验 report schema
6. PR 评论审核摘要
7. rejected 阻断合并
```

第三阶段：Web UI

```text
1. Skill 列表页
2. Skill 详情页
3. Review 报告页
4. 安装命令复制
5. 按平台筛选
6. 按审核状态筛选
```

第四阶段：正式发布

```text
1. R2 存储 tarball
2. D1 存储 metadata/reviews
3. release workflow 导入数据
4. 下载统计
5. lock 文件
6. 私有 token
```

---

## 16. 最终推荐形态

最终架构应是：

```text
GitHub Repo
  = skill source of truth

GitHub Actions
  = validation + AI review + packaging + release

anomalyco/opencode/github@latest
  = PR 内 AI 审核执行器

skill-evaluator
  = Registry 内置审核 skill

Cloudflare Worker
  = Registry API

Cloudflare D1
  = metadata + reviews + download events

Cloudflare R2
  = immutable skill packages

Cloudflare Static Assets
  = Registry Web UI

skillr / install.sh
  = multi-agent installer

OpenCode / Claude Code / Codex
  = runtime consumers
```

最关键的设计判断：

```text
1. 公共 skill 包只使用 SKILL.md 标准能力
2. 平台差异由安装路径和 .platform metadata 处理
3. GitHub Action 审核必须输出结构化 JSON
4. Web UI 不解析 AI 评论，只读取 D1 中的审核报告
5. 安装器默认只安装 approved + sha256 校验通过的版本
6. 不提供 postinstall，避免供应链风险
7. 先做静态 Registry，再逐步引入 D1/R2/Web UI
```

这套形态能同时覆盖个人使用、团队内部分发、公开 Registry 三种场景，而且不会侵入 OpenCode、Claude Code、Codex 本身。
