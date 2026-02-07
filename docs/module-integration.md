# Module Integration

How to add a new upstream module to the plugin.

## Prerequisites

- Upstream repo URL and latest release tag
- Module ID (short lowercase: `tea`, `bmb`, `cis`, `gds`)
- Understanding of the upstream repo structure (`agentsRoot`, `contentRoot`)

## Procedure

### Step 0: Clone and verify

```sh
git clone https://github.com/<org>/<repo>.git .upstream/<repo-name>
git -C .upstream/<repo-name> checkout <version-tag>
```

Verify the upstream structure:

```sh
ls .upstream/<repo-name>/src/agents/       # Agent YAML files
ls .upstream/<repo-name>/src/workflows/    # Workflow directories
```

The `localPath` in `upstream-sources.ts` must match the directory name exactly.

### Step 1: Configuration

Add `UpstreamSource` entry to `scripts/lib/upstream-sources.ts` (use an existing
module as template):

```ts
{
  id: '<id>',
  repo: '<org>/<repo>',
  localPath: '<repo-name>',
  versionFile: '.upstream-version-<id>',
  enabled: true,
  contentRoot: 'src/workflows',
  agentsRoot: 'src/agents',
  flatWorkflows: true,
  skipDirs: new Set(['_shared', 'templates']),
  skipContentFiles: new Set(['workflow.md', 'workflow.yaml', 'SKILL.md']),
  workflowWorkarounds: {},
  pluginOnlySkills: new Set(),
  pluginOnlyAgents: new Set(),
  sharedFileTargets: {},
  pluginOnlyData: new Set(),
}
```

Key fields:

- **`flatWorkflows`**: `true` if workflow dirs are directly under `contentRoot`;
  `false` if there's an intermediate category layer (only core uses `false`)
- **`workflowWorkarounds`**: Rename map for namespace collisions
  (e.g., `{ 'document-project': 'gds-document-project' }`)
- **`pluginOnlyAgents`**: Agents owned by another module that should be skipped
  (e.g., GDS `tech-writer` is owned by core)

Create supporting files:

```sh
echo "<version-tag>" > .upstream-version-<id>
```

Create badge endpoint at `.github/badges/upstream-version-<id>.json` (copy from
an existing badge file, update the label and message).

Add `check-<id>` job to `.github/workflows/sync-upstream.yml` (copy the pattern
from an existing `check-*` job).

### Step 2: Generate agent files

```sh
bun run generate:agents -- --source <id> --dry-run  # Preview
bun run generate:agents -- --source <id>             # Generate
```

This reads `.agent.yaml` files from the upstream `agentsRoot` and creates
`plugins/bmad/agents/<agent-name>.md` with:

- Frontmatter (name, description, tools, model)
- Role, identity, communication style, principles from the agent YAML
- Critical actions (if defined)
- Available workflows table (mapped from agent menu items)

The script handles:

- Nested agent directories (e.g., `storyteller/storyteller.agent.yaml`)
- `pluginOnlyAgents` filtering (skips agents owned by other modules)
- `workflowWorkarounds` mapping for renamed skills
- "todo" workflow references shown as `(planned)` in the table

### Step 3: Generate skill files

```sh
bun run generate:skills -- --source <id> --dry-run  # Preview
bun run generate:skills -- --source <id>             # Generate
```

This reads `workflow.yaml` from each workflow directory and creates
`plugins/bmad/skills/<name>/SKILL.md` with:

- Frontmatter (description, user-invocable, disable-model-invocation)
- Goal, agent info, execution instructions
- Sub-workflow table (if `workflow-*.md` files exist)
- Validation section

The script handles:

- Automatic skill directory creation
- Agent-to-workflow mapping (finds the agent that owns each workflow)
- Sub-workflow detection (`workflow-*.md` pattern)
- `skipDirs`, `skipWorkflows`, `pluginOnlySkills` filtering

### Step 4: Sync supporting files

```sh
bun run sync -- --source <id>
```

Copies step files, instructions, templates, checklists, and data files from the
upstream workflow directories into the plugin skill directories. Skips
`workflow.md`, `workflow.yaml`, and `SKILL.md`.

See `docs/upstream-sync-design.md` for detailed sync mechanics.

### Step 5: Validate

```sh
bun run validate
```

Checks agent coverage, skill coverage, content sync, and shared file consistency
across all enabled sources.

### Step 6: Documentation

Update these files:

- **`README.md`** — Add version badge for the new module
- **`docs/versioning.md`** — Move module from "Planned" to active table
- **`AGENTS.md`** — Add new agents to the Current Agents table with Module column

## Edge Cases

### Namespace collisions

When an upstream workflow name conflicts with an existing skill (e.g., GDS has
`document-project` but core already owns it), use `workflowWorkarounds`:

```ts
workflowWorkarounds: { 'document-project': 'gds-document-project' }
```

The sync and generation scripts all respect this mapping.

### Agent ownership conflicts

When an upstream module defines an agent that another module already owns (e.g.,
GDS defines `tech-writer` but core owns it), add it to `pluginOnlyAgents`:

```ts
pluginOnlyAgents: new Set(['tech-writer'])
```

The generation script skips these agents.

### Categorized vs flat workflows

Core uses a categorized structure (`src/bmm/workflows/<category>/<workflow>/`)
while all external modules use flat structure (`src/workflows/<workflow>/`).
Set `flatWorkflows: true` for external modules.

### Beads hook interference

Git operations inside `.upstream/` subdirectories fail because beads hooks
intercept them. The sync and validation scripts use `gitInUpstream()` which
sets `BEADS_DIR` to the project root's `.beads/` directory to prevent this.

For manual git commands in upstream repos:

```sh
BEADS_DIR=$(pwd)/.beads git -C .upstream/<repo-name> <command>
```

## Script Reference

| Script | Purpose |
|---|---|
| `bun run generate:agents -- --source <id>` | Generate agent `.md` files from upstream YAML |
| `bun run generate:skills -- --source <id>` | Generate `SKILL.md` files from upstream workflows |
| `bun run sync -- --source <id>` | Sync supporting files for one module |
| `bun run sync` | Sync all enabled modules |
| `bun run validate` | Validate all modules (agents, skills, content, sync) |

All scripts support `--dry-run` for preview without writing files.

## Module Configuration Reference

All module configuration lives in `scripts/lib/upstream-sources.ts`. Each
`UpstreamSource` entry controls:

| Field | Purpose |
|---|---|
| `id` | Short identifier used in CLI flags and log output |
| `repo` | GitHub `org/repo` for cloning and release checks |
| `localPath` | Directory name under `.upstream/` |
| `versionFile` | Version tracking file at repo root |
| `contentRoot` | Path inside cloned repo to workflow directories |
| `agentsRoot` | Path inside cloned repo to agent YAML files |
| `flatWorkflows` | `true` if workflows are direct children of `contentRoot` |
| `skipDirs` | Directory names to skip during sync/validation |
| `skipWorkflows` | Workflow names owned by another source |
| `skipContentFiles` | Filenames to never sync (e.g., `workflow.md`) |
| `skipContentPatterns` | Regex patterns for files to skip |
| `workflowWorkarounds` | Rename map for namespace collisions |
| `pluginOnlySkills` | Skills with no upstream counterpart |
| `pluginOnlyAgents` | Agents owned by another module (skip) |
| `sharedFileTargets` | Shared file distribution map |
| `pluginOnlyData` | Data files with no upstream counterpart |
