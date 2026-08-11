#!/usr/bin/env bash
#
# Find the single skill changed in this PR.
# Usage: bash scripts/find-changed-skills.sh <base-ref>
#
# Prints the skill name (e.g. "value-trap-detector") to stdout.
# Exits 1 if zero or multiple skills were changed under skills/.
set -euo pipefail

BASE_REF="${1:-main}"

# NOTE: Do NOT shallow-fetch the base branch here. actions/checkout already
# fetched all branches with fetch-depth: 0, and `fetch --depth=1` would
# truncate history, breaking `git diff base...HEAD` ("no merge base") when
# the remote base has moved past the PR's merge-base.

# Get list of changed directories under skills/ (PR-only changes: three-dot diff)
if git merge-base "origin/$BASE_REF" HEAD >/dev/null 2>&1; then
  SKILLS=$(git diff --name-only "origin/$BASE_REF...HEAD" |
    grep '^skills/' |
    cut -d'/' -f2 |
    sort -u |
    grep -v '^$' || true)
else
  # No merge base (edge case, e.g. re-run after the base moved): fall back to
  # the last commit's changes so bot-triggered re-runs still resolve the skill.
  echo "⚠️  No merge base with origin/$BASE_REF; comparing last commit only" >&2
  SKILLS=$(git diff-tree --name-only -r --root --no-commit-id HEAD |
    grep '^skills/' |
    cut -d'/' -f2 |
    sort -u |
    grep -v '^$' || true)
fi

# Count non-empty lines (handles empty SKILLS correctly)
COUNT=$(echo "$SKILLS" | grep -c . || true)

if [ "$COUNT" -gt 1 ]; then
  echo "❌ Multiple skills changed in this PR: $SKILLS" >&2
  echo "Each PR must contain exactly ONE skill change." >&2
  exit 1
fi

if [ "$COUNT" -eq 0 ] || [ -z "$SKILLS" ]; then
  echo "No skill changes detected in skills/ directory." >&2
  echo "Make sure your PR adds files under skills/<name>/" >&2
  exit 1
fi

# stdout must contain ONLY the skill name — it is captured by the workflow
# via $(...) and written to $GITHUB_ENV. Diagnostics go to stderr.
echo "✅ Single skill PR: $SKILLS" >&2
echo "$SKILLS"
