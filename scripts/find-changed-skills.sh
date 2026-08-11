#!/usr/bin/env bash
#
# Find the single skill changed in this PR.
# Usage: bash scripts/find-changed-skills.sh <base-ref>
#
# Prints the skill name (e.g. "value-trap-detector") to stdout.
# Exits 1 if zero or multiple skills were changed under skills/.
set -euo pipefail

BASE_REF="$1"

# Fetch base branch to ensure it's available for the diff
git fetch origin "$BASE_REF" --depth=1 >/dev/null 2>&1

# Get list of changed directories under skills/
SKILLS=$(git diff --name-only "origin/$BASE_REF...HEAD" |
  grep '^skills/' |
  cut -d'/' -f2 |
  sort -u |
  grep -v '^$' || true)

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

echo "✅ Single skill PR: $SKILLS"
echo "$SKILLS"
