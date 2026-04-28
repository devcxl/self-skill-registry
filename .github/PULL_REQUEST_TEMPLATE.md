## Summary

<!-- Brief description of the skill being added/updated -->

**Skill Name:** `skill-name`
**Version:** `x.y.z`

## Checklist

- [ ] One skill per PR (only one skill modified)
- [ ] `SKILL.md` frontmatter is complete and valid
  - [ ] `name` matches directory name (`^[a-z0-9]+(-[a-z0-9]+)*$`)
  - [ ] `description` is clear and descriptive
  - [ ] `version` follows semver
  - [ ] `compatibility` lists supported platforms (opencode / claude-code / codex)
- [ ] `README.md` explains the skill's purpose and usage
- [ ] `references/` and `examples/` are provided and relevant
- [ ] Scripts are safe and documented (no hardcoded credentials)
- [ ] No `.env`, credential, or secret files included
- [ ] Run `npm run validate:skills` locally and confirmed it passes
- [ ] Passed CI validate workflow

## Security

- [ ] No credentials, API keys, or tokens in code
- [ ] No path traversal or file system abuse
- [ ] External network access: ☐ None ☐ GitHub only ☐ Other (requires `needs_manual_review`)
- [ ] External dependencies: ☐ None ☐ Standard libraries only ☐ Third-party (requires `needs_manual_review`)

## Review

After this PR is submitted, the AI review system will:
1. Run automated pre-checks (frontmatter, security)
2. Run the skill-evaluator via OpenCode
3. Produce `EVAL.md` and `artifacts/skill-review.json`
4. Comment the review summary on this PR

If the review status is `rejected`, this PR will be blocked from merging.
If `needs_manual_review`, an admin must approve before the skill is published.

## Additional Notes

<!-- Any context the reviewers should know -->
