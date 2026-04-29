---
name: github-release-checker
description: 当用户询问某个 GitHub 项目在两个版本之间的变更、进展、更新内容时使用。通过调用 GitHub API 获取指定版本范围内的所有 release 信息并汇总报告。触发场景包括：用户说"XX 项目从 v1.0 到 v2.0 有什么变化"、"XX 项目在 v1.2 和 v1.5 之间有哪些更新"、"XX 项目最近几个版本的变更汇总"等。
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - doc
category: utilities
metadata:
  language: cn
  license: MIT
  author: devcxl
---

# GitHub Release Checker

## 工作流程

1. **解析用户请求**：提取 GitHub 项目名（`owner/repo`）、起始版本、目标版本
2. **获取版本列表**：调用 GitHub API 获取该项目的所有 releases，按时间排序
3. **筛选版本范围**：过滤出起始版本到目标版本之间的所有 releases
4. **汇总变更内容**：解析每个 release 的 `tag_name`、`published_at`、`body`
5. **生成报告**：按版本时间顺序汇总输出

## API 调用

获取所有 releases（按发布时间倒序）：
```bash
curl "https://api.github.com/repos/{owner}/{repo}/releases?per_page=100&page=1"
```

获取指定 tag 的 release：
```bash
curl https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag_name}
```

## 版本范围匹配逻辑

- 用户可能说"从 v1.0 到 v2.0"、"从 1.0 到 2.0"、"从 xxx版本到xxx版本"
- 需要识别版本号格式（v 前缀、有无等）
- 如果只指定一个版本，则获取该版本之后的所有 releases
- 如果版本不存在，给出提示并列出可用版本

## 输出报告格式

```
# {项目名} 版本变更报告

## 版本范围：{起始版本} → {目标版本}
## 涵盖版本：{版本数量} 个

---

## {版本号} ({发布日期})

### 新增功能
- ...

### Bug 修复
- ...

### 其他变更
- ...

---

## 版本趋势总结

| 版本 | 日期 | 主要变化 |
|------|------|----------|
```

## 注意事项

- GitHub API 速率限制：未认证请求每小时 60 次
- 某些项目可能使用 prerelease 或 draft release，按需过滤
- 如果版本范围跨越太久远，可能需要分页获取（增加 page 参数）
