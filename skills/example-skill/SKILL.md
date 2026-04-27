---
name: example-skill
description: An example skill for testing the Skill Registry pipeline. Demonstrates the standard directory structure and frontmatter format that all skills must follow.
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - example
  - testing
category: utilities
metadata:
  language: en
  license: MIT
  author: devcxl
---

# Example Skill

This is a test fixture skill used to validate the Skill Registry build pipeline.

## Purpose

Verify that the registry can:

1. Parse SKILL.md frontmatter correctly
2. Validate name/description/version/compatibility
3. Build a manifest
4. Pack and unpack the skill directory
5. Run security checks

## Usage

Load this skill into your AI coding agent for demonstration purposes.

## References

See [references/api-example.md](references/api-example.md) for API usage examples.

## Examples

See [examples/basic-usage.md](examples/basic-usage.md) for usage examples.

## Scripts

Helper scripts in the `scripts/` directory.
