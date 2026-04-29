---
name: github-release-checker
description: >
  Use when the user asks about changes between GitHub releases,
  wants to know what changed from one version to another,
  or needs a release changelog summary.
  Works by calling GitHub API via bundled scripts to fetch and summarize releases between two tags.
  Triggers on phrases like: 项目从 v1.0 到 v2.0 有什么变化,
  版本之间有哪些更新, what's new in releases,
  release changelog, list releases between tags.
---

# GitHub Release Checker

获取 GitHub 项目在指定版本区间内的所有 release，生成变更汇总报告。

## 快速开始

使用内置脚本获取版本变更：

```bash
python3 scripts/check_releases.py owner/repo <起始版本> <目标版本>
```

**常用命令：**

```bash
# 两个版本之间的变更
python3 scripts/check_releases.py facebook/react v18.0.0 v18.2.0

# 某一版本之后的所有 release（到最新）
python3 scripts/check_releases.py kubernetes/kubernetes v1.28.0

# 机器可读的 JSON 输出（用于管道/后续处理）
python3 scripts/check_releases.py facebook/react v18.0.0 v18.2.0 --json

# 包含 prerelease 版本
python3 scripts/check_releases.py facebook/react v18.0.0 v18.3.0 --include-prereleases

# 预览要发送的 API 请求（不实际调用）
python3 scripts/check_releases.py facebook/react v18.0.0 v18.2.0 --dry-run
```

## 工作流程

1. **解析输入** — 提取 owner/repo、起始和目标版本号
2. **获取版本列表** — 通过 GitHub API 分页拉取所有 release，按发布时间排序
3. **筛选** — 过滤 draft/prerelease（可通过 flag 覆盖），定位版本区间
4. **生成报告** — Markdown 格式（默认）或 JSON 格式（--json）

## 选项速查

| 选项 | 说明 |
|------|------|
| `--json` | 输出 JSON，用于管道和后续处理 |
| `--verbose` | 输出详细进度到 stderr（不污染 stdout） |
| `--dry-run` | 仅显示将要发送的请求，不实际调用 API |
| `--max-pages N` | 最大分页数，默认 10 |
| `--per-page N` | 每页数量（1-100），默认 100 |
| `--include-prereleases` | 包含预发布版本 |
| `--include-drafts` | 包含草稿 release |
| `--github-token TOKEN` | GitHub PAT（或设置 `GITHUB_TOKEN` 环境变量） |

## 输出格式

### Markdown（默认）

标准输出包含：版本区间、每个 release 的详细信息（发布日期、变更内容）、版本汇总表。

### JSON（--json）

```json
{
  "repo": "owner/repo",
  "range": {"start": "v1.0.0", "end": "v2.0.0"},
  "count": 3,
  "releases": [
    {
      "tag_name": "v1.1.0",
      "name": "Release Title",
      "published_at": "2024-01-15T10:00:00Z",
      "prerelease": false,
      "draft": false,
      "html_url": "https://...",
      "body": "...",
      "summary": "前 200 字符摘要..."
    }
  ]
}
```

## 注意事项

- 未认证请求限速 60 次/小时。推荐设置 `GITHUB_TOKEN` 环境变量提高到 5000 次/小时
- 版本号支持 v 前缀（如 `v1.2.3`）和无前缀（`1.2.3`）两种格式
- 默认过滤 draft 和 prerelease，使用 `--include-prereleases` / `--include-drafts` 覆盖
- 每页最多 100 条，跨越大范围版本时自动分页
- 请求均为只读 GET，可安全重复执行
