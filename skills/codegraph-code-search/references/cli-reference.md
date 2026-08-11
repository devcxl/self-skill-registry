# CodeGraph CLI Reference for Agents

Source documentation:

- https://colbymchenry.github.io/codegraph/reference/cli/
- https://colbymchenry.github.io/codegraph/core-concepts/how-it-works/
- https://colbymchenry.github.io/codegraph/core-concepts/knowledge-graph/
- https://colbymchenry.github.io/codegraph/guides/indexing/
- https://colbymchenry.github.io/codegraph/getting-started/configuration/
- https://github.com/colbymchenry/codegraph

Use `codegraph help <command>` as the source of truth for the installed version when this reference and the local CLI differ.

## Main commands

```text
codegraph                         Run interactive installer
codegraph install                 Configure supported local agents
codegraph uninstall               Remove CodeGraph agent integration

codegraph init [path]             Initialize project and build graph
codegraph uninit [path]           Remove CodeGraph from project
codegraph index [path]            Full re-index
codegraph sync [path]             Incremental update
codegraph status [path]           Show graph/index statistics
codegraph unlock [path]           Remove stale indexing lock

codegraph query <search>          Search symbols
codegraph explore <query>         Relevant source + call paths
codegraph node <symbol|file>      Inspect symbol or read file
codegraph files [path]            Show file structure
codegraph callers <symbol>        Direct callers
codegraph callees <symbol>        Direct callees
codegraph impact <symbol>         Transitive change impact
codegraph affected [files...]     Tests affected by changed files

codegraph daemon                  Manage background daemons
codegraph telemetry [on|off]      Show/change telemetry setting
codegraph upgrade [version]       Upgrade CodeGraph
codegraph version                 Show installed version
codegraph help [command]          Show help
```

## `query`

Purpose: locate symbols by name using the graph's full-text symbol search.

Documented options:

```text
--kind <kind>     Filter by node kind
--limit <n>       Limit results
--json            Machine-readable output
```

Example:

```bash
codegraph query UserService --kind class --limit 10
codegraph query handleRequest --json
```

JSON output includes the raw ranking score; treat it as an ordering signal, not a percentage.

## `explore`

Purpose: answer a broad code question in one call. It returns relevant symbols' source grouped by file plus call paths/relationships between them.

Examples:

```bash
codegraph explore "how does authentication work"
codegraph explore "trace CheckoutController to PaymentService"
codegraph explore "where is retry policy applied to outgoing requests"
```

Use `explore` as the default for architectural, behavioral, or end-to-end flow questions.

## `node`

Purpose: inspect one symbol's source and relationships, or read a file with line numbers.

Examples:

```bash
codegraph node parseToken
codegraph node src/auth.ts
codegraph node -f src/auth.ts
```

Use it after identifying the exact symbol/file whose implementation needs inspection.

## `files`

Purpose: inspect project file structure without guessing paths.

Documented options include:

```text
--format
--filter
--pattern
--max-depth
--json
```

Example:

```bash
codegraph files --max-depth 4
```

Because accepted option values can change, use:

```bash
codegraph help files
```

before supplying a value not already known from the current environment.

## `callers`

Purpose: find direct callers of a function/method.

Documented options:

```text
--limit <n>
--json
```

Example:

```bash
codegraph callers handleRequest --limit 30 --json
```

## `callees`

Purpose: find what a function/method directly calls.

Documented options:

```text
--limit <n>
--json
```

Example:

```bash
codegraph callees handleRequest --limit 30 --json
```

## `impact`

Purpose: traverse outward from a symbol to estimate change blast radius.

Documented options:

```text
--depth <n>
--json
```

Example:

```bash
codegraph impact AuthMiddleware --depth 3 --json
```

Use this for change planning and risk assessment, not as proof that every affected runtime behavior will execute.

## `affected`

Purpose: trace import dependencies transitively and identify test files affected by changed source files.

Examples:

```bash
codegraph affected src/utils.ts src/api.ts
git diff --name-only | codegraph affected --stdin
codegraph affected src/auth.ts --filter "e2e/*"
```

Options documented in the project README:

| Option | Meaning | Default |
|---|---|---|
| `--stdin` | Read changed file list from stdin | false |
| `-d, --depth <n>` | Maximum dependency traversal depth | 5 |
| `-f, --filter <glob>` | Glob identifying test files | auto-detect |
| `-j, --json` | JSON output | false |
| `-q, --quiet` | File paths only | false |

Typical automation:

```bash
AFFECTED=$(git diff --name-only HEAD | codegraph affected --stdin --quiet)
if [ -n "$AFFECTED" ]; then
  npx vitest run $AFFECTED
fi
```

## Index lifecycle

### Initialize

```bash
codegraph init
```

Creates `.codegraph/` and performs the initial full graph build.

### Full rebuild

```bash
codegraph index
codegraph index --force
```

Use only when a real rebuild is needed, for example after relevant index configuration changes or suspected index corruption.

### Incremental refresh

```bash
codegraph sync
codegraph sync --quiet
```

Use this as the normal freshness operation when working through CLI only.

### Status

```bash
codegraph status
codegraph status --json
```

Use to inspect index health/statistics before escalating to a rebuild.

## Node kinds

Valid graph node kinds documented by CodeGraph:

```text
file
module
class
struct
interface
trait
protocol
function
method
property
field
variable
constant
enum
enum_member
type_alias
namespace
parameter
import
export
route
component
```

These are useful with `codegraph query --kind <kind>`.

## Edge kinds

Graph relationship kinds:

```text
contains
calls
imports
exports
extends
implements
references
type_of
returns
instantiates
overrides
decorates
```

Callers/callees walk the call graph one hop at a time. Impact computes a transitive radius.

## Index behavior relevant to search quality

CodeGraph extracts source with tree-sitter, stores nodes/edges/files in a local SQLite database, resolves imports/calls/inheritance/framework patterns, and may synthesize some dynamic-dispatch relationships heuristically.

By default it skips common dependency/build/cache directories, `.gitignore`-excluded content, and files over 1 MB. `codegraph.json` can customize indexing behavior, including exclusions, inclusions, and custom file-extension mappings.

If a source file is unexpectedly absent from results, inspect:

```text
.gitignore
codegraph.json
file extension / supported language
file size
index freshness
```

## Agent query patterns

### Locate implementation

```bash
codegraph explore "where is user registration implemented"
```

Then, if needed:

```bash
codegraph query registerUser --limit 20
codegraph node registerUser
```

### Trace end-to-end flow

```bash
codegraph explore "trace payment callback from HTTP route to persistence"
```

Follow up only if needed:

```bash
codegraph callers handlePaymentCallback
codegraph callees handlePaymentCallback
```

### Analyze a planned change

```bash
codegraph node BillingService
codegraph impact BillingService --depth 3
```

### Understand an unfamiliar module

```bash
codegraph files --max-depth 3
codegraph explore "how does the billing module work"
```

### Find tests to run

```bash
git diff --name-only | codegraph affected --stdin --quiet
```

## Local-version rule

CodeGraph evolves quickly. If the installed CLI rejects a flag or exposes a newer option, prefer the installed CLI's help output:

```bash
codegraph version
codegraph help <command>
```

Do not invent flags from memory.
