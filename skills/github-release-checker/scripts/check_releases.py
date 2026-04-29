#!/usr/bin/env python3
"""
GitHub Release Checker

获取 GitHub 项目在指定版本区间内的所有 release 变更汇总。
输出 Markdown 格式报告或 JSON 结构化数据。

用法:
    python check_releases.py owner/repo <起始版本> <目标版本> [选项]
    python check_releases.py owner/repo <起始版本> [选项]  # 从该版本到最新
    python check_releases.py owner/repo [选项]             # 获取最近 N 个版本

选项:
    --json             输出 JSON 格式（机器可读，用于管道）
    --verbose          输出详细进度和调试信息到 stderr
    --dry-run          仅显示将要执行的 API 请求，不实际调用
    --max-pages N      最大分页数（默认 10）
    --per-page N       每页数量（默认 100，最大 100）
    --include-preleases  包含 prerelease（默认过滤掉）
    --include-drafts   包含 draft release（默认过滤掉）
    --github-token TOKEN  GitHub Personal Access Token（或设 GITHUB_TOKEN 环境变量）

退出码:
    0  成功
    1  参数错误
    2  API 调用失败 / 网络错误
    3  仓库不存在
    4  版本不存在
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime
from typing import Optional

__version__ = "1.0.0"

# ---------------------------------------------------------------------------
# 版本号解析与比较
# ---------------------------------------------------------------------------


def parse_version(tag: str) -> tuple:
    """将版本标签解析为可比较的元组 (major, minor, patch, prerelease_str)。

    支持格式: v1.2.3, 1.2.3, v1.2.3-beta.1, 1.2, v1 等。
    无法解析时返回 (0, 0, 0, tag) 作为兜底。
    """
    cleaned = tag.lstrip("vV")
    # 匹配 semver: major[.minor[.patch]][-prerelease][+build]
    m = re.match(r"^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:[-.+](.+))?", cleaned.strip())
    if not m:
        return (0, 0, 0, tag)

    def part(val: Optional[str]) -> int:
        if val is None or val in ("x", "*"):
            return 0
        return int(val)

    major = part(m.group(1))
    minor = part(m.group(2))
    patch = part(m.group(3))
    prerelease = m.group(4) or ""
    return (major, minor, patch, prerelease)


def tag_in_range(tag: str, start: Optional[str], end: Optional[str]) -> bool:
    """判断 tag 是否在 (start, end] 区间内。

    - 如果有 start 和 end: 排除 start 本身（不含起始版本），包含 end
    - 如果只有 start: 包含所有大于 start 的版本
    - 如果都没有: 全部通过
    - 如果只有 end: 包含所有 ≤ end 的版本
    """
    tag_v = parse_version(tag)
    if start:
        start_v = parse_version(start)
        if tag_v <= start_v:
            return False
    if end:
        end_v = parse_version(end)
        if tag_v > end_v:
            return False
    return True


# ---------------------------------------------------------------------------
# GitHub API 交互
# ---------------------------------------------------------------------------


def validate_repo(repo: str) -> tuple[str, str]:
    """校验 owner/repo 格式，返回 (owner, repo)。"""
    m = re.match(r"^([a-zA-Z0-9][a-zA-Z0-9._-]*)/([a-zA-Z0-9][a-zA-Z0-9._-]*)$", repo)
    if not m:
        print(f"错误: 无效的仓库格式 '{repo}'，应为 owner/repo", file=sys.stderr)
        sys.exit(1)
    return m.group(1), m.group(2)


def make_request(url: str, token: Optional[str], dry_run: bool) -> dict:
    """发送 GET 请求到 GitHub API，返回解析后的 JSON。

    处理速率限制、网络错误、仓库不存在等情况。
    """
    if dry_run:
        print(f"[DRY RUN] GET {url.replace(token or 'TOKEN', '***')}", file=sys.stderr)
        return {}

    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "github-release-checker/1.0")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req) as resp:
            _check_rate_limit(resp)
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 404:
            print(f"错误: 仓库不存在或无权限访问（HTTP {e.code}）", file=sys.stderr)
            sys.exit(3)
        if e.code == 403:
            msg = json.loads(body).get("message", body) if body else str(e)
            if "rate limit" in msg.lower():
                print(f"错误: GitHub API 速率限制已用完。请设置 GITHUB_TOKEN 提高限制。", file=sys.stderr)
            else:
                print(f"错误: 访问被拒绝（HTTP 403）: {msg}", file=sys.stderr)
            sys.exit(2)
        if e.code == 401:
            print(f"错误: 认证失败，请检查 GITHUB_TOKEN 是否正确。", file=sys.stderr)
            sys.exit(2)
        print(f"错误: GitHub API 返回 HTTP {e.code}: {body[:500]}", file=sys.stderr)
        sys.exit(2)
    except urllib.error.URLError as e:
        print(f"错误: 网络请求失败: {e.reason}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError:
        print(f"错误: API 返回非 JSON 响应", file=sys.stderr)
        sys.exit(2)


def _check_rate_limit(resp):
    """检查速率限制头，剩余不足时给出警告（但不中断）。"""
    remaining = resp.headers.get("X-RateLimit-Remaining")
    if remaining and int(remaining) < 10:
        reset_ts = int(resp.headers.get("X-RateLimit-Reset", 0))
        reset_time = datetime.fromtimestamp(reset_ts).strftime("%H:%M:%S") if reset_ts else "未知"
        print(f"警告: API 速率限制即将用完（剩余 {remaining} 次），重置时间 {reset_time}", file=sys.stderr)


# ---------------------------------------------------------------------------
# 数据获取
# ---------------------------------------------------------------------------


def fetch_all_releases(owner: str, repo: str, token: Optional[str],
                       dry_run: bool, max_pages: int, per_page: int,
                       verbose: bool) -> list[dict]:
    """获取仓库的所有 release（分页，按发布时间从旧到新排列）。"""
    all_releases: list[dict] = []

    for page in range(1, max_pages + 1):
        url = f"https://api.github.com/repos/{owner}/{repo}/releases?per_page={per_page}&page={page}"
        if verbose:
            print(f"获取第 {page} 页...", file=sys.stderr)

        page_data = make_request(url, token, dry_run)
        if dry_run:
            print(f"[DRY RUN] 将获取 {per_page} 条 release", file=sys.stderr)
            break

        if not page_data:
            break

        all_releases.extend(page_data)

        if len(page_data) < per_page:
            break

    # 按发布时间升序排列
    all_releases.sort(key=lambda r: r.get("published_at", r.get("created_at", "")))
    return all_releases


def find_release_by_tag(releases: list[dict], tag: str) -> Optional[dict]:
    """在 release 列表中查找指定 tag（大小写不敏感）. """
    tag_lower = tag.strip().lower()
    for r in releases:
        if r.get("tag_name", "").strip().lower() == tag_lower:
            return r
    return None


# ---------------------------------------------------------------------------
# 输出格式化
# ---------------------------------------------------------------------------


def format_markdown(owner: str, repo: str, releases: list[dict],
                    start_tag: Optional[str], end_tag: Optional[str]) -> str:
    """生成 Markdown 格式报告。"""
    lines = [f"# {owner}/{repo} 版本变更报告", ""]

    if end_tag:
        lines.append(f"**目标版本**: `{end_tag}`")

    range_desc_parts = []
    if start_tag:
        range_desc_parts.append(f"`{start_tag}`→`{end_tag or '最新'}`")
    if range_desc_parts:
        lines.append(f"**版本区间**: {', '.join(range_desc_parts)}")
    lines.append(f"**涵盖版本**: {len(releases)} 个")
    lines.append("")
    lines.append("---")
    lines.append("")

    for r in releases:
        tag = r.get("tag_name", "未知")
        name = r.get("name") or tag
        published = r.get("published_at", "")
        if published:
            published = published[:10]
        prerelease = "(prerelease)" if r.get("prerelease") else ""
        draft = "(draft)" if r.get("draft") else ""
        labels = " ".join(filter(None, [prerelease, draft]))
        html_url = r.get("html_url", "")

        lines.append(f"## {tag} {labels}")
        lines.append("")
        lines.append(f"**发布日期**: {published}  ")
        if html_url:
            lines.append(f"**Release 链接**: {html_url}  ")
        if name and name != tag:
            lines.append(f"**标题**: {name}  ")
        lines.append("")

        body = r.get("body", "")
        if body:
            # 截断过长内容
            if len(body) > 8000:
                body = body[:8000] + "\n\n... *(内容过长，已截断，完整内容见链接)*"
            lines.append(body)
            lines.append("")

        lines.append("---")
        lines.append("")

    # 汇总表
    lines.append("## 版本汇总")
    lines.append("")
    lines.append("| 版本 | 日期 | 类型 |")
    lines.append("|------|------|------|")
    for r in releases:
        tag = r.get("tag_name", "")
        published = (r.get("published_at", ""))[:10]
        kind = "正式版"
        if r.get("prerelease"):
            kind = "预发布"
        if r.get("draft"):
            kind = "草稿"
        lines.append(f"| `{tag}` | {published} | {kind} |")

    return "\n".join(lines)


def format_json(owner: str, repo: str, releases: list[dict],
                start_tag: Optional[str], end_tag: Optional[str]) -> str:
    """生成 JSON 格式输出。"""
    output = {
        "repo": f"{owner}/{repo}",
        "range": {"start": start_tag, "end": end_tag},
        "count": len(releases),
        "releases": [
            {
                "tag_name": r.get("tag_name"),
                "name": r.get("name"),
                "published_at": r.get("published_at"),
                "prerelease": r.get("prerelease", False),
                "draft": r.get("draft", False),
                "html_url": r.get("html_url"),
                "body": r.get("body", ""),
                # 精简摘要：取 body 前 200 字符
                "summary": (r.get("body") or "")[:200].replace("\n", " "),
            }
            for r in releases
        ],
    }
    return json.dumps(output, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------


def parse_args() -> dict:
    """解析命令行参数，返回配置字典。"""
    args = sys.argv[1:]
    config = {
        "repo": None,
        "start_tag": None,
        "end_tag": None,
        "json_output": False,
        "verbose": False,
        "dry_run": False,
        "max_pages": 10,
        "per_page": 100,
        "include_prereleases": False,
        "include_drafts": False,
        "token": os.environ.get("GITHUB_TOKEN"),
    }

    i = 0
    positional: list[str] = []
    while i < len(args):
        arg = args[i]
        if arg == "--json":
            config["json_output"] = True
        elif arg == "--verbose":
            config["verbose"] = True
        elif arg == "--dry-run":
            config["dry_run"] = True
        elif arg == "--include-prereleases":
            config["include_prereleases"] = True
        elif arg == "--include-drafts":
            config["include_drafts"] = True
        elif arg == "--max-pages":
            i += 1
            try:
                config["max_pages"] = int(args[i])
            except (IndexError, ValueError):
                print("错误: --max-pages 需要数字参数", file=sys.stderr)
                sys.exit(1)
        elif arg == "--per-page":
            i += 1
            try:
                val = int(args[i])
                if val < 1 or val > 100:
                    print("错误: --per-page 必须在 1-100 之间", file=sys.stderr)
                    sys.exit(1)
                config["per_page"] = val
            except (IndexError, ValueError):
                print("错误: --per-page 需要数字参数", file=sys.stderr)
                sys.exit(1)
        elif arg == "--github-token":
            i += 1
            try:
                config["token"] = args[i]
            except IndexError:
                print("错误: --github-token 需要参数", file=sys.stderr)
                sys.exit(1)
        elif arg in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        elif arg.startswith("-"):
            print(f"错误: 未知选项 {arg}，使用 --help 查看帮助", file=sys.stderr)
            sys.exit(1)
        else:
            positional.append(arg)
        i += 1

    if len(positional) == 0:
        print("错误: 缺少参数，至少需要 owner/repo。使用 --help 查看帮助。", file=sys.stderr)
        sys.exit(1)

    config["repo"] = positional[0]
    if len(positional) >= 2:
        config["start_tag"] = positional[1]
    if len(positional) >= 3:
        config["end_tag"] = positional[2]

    return config


def main():
    config = parse_args()
    owner, repo_name = validate_repo(config["repo"])
    token = config["token"]

    if config["verbose"]:
        auth_status = "已认证" if token else "未认证（速率限制较低）"
        print(f"仓库: {owner}/{repo_name}", file=sys.stderr)
        print(f"认证: {auth_status}", file=sys.stderr)
        print(f"起始版本: {config['start_tag'] or '全部'}", file=sys.stderr)
        print(f"目标版本: {config['end_tag'] or '最新'}", file=sys.stderr)

    # 获取所有 release
    releases = fetch_all_releases(
        owner=owner, repo=repo_name, token=token,
        dry_run=config["dry_run"], max_pages=config["max_pages"],
        per_page=config["per_page"], verbose=config["verbose"],
    )

    if config["dry_run"]:
        sys.exit(0)

    if not releases:
        print(f"错误: 仓库 {owner}/{repo_name} 没有任何 release。", file=sys.stderr)
        sys.exit(4)

    # 验证指定的版本是否存在
    start_tag = config["start_tag"]
    end_tag = config["end_tag"]

    if start_tag and not find_release_by_tag(releases, start_tag):
        _available = [r["tag_name"] for r in releases[:10]]
        print(f"错误: 起始版本 '{start_tag}' 不存在。", file=sys.stderr)
        print(f"可用版本（前 10 个）: {', '.join(_available)}", file=sys.stderr)
        sys.exit(4)

    if end_tag and not find_release_by_tag(releases, end_tag):
        _available = [r["tag_name"] for r in releases[:10]]
        print(f"错误: 目标版本 '{end_tag}' 不存在。", file=sys.stderr)
        print(f"可用版本（前 10 个）: {', '.join(_available)}", file=sys.stderr)
        sys.exit(4)

    # 如果只指定了 end_tag 而没有 start_tag，则取该版本之前的所有版本
    # 如果只指定了 start_tag 而没有 end_tag，则取该版本（不含）之后的所有版本
    # 如果两者都没有，返回最近的 release（由 per_page 和 max_pages 决定）

    filtered: list[dict] = []
    all_tags = [r["tag_name"] for r in releases]

    # 构建过滤后的列表
    include = False
    for r in releases:
        tag = r["tag_name"]

        # 过滤 draft / prerelease
        if r.get("draft") and not config["include_drafts"]:
            continue
        if r.get("prerelease") and not config["include_prereleases"]:
            continue

        if start_tag:
            # 找到 start_tag 之前不包含，之后开始包含（不含 start 自身）
            if tag.lower() == start_tag.lower():
                include = True
                continue
            if not include:
                continue

        if end_tag and tag.lower() == end_tag.lower():
            filtered.append(r)
            break

        filtered.append(r)

        if end_tag and len(filtered) > 0 and filtered[-1]["tag_name"].lower() == end_tag.lower():
            break

    if not filtered:
        if start_tag and end_tag:
            print(f"错误: 在 {start_tag} 和 {end_tag} 之间没有找到任何 release。", file=sys.stderr)
        elif start_tag:
            print(f"错误: {start_tag} 之后没有找到任何 release。", file=sys.stderr)
        else:
            print(f"错误: 没有符合条件的 release。", file=sys.stderr)
        sys.exit(4)

    if config["verbose"]:
        print(f"找到 {len(filtered)} 个符合条件的 release", file=sys.stderr)
        for r in filtered:
            print(f"  - {r['tag_name']} ({r.get('published_at', '')[:10]})", file=sys.stderr)

    # 输出结果
    if config["json_output"]:
        output = format_json(owner, repo_name, filtered, start_tag, end_tag)
    else:
        output = format_markdown(owner, repo_name, filtered, start_tag, end_tag)

    print(output)


if __name__ == "__main__":
    main()
