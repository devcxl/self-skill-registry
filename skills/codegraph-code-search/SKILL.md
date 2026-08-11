---
name: codegraph-code-search
description: Use the CodeGraph CLI to search and navigate a local codebase structurally. Use it when locating symbols, understanding implementation flows, tracing callers/callees, inspecting source around a symbol, estimating change impact, browsing project structure, or finding affected tests. Prefer CodeGraph for symbol relationships and call paths; use direct file reads or text search for exact literal text or content outside the index.
version: 1.0.0
compatibility:
  - opencode
  - claude-code
  - codex
---

# CodeGraph Code Search

Use CodeGraph as the primary structural code-search tool when the repository contains a `.codegraph/` index or can be initialized safely.

## Core rule

Start with the smallest CodeGraph command that answers the question. For broad behavioral or architectural questions, default to `codegraph explore` because it returns relevant source and call paths together.

Do not repeatedly run a full `codegraph index`. Use incremental sync when freshness is needed.

## Before searching

1. Work from the repository root whenever possible.
2. Check whether `.codegraph/` exists.
3. If it does not exist and indexing the repository is appropriate, run:

```bash
codegraph init
```

4. If this agent is using CodeGraph only through the CLI and no CodeGraph MCP/file watcher is active, run one incremental refresh at the beginning of a search task or after code edits:

```bash
codegraph sync --quiet
```

Do not run `sync` before every individual query.

## Command selection

| Need | Command |
|---|---|
| Understand how a feature/flow works | `codegraph explore "<question>"` |
| Find a symbol by name | `codegraph query "<name>"` |
| Inspect one symbol or file | `codegraph node <symbol-or-file>` |
| Find what calls a symbol | `codegraph callers <symbol>` |
| Find what a symbol calls | `codegraph callees <symbol>` |
| Estimate blast radius of a change | `codegraph impact <symbol>` |
| Browse repository structure | `codegraph files` |
| Find tests affected by changed files | `codegraph affected <files...>` |
| Check graph/index health | `codegraph status` |

## Search workflow

### 1. Broad question: use `explore`

Use for questions such as:

- How does authentication work?
- How does request X reach service Y?
- Where is order creation implemented?
- Trace the payment callback flow.
- What code participates in configuration loading?

```bash
codegraph explore "how does order creation flow from the controller to persistence"
```

Treat the returned source and call paths as the initial map of the implementation.

### 2. Resolve ambiguous symbols with `query`

If `explore` surfaces several similarly named symbols, or the user asks for a specific class/function, search explicitly:

```bash
codegraph query UserService --kind class --limit 10
codegraph query createOrder --kind method --limit 20
```

Use `--json` when machine-readable output is useful:

```bash
codegraph query createOrder --json
```

Do not guess a fully-qualified symbol when CodeGraph can resolve it first.

### 3. Read the selected symbol or file with `node`

```bash
codegraph node createOrder
codegraph node src/main/java/com/example/order/OrderService.java
```

File mode can also be explicit:

```bash
codegraph node -f src/main/java/com/example/order/OrderService.java
```

Use this after locating the relevant symbol when exact source context is needed.

### 4. Trace relationships only as needed

Who calls it:

```bash
codegraph callers createOrder --limit 30
```

What it calls:

```bash
codegraph callees createOrder --limit 30
```

Blast radius:

```bash
codegraph impact createOrder --depth 3
```

Prefer `explore` first for a complete behavioral question; use these narrower commands for verification or focused follow-up.

### 5. Inspect structure before guessing paths

```bash
codegraph files --max-depth 4
```

Use `--filter`, `--pattern`, or `--json` when appropriate. If an option's accepted value is uncertain, run `codegraph help files` rather than inventing it.

### 6. Find affected tests after a change

```bash
codegraph affected src/main/java/com/example/order/OrderService.java
```

For a Git diff:

```bash
git diff --name-only | codegraph affected --stdin
```

Use `--quiet` when only file paths are needed by another command.

## Freshness and correctness

- `codegraph init` creates `.codegraph/` and builds the initial graph.
- `codegraph index` is a full rebuild; avoid it during normal search.
- `codegraph sync` is incremental and is the CLI-only freshness fallback.
- If a CodeGraph response reports a stale/pending file, read that file directly from disk before making claims about its current contents.
- CodeGraph is based on static analysis. Some dynamic-dispatch relationships may be heuristic. Verify critical behavior against source when the answer depends on runtime behavior.

## When not to use CodeGraph alone

Use direct file reading or text search instead when:

- searching for an exact string, log message, SQL fragment, config value, or comment;
- reading a known file whose current contents matter more than graph relationships;
- the file is excluded from the index, gitignored, unsupported, generated, or larger than the indexing limit;
- CodeGraph returns no useful symbol and the target may not be represented structurally.

A good pattern is: text search discovers an exact literal; CodeGraph then explains the structural relationships around the discovered symbol.

## Failure handling

If results appear missing or stale:

```bash
codegraph status
```

Then check, in order:

1. `.codegraph/` exists.
2. Run `codegraph sync --quiet` for CLI-only use.
3. Confirm the target file is a supported source file and not excluded.
4. Check `.gitignore` and `codegraph.json`.
5. If the index genuinely needs rebuilding, use `codegraph index`.
6. If indexing is blocked by a stale lock, use `codegraph unlock` only after confirming no valid indexing process is running.

## Output discipline

When reporting findings to the user:

1. Name the entry symbol or file.
2. State the relevant call/dependency path.
3. Cite concrete file paths and symbol names from the command output.
4. Distinguish graph-inferred relationships from source-confirmed behavior when that distinction matters.
5. Do not claim runtime behavior that static graph evidence cannot establish.

For the complete command reference and node/edge kinds, read `references/cli-reference.md`.
