# E2E Acceptance Checklist

端到端验收流程，确认所有核心路径均可正常工作。

## 验收环境

- [ ] staging 环境已配置（D1, R2, Worker 均已部署）
- [ ] GitHub Actions secrets 已配置（`CLOUDFLARE_*`）
- [ ] CI workflows 正常运行

## 验收场景

### 1. Skill 提交流程

- [ ] **1.1** 创建一个新 skill 分支，添加合法 `SKILL.md`、`README.md`、`references/`、`examples/`
- [ ] **1.2** 运行 `npm run validate:skills`，确认校验通过
- [ ] **1.3** 提交 PR，CI validate workflow 自动运行并通过
- [ ] **1.4** skill-review workflow 自动运行
  - [ ] TS 预检通过
  - [ ] OpenCode 审核执行
  - [ ] 产出 `EVAL.md`
  - [ ] 产出 `artifacts/skill-review.json`
  - [ ] `EVAL.md` 自动 commit 回 PR 分支（含 `[skip ci]`）
  - [ ] 审核结果自动评论在 PR 上
- [ ] **1.5** 如果审核 `approved`，PR 可合并
- [ ] **1.6** 如果审核 `rejected`，PR 被硬阻断（CI fail）

### 2. Release 部署

- [ ] **2.1** 合并 PR 到 main 后，release workflow 自动执行
- [ ] **2.2** skill tarball 上传到 R2 staging
- [ ] **2.3** skill 元数据导入到 D1 staging
- [ ] **2.4** Worker staging 部署成功

### 3. Web UI

- [ ] **3.1** 浏览器访问 staging URL，首页正常加载
- [ ] **3.2** `/skills` 页面显示已批准的 skill
- [ ] **3.3** `/skills/:name` 详情页显示 skill 信息
- [ ] **3.4** 搜索功能正常（按名称、描述）
- [ ] **3.5** 未批准 skill 不在普通用户视图中显示

### 4. API

- [ ] **4.1** `GET /health` 返回 `{"status":"ok","db":"connected"}`
- [ ] **4.2** `GET /v1/index.json` 返回正确数据
- [ ] **4.3** `GET /v1/skills` 返回分页数据
- [ ] **4.4** `GET /v1/skills/:name` 返回单个 skill
- [ ] **4.5** `GET /v1/search?q=...` 搜索结果正确
- [ ] **4.6** `GET /v1/skills/:name/download?version=...` 下载正常
  - [ ] 返回正确的 tarball
  - [ ] `X-Skill-Sha256` header 存在
  - [ ] 下载记录写入 `download_events`

### 5. 认证与 Token

- [ ] **5.1** 访问 `/auth/login` 显示登录页面
- [ ] **5.2** GitHub OAuth 流程（需要配置 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`）
- [ ] **5.3** 登录后访问 `/settings` 显示用户信息和 token 管理
- [ ] **5.4** 创建 API token，明文只展示一次
- [ ] **5.5** 使用 token 调用 API（Bearer header）成功
- [ ] **5.6** 无 token 调用 API 返回 401
- [ ] **5.7** 撤销 token 后该 token 不可再用

### 6. Admin

- [ ] **6.1** 管理员用户可访问 `/admin` 面板
- [ ] **6.2** 非管理员访问 admin API 返回 403
- [ ] **6.3** Admin 可 approve / reject skill
- [ ] **6.4** Admin 可切换用户管理员状态
- [ ] **6.5** 批准后的 skill 在普通用户 UI 可见

### 7. CLI

- [ ] **7.1** `skillr config set registry <url>` 配置 registry
- [ ] **7.2** `skillr config set token <token>` 配置 token
- [ ] **7.3** `skillr config show` 显示配置
- [ ] **7.4** `skillr search <query>` 搜索 skills
- [ ] **7.5** `skillr info <name>` 查看详情
- [ ] **7.6** `skillr install <name>` 安装到默认目标
- [ ] **7.7** `skillr install <name> --target opencode` 安装到指定平台
- [ ] **7.8** `skillr install <name> --force` 强制覆盖安装
- [ ] **7.9** `skillr list` 列出已安装
- [ ] **7.10** `skillr update` 更新已安装 skills
- [ ] **7.11** `skillr remove <name>` 删除 skill
- [ ] **7.12** 安装后 SKILL.md 存在于目标路径
- [ ] **7.13** SHA-256 校验正确（hash 不匹配时报错）

### 8. D1 Schema 完整性

- [ ] **8.1** 验证 D1 数据库表结构:
  ```sql
  SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
  ```
  应包含: `skills`, `skill_versions`, `skill_reviews`, `download_events`, `users`, `user_tokens`

### 9. 版本不可变性

- [ ] **9.1** 同一版本号不同内容无法导入（SKILL_VERSIONS unique constraint）
- [ ] **9.2** 内容不变版本号也不变时可以更新（UPSERT）

### 10. 安全

- [ ] **10.1** 含明显凭证的 skill 被安全扫描检测
- [ ] **10.2** 路径穿越路径被拒绝
- [ ] **10.3** `.env` 等隐藏文件被检测
- [ ] **10.4** 外部依赖/网络访问 skill 标记为 `needs_manual_review`

## 验收记录

| 日期 | 验收人 | 场景 | 结果 | 备注 |
|------|--------|------|------|------|
| YYYY-MM-DD | @name | 1.1-1.6 | ✅/❌ | |
| YYYY-MM-DD | @name | 2.1-2.4 | ✅/❌ | |
| YYYY-MM-DD | @name | 3.1-3.5 | ✅/❌ | |
| YYYY-MM-DD | @name | 4.1-4.6 | ✅/❌ | |
| YYYY-MM-DD | @name | 5.1-5.7 | ✅/❌ | |
| YYYY-MM-DD | @name | 6.1-6.5 | ✅/❌ | |
| YYYY-MM-DD | @name | 7.1-7.13 | ✅/❌ | |
| YYYY-MM-DD | @name | 8.1-8.2 | ✅/❌ | |
| YYYY-MM-DD | @name | 9.1-9.2 | ✅/❌ | |
| YYYY-MM-DD | @name | 10.1-10.4 | ✅/❌ | |
