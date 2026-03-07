# Terminology

Common terms used in this repository. Contributors should use these consistently
in code, documentation, and issue descriptions.

## Plugin Storage

| Upstream BMAD term | Our plugin term | Claude Code mechanism | Scope |
|---|---|---|---|
| `_bmad/_memory/<agent>-sidecar/` | Agent memory folder | `.claude/agent-memory/<name>/` | Per-project, per-agent |
| `memories.md` (agent-writable state) | Agent memory file | `MEMORY.md` in agent memory folder | Per-project, per-agent |
| `instructions.md` (stable, author-written) | Plugin data | `${CLAUDE_PLUGIN_ROOT}/data/` | Ships with plugin (read-only) |
| `_bmad-output/` | Output directory | `bmad-output/` (configurable via `.claude/bmad.local.md`) | Per-project |
| N/A | Plugin settings | `.claude/bmad.local.md` | Per-project, per-user |

### Agent memory folder

Per-agent persistent storage at `.claude/agent-memory/<name>/`. The agent reads
and writes files here across sessions. `MEMORY.md` (first 200 lines) is
auto-loaded on each agent invocation. Other files persist but are read on demand.
Not git-tracked.

### Agent memory file

The `MEMORY.md` file inside an agent memory folder. Auto-loaded into context
when the agent starts. The agent updates it with discoveries, patterns, and
session learnings.

### Plugin data

Read-only files shipped with the plugin at `${CLAUDE_PLUGIN_ROOT}/data/`.
These travel with the plugin installation and are the same for all projects.
Used for stable reference materials like agent instructions, templates, and
standards documents.

### Output directory

Where BMAD workflows write generated artifacts (planning documents,
implementation artifacts). Defaults to `bmad-output/` in the project root.
Configurable via the `artifacts-dir` setting in plugin settings.

### Plugin settings

Per-project, per-user configuration at `.claude/bmad.local.md`. YAML frontmatter
for structured settings, markdown body for notes. Automatically gitignored.
Not auto-loaded — agents read on demand.

## Install Scope

The plugin install scope is controlled by the user, not the plugin. A plugin
can be installed globally (user scope), per-project, or locally. We cannot
assume or control which scope the user chooses.
