/**
 * Post the AI review status comment to the PR.
 * Usage: tsx scripts/post-review-comment.ts
 *
 * Env:
 *   GITHUB_TOKEN      — token for the GitHub API (github.token)
 *   REVIEW_STATUS     — approved | needs_manual_review | rejected | workflow_error
 *   PR_NUMBER         — pull request number to comment on
 *   GITHUB_REPOSITORY — "owner/repo" (auto-provided by GitHub Actions)
 *
 * Reads artifacts/skill-review.json for the score summary, then POSTs
 * a comment via the Issues API. Never fails the workflow (safe under if: always()).
 */

import { readFileSync } from 'node:fs';

const API_VERSION = '2022-11-28';

function emojiFor(status: string): string {
  if (status === 'approved') return '✅';
  if (status === 'rejected') return '❌';
  return '⚠️';
}

function buildBody(status: string): string {
  let body = `${emojiFor(status)} **AI Skill Review: ${status}**\n\n`;

  try {
    const summary = JSON.parse(readFileSync('artifacts/skill-review.json', 'utf-8'));
    body += `**Score:** ${summary.totalScore}/100\n\n`;
    body += `**Summary:** ${summary.summary}\n\n`;
    if (Array.isArray(summary.findings) && summary.findings.length > 0) {
      body += `### Findings (${summary.findings.length})\n`;
      for (const f of summary.findings.slice(0, 10)) {
        body += `- **${f.priority}** [${f.criterion}] ${f.description}\n`;
      }
    }
  } catch {
    body += 'OpenCode review did not produce artifacts/skill-review.json. This usually means an upstream workflow error occurred before the report was generated (for example: permission checks, token mode mismatch, or action runtime failure).\n';
  }

  if (status === 'rejected') {
    body += '\n> 🚫 **This skill is rejected and cannot be merged.** Fix the issues above and resubmit.';
  } else if (status === 'needs_manual_review') {
    body += '\n> ⚠️ **This skill requires manual admin review.** An administrator must approve before publishing.';
  }

  return body;
}

async function main(): Promise<void> {
  const status = process.env.REVIEW_STATUS ?? 'workflow_error';
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '/').split('/');

  if (!token || !prNumber || !owner || !repo) {
    console.error('❌ Missing required env: GITHUB_TOKEN, PR_NUMBER, GITHUB_REPOSITORY');
    process.exit(1);
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': 'skill-review-bot',
      },
      body: JSON.stringify({ body: buildBody(status) }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error(`❌ Failed to post comment (${res.status}): ${detail}`);
    process.exit(1);
  }

  console.log(`✅ Review comment posted (status=${status})`);
}

main();
