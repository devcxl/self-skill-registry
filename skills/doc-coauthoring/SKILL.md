---
name: doc-coauthoring
description: Guide users through co-authoring a substantial structured document such as a proposal, spec, RFC, PRD, or decision doc. Trigger only when the user needs a staged writing workflow from context gathering through drafting and reader validation; do not use for small edits, proofreading, translation, or generic Q&A.
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
tags:
  - doc
category: utilities
metadata:
  language: en
  license: MIT
  author: devcxl
---

# Doc Co-Authoring

## Purpose
Use this skill to co-author a substantial structured document through a three-stage workflow: gather context, draft section by section, then test whether the document works for readers.

## Use When
- The user wants to write a proposal, spec, RFC, PRD, design doc, decision doc, or similar structured document
- The document is still being shaped, not just lightly edited
- The user would benefit from guided iteration instead of one-shot drafting

## Do Not Use When
- The task is a small edit, proofreading pass, translation, polishing, or summarization
- The user only wants a template, outline, or a single section answered quickly
- The task is general Q&A rather than collaborative document writing

## Inputs
- Document type, audience, desired outcome, and constraints
- Existing template, shared doc, file, or notes if available
- Any project context, trade-offs, decisions, and background material

## Workflow

### 1. Offer the workflow
- Briefly offer the three stages: context gathering, section drafting, reader testing
- Ask whether the user wants the staged workflow or prefers to work freeform
- If the user declines, exit the workflow and help normally

### 2. Stage 1: Context gathering
- Ask for the basics: document type, audience, desired impact, template, and constraints
- Invite the user to dump context in any format
- If they provide files, links, or shared docs, read them when tools allow; otherwise ask them to paste the relevant content
- If they mention unknown entities or projects, ask before searching connected tools
- If editing an existing doc, check whether important images lack alt text and offer help generating it
- After the initial dump, ask 5-10 numbered clarification questions based on gaps
- Before exiting, verify the user has provided at minimum: (a) who the target reader is, (b) what core problem or decision the document addresses, and (c) any hard constraints (deadline, format, reviewers). If any are missing, ask explicitly.
- Exit this stage once trade-offs and edge cases can be discussed without re-explaining the basics

### 3. Stage 2: Refinement and structure
- Confirm the document structure; if none exists, propose 3-5 suitable sections
- If the skill directory contains useful templates in `references/`, prefer reusing them over inventing a structure from scratch
- Create a scaffold in an artifact or markdown file with placeholders for every section
- Work section by section:
  1. Ask focused clarification questions
  2. Brainstorm possible points to include
  3. Ask the user what to keep, remove, or combine
  4. Draft the section into the document
  5. Refine with targeted edits until the section is solid
- If tooling supports surgical edits, update the existing document instead of reprinting the whole thing
- Near completion, reread the full document and check for flow, redundancy, contradictions, and filler

### 4. Stage 3: Reader testing
- Predict 5-10 realistic reader questions the document should answer
- If fresh sub-agents are available, test those questions with a fresh reader and separately check for ambiguity, false assumptions, and contradictions
- If sub-agents are not available, use the [reader testing reference](references/reader-testing-example.md) to guide the user through a manual test
- Summarize what the reader got wrong, found unclear, or assumed implicitly
- Loop back to the affected sections until the document answers the questions cleanly

### 5. Final review
- Ask the user to do one final owner read-through
- Recommend checking facts, links, and technical details
- Confirm whether they want one more refinement pass or consider the document complete

## Outputs
- A document scaffold or working draft
- Refined section content based on user choices
- A reader-test issue list and corresponding fixes
- A final document ready for human review

## Constraints
- Be direct and procedural; do not oversell the workflow
- Preserve user agency: allow skipping stages or switching to freeform at any time
- Prefer existing templates, files, and shared documents over inventing structure
- Use artifacts or files for document state; keep brainstorming in the chat
- Optimize for clarity and reader usefulness, not speed alone
