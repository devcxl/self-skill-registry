#!/usr/bin/env bash
# 将 target_hash（含）之前的历史压缩为一个新的根提交，再顺序 cherry-pick 之后的提交。
#
# 用法:
#   bash merge-history.sh <target_hash> <merged_message> [source_branch]
#
# 参数:
#   target_hash      边界提交 hash（该提交及之前历史将被压缩）
#   merged_message   新根提交的提交信息
#   source_branch    待处理分支（默认为当前分支）

set -euo pipefail

target_hash="${1:?请提供 target_hash}"
merged_message="${2:?请提供 merged_message}"
source_branch="${3:-$(git symbolic-ref --short HEAD)}"

# ── 前置检查 ──────────────────────────────────────────────────────────────────

git diff --quiet && git diff --cached --quiet || {
  echo "错误：工作区不干净，请先提交或 stash" >&2
  exit 1
}

git rev-parse --verify "${target_hash}^{commit}" >/dev/null 2>&1 || {
  echo "错误：target_hash 不存在: $target_hash" >&2
  exit 1
}

git merge-base --is-ancestor "$target_hash" "$source_branch" 2>/dev/null || {
  echo "错误：target_hash 不在分支 $source_branch 的历史中" >&2
  exit 1
}

if git rev-list --merges "${target_hash}..${source_branch}" | grep -q .; then
  echo "错误：target_hash 之后存在 merge commit，需要人工处理" >&2
  exit 2
fi

# ── 备份 ──────────────────────────────────────────────────────────────────────

backup_branch="backup-before-merge-$(date +%Y%m%d%H%M%S)"
git branch "$backup_branch"
echo "已创建备份分支: $backup_branch"

# ── 创建新历史 ────────────────────────────────────────────────────────────────

short_hash=$(git rev-parse --short "$target_hash")
will_merge_branch="will-merge-$short_hash"
base_branch="base-$short_hash"

# 从 target_hash 建临时分支（工作区切换到该快照）
git branch -f "$will_merge_branch" "$target_hash"
git switch "$will_merge_branch"

# 创建孤儿分支，工作区保持 target_hash 的文件树
git switch --orphan "$base_branch"

# 直接基于当前工作树创建新的根提交
git add -A
git commit -m "$merged_message"

# ── 回放后续提交 ──────────────────────────────────────────────────────────────

for commit in $(git rev-list --reverse "${target_hash}..${source_branch}"); do
  git cherry-pick "$commit" || {
    echo "cherry-pick 失败: $commit" >&2
    echo "执行 git cherry-pick --abort 后可切回备份分支: git switch $backup_branch" >&2
    exit 3
  }
done

# ── 完成 ──────────────────────────────────────────────────────────────────────

echo ""
echo "✓ 完成"
echo "  新分支: $base_branch"
echo "  备份分支: $backup_branch"
echo ""
echo "验证命令:"
echo "  git log --oneline --decorate"
echo "  git diff $target_hash \$(git rev-list --max-parents=0 HEAD)"
echo ""
echo "若验证通过，可用以下命令替换原分支:"
echo "  git branch -f $source_branch $base_branch"
echo "  git switch $source_branch"
echo "  git push --force-with-lease"
