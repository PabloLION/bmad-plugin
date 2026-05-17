# Script Pipeline

> **📌 Historical document (pre-v6.5.0+).** This describes the
> sync-upstream-content / generate-agents / generate-skills /
> generate-manifest / clean-orphaned-skills / find-orphan-files
> pipeline that ran on top of multiple git clones. All those scripts
> have been deleted as of v6.5.0.1; the plugin now uses a single
> `scripts/sync-from-installer.ts` that delegates to the official
> `npx bmad-method install --tools claude-code` CLI. See
> [`AGENTS.md`](../AGENTS.md) for the current command reference and
> [`docs/plan-npx-resync.md`](plan-npx-resync.md) for migration notes.
> This document is kept for archaeological reference.

How the sync, generation, validation, and release scripts USED TO work together.

## Data Flow

```text
.upstream/<repo>/ (pinned to version tag)
       │
       ▼
[sync-upstream-content.ts]  ── copies files + rewrites paths
       │
       ├──▶ plugins/bmad/skills/<name>/{instructions, steps, data}
       ├──▶ plugins/bmad/_shared/{tasks/, tea-index.csv}
       └──▶ .upstream-versions/<id>.json (updated)
       │
       ▼
[generate-agents.ts]  ── converts .agent.yaml → markdown
       │
       └──▶ plugins/bmad/agents/<slug>.md
       │
       ▼
[generate-skills.ts]  ── generates SKILL.md from workflow metadata
       │
       └──▶ plugins/bmad/skills/<name>/SKILL.md
       │
       ▼
[generate-agent-manifest.ts]  ── builds agent registry
       │
       └──▶ plugins/bmad/_shared/agent-manifest.csv
       │
       ▼
[validate-upstream-coverage.ts]  ── checks everything matches
       │
       └──▶ exit 0 (pass) or exit 1 (fail)
```

## Upstream Sources

Five repositories contribute content, each pinned to a version tag in
`.upstream-versions/<id>.json`:

```csv
ID,Repository,Layout,Description
core,bmadcode/BMAD-METHOD,categorized,Main framework — agents + skills + tasks
tea,bmad-code-org/bmad-method-test-architecture-enterprise,flat,Testing and architecture skills
bmb,bmad-code-org/bmad-builder,flat,Builder skills
cis,bmad-code-org/bmad-module-creative-intelligence-suite,flat,Creative intelligence skills
gds,bmad-code-org/bmad-module-game-dev-studio,categorized,Game development skills
```

**Layout** determines directory structure:

- **Categorized** (core, gds): `contentRoot/<category>/<workflow>/`
- **Flat** (tea, bmb, cis): `contentRoot/<workflow>/`

The `workflow-iterator.ts` library handles both transparently.

## Scripts

### sync-upstream-content.ts

Copies supporting files from upstream into the plugin, applying path rewrites.

- **Reads:** upstream repos (checked out to pinned version), `.upstream-versions/`
- **Writes:** `plugins/bmad/skills/`, `plugins/bmad/_shared/`, `.upstream-versions/`
- **Skips:** `workflow.md`, `workflow.yaml` (plugin generates its own SKILL.md)
- **Path rewrites:** transforms `{project-root}/_bmad/...` references to
  `${CLAUDE_PLUGIN_ROOT}/skills/...` via `path-rewriter.ts`
- **CLI:** `bun run sync [--source <id>] [--dry-run]`

Without `--source`, runs all sources and bumps plugin version to `<core>.0`.

### generate-agents.ts

Converts upstream agent definitions to plugin agent markdown files.

- **Reads:** `.agent.yaml` files (or `SKILL.md` for newer format) from upstream
- **Writes:** `plugins/bmad/agents/<slug>.md`
- **Process:** parses YAML metadata (title, role, identity, principles, menu) →
  generates markdown with activation section. SKILL.md agents are copied directly.
- **CLI:** `bun run generate:agents [--source <id>] [--dry-run]`

### generate-skills.ts

Generates `SKILL.md` files from workflow metadata.

- **Reads:** `workflow.yaml`/`workflow.md` frontmatter from upstream skill dirs
- **Writes:** `plugins/bmad/skills/<name>/SKILL.md`
- **Skips:** generation when upstream already provides `SKILL.md`
- **Process:** extracts name/description from workflow metadata, detects
  sub-workflows, looks up corresponding agent, generates SKILL.md
- **CLI:** `bun run generate:skills [--source <id>] [--dry-run]`

### generate-agent-manifest.ts

Builds the agent registry CSV used by party-mode and advanced-elicitation.

- **Reads:** all `plugins/bmad/agents/*.md`
- **Writes:** `plugins/bmad/_shared/agent-manifest.csv`
- **CLI:** `bun run generate:manifest [--dry-run]`

No `--source` filter — the manifest is always a complete registry.

### validate-upstream-coverage.ts

Checks that all upstream content is accounted for in the plugin.

Seven validation checks:

```csv
Check,What it validates
checkSync,Upstream repos at tracked versions
checkAgents,Upstream agents ↔ plugin agent files
checkWorkflows,Upstream workflows ↔ plugin skill dirs ↔ plugin.json
checkContent,Supporting files synced correctly
checkVersion,.upstream-versions ↔ upstream package.json
checkAgentSkills,Agent menu workflows ↔ plugin skill dirs
checkPaths,Path rewrites complete and valid
```

- **Output:** pass (exit 0) or fail with gaps (exit 1), plus workaround warnings
- **CLI:** `bun run validate [--verbose]`

### sync-all.ts

Orchestrator that runs the full pipeline sequentially:

```text
sync → generate:agents → generate:skills
```

Passes through `--source <id>` and `--dry-run`. Exits on first failure.

- **CLI:** `bun run sync-all [--source <id>] [--dry-run]`

### clean-orphaned-skills.ts

Detects and removes skill directories that no longer match any upstream source.

- **Reads:** all upstream sources, plugin-only lists, workaround mappings
- **Removes:** orphaned dirs in `plugins/bmad/skills/`
- **CLI:** `bun run clean:orphaned [--dry-run]`

### bump-core.ts

Bumps plugin version to track a new core upstream release.

- Fetches latest tag from `.upstream/BMAD-METHOD`
- Updates `.upstream-versions/core.json`
- Derives plugin version: `<core>.0` (resets patch)
- Updates all 4 version files + README badge
- **CLI:** `bun run bump-core [--tag v6.0.2] [--dry-run] [--yes]`

### bump-module.ts

Bumps plugin version for a module update (non-core).

- Fetches latest tag from the module's upstream repo
- Updates `.upstream-versions/<id>.json`
- Increments plugin patch: `<core>.X` → `<core>.<X+1>`
- Updates all 4 version files + README badge
- **CLI:** `bun run bump-module -- --source <id> [--tag v1.7.1] [--dry-run] [--yes]`

### update-readme-version.ts

Updates the README version table and badge JSON files.

- **Reads:** `.upstream-versions/`, `.plugin-version`, upstream git tags
- **Writes:** `README.md` (version table + badges), `.github/badges/*.json`
- **CLI:** `bun run update-readme`

### release.sh

Two-phase release workflow. See `./docs/releasing.md` for full details.

- **Phase 1 (prepare):** beads sync → release branch → PR to main → wait for CI
- **Phase 2 (finish):** merge PR → tag main → GitHub release → return to dev
- **CLI:** `./scripts/release.sh [version]` or `./scripts/release.sh --after-ci`

## Shared Libraries

```csv
Library,Key exports,Used by
upstream-sources.ts,"UPSTREAM_SOURCES, getSource(), readVersion(), workflowWorkarounds","sync, generate-*, validate, clean, bump-*"
config.ts,"ROOT, PLUGIN, PLUGIN_JSON_PATH",all scripts
path-rewriter.ts,"rewriteFileContent(), buildRewriteMap()",sync
workflow-iterator.ts,"getWorkflowEntries()","generate-skills, validate, clean"
fs-utils.ts,"listFilesRecursive(), normalize()","sync, validate"
git-utils.ts,gitInUpstream(),"sync, bump-*"
output.ts,"pass(), fail(), warn(), section()",validate
bump-utils.ts,"VERSION_FILES, fetchLatestTag(), updateJsonVersionFiles()","bump-core, bump-module"
```

## Git Hooks

```csv
Hook,Commands,Scope
pre-commit,"lint:staged (biome --staged), typecheck",Staged files only
pre-push,"typecheck, lint (biome full repo), validate",Full project
```

**Gap:** The pre-push hook runs all three commands sequentially without `set -e`.
If lint fails, validate still runs and the hook exits with validate's exit code
(which may be 0). This means lint failures don't block pushes.

## Version Files

Four files must stay in sync:

```csv
File,Format,Prefix
.plugin-version,plain text,v (e.g. v6.5.0.0)
package.json,JSON version field,no prefix (6.5.0.0)
plugins/bmad/.claude-plugin/plugin.json,JSON version field,no prefix
.claude-plugin/marketplace.json,JSON version field,no prefix
```

**Versioning scheme:** `<core-upstream-version>.X` where X is a patch counter.
Core bump resets X to 0. Module bumps increment X.

## Common Command Sequences

Full sync after core bump:

```sh
bun run bump-core
bun run sync-all        # sync → generate:agents → generate:skills
bun run generate:manifest
bun run validate
```

Module-only update:

```sh
bun run bump-module -- --source tea
bun run sync-all -- --source tea
bun run validate
```

Release:

```sh
./scripts/release.sh          # current version
./scripts/release.sh 6.5.1.0  # bump + release
./scripts/release.sh --after-ci  # resume after CI fix
```
