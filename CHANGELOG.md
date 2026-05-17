# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [6.6.0.1] - 2026-05-17

Plugin-only patch: auto-seed `_bmad/` runtime scaffolding into the user's
project on first BMAD skill invocation, so skills no longer fail with
`python3 … _bmad/scripts/resolve_customization.py: No such file or
directory` when the user hasn't run `npx bmad-method install` separately.
No upstream version change.

### Added

- `plugins/bmad/_bmad-template/` — bundled snapshot of the installer's
  `_bmad/` tree (configs, scripts, module assets). Identity fields
  baked in by the local installer run (`user_name`, `project_name`)
  are sanitized to neutral defaults during sync.
- `plugins/bmad/hooks/scaffold-bmad.py` — Python hook script that
  idempotently copies `_bmad-template/` into `${CLAUDE_PROJECT_DIR}/_bmad/`
  when a `bmad-*` or `gds-*` skill is invoked and the directory is
  missing. Silent for non-BMAD tool calls; never blocks the original
  call.
- `hooks.PreToolUse` entry in `plugins/bmad/.claude-plugin/plugin.json`
  matched on the `Skill` tool, wired to the scaffold script via
  `${CLAUDE_PLUGIN_ROOT}`.

### Changed

- `scripts/sync-from-installer.ts`: adds `bundleBmadTemplate()` step
  that wipes and regenerates `plugins/bmad/_bmad-template/` from
  `.upstream-install/_bmad/` on every sync, with identity-field
  sanitization. The template now refreshes alongside the skill tree
  whenever upstream changes.

### Fixed

- First-use UX gap: invoking any BMAD/GDS skill in a project without
  prior `npx bmad-method install` previously surfaced a Python "no
  such file" trace. The skill's documented fallback path ("If the
  script fails, resolve the workflow block yourself…") still works,
  but users hit the error first. Scaffolding lazily on first
  invocation eliminates the error without forcing intrusion in
  non-BMAD projects.

## [6.6.0.0] - 2026-05-10

Upstream sync: bumps BMAD-METHOD core from v6.5.0 to v6.6.0 and TEA from
v1.15.1 to v1.17.0. BMB / CIS / GDS were already at the latest stable
GitHub tag (v1.7.0 / v0.2.0 / v0.4.0) and remain unchanged. Skill count
holds at **102**; only 3 skill files saw upstream content updates (the
new "Implementation Efficiency" guidance for `bmad-create-epics-and-stories`).

### Changed

- `plugins/bmad/skills/` regenerated from `npx bmad-method@6.6.0 install
  --tools claude-code`. The 3 modified skill files all live under
  `bmad-create-epics-and-stories` and `bmad-create-architecture` —
  upstream's brownfield epic-scoping enhancement (file-overlap detection
  + design-completeness gate).
- `.upstream-versions/tea.json`: v1.15.1 → v1.17.0 (skips v1.16.0).
  TEA v1.16.0 added Claude cowork support and renamed catalog
  relationships `after`/`before` → `preceded-by`/`followed-by`. v1.17.0
  bumped TEA's own GitHub Actions deps. Both are non-breaking from this
  plugin's perspective; the regenerated TEA skill content already
  reflects the renamed catalog columns.
- `scripts/sync-from-installer.ts:bumpModuleVersions()`: rewritten to
  read the canonical `_bmad/_config/manifest.yaml` produced by the
  v6.6.0 installer. The previous implementation matched a `version:`
  field in the per-module `_bmad/<mod>/config.yaml`, which no longer
  carries module-version metadata — those files now hold runtime config
  only. Without this fix, module bumps were silently no-ops, so TEA
  v1.16/v1.17 would not have been picked up.
- Sync flow re-ordered so `updateReadmeBadge()` runs *after*
  `bumpModuleVersions()` — otherwise the README badge and version table
  reflected stale module versions.

### Added

- Brownfield epic scoping principle in `bmad-create-epics-and-stories`
  (Implementation Efficiency: detect file-overlap between epics and
  consolidate when the same component is touched repeatedly). Upstream
  v6.6.0 feature.
- Upstream installer flags available transparently to end users running
  the installer directly: `--list-tools`, `--set <module>.<key>=<value>`
  (repeatable, with prototype-pollution defenses), `--list-options
  [module]`. Plugin builds keep using `--tools claude-code` exclusively.

### Removed

- Nothing on the plugin side. Upstream v6.6.0 auto-removes legacy
  pre-v6.2.0 wrapper skills (`bmad-bmm-*`, `bmad-agent-bmm-*`) on user
  install, but those have not been part of this plugin's tree since
  v6.5.0.0.

### Breaking-change matrix (from upstream v6.6.0)

| Upstream breaking change | Impact on this plugin |
| --- | --- |
| `--tools none` no longer accepted on fresh `--yes` installs | None — sync uses `--tools claude-code` (`scripts/sync-from-installer.ts:90-91`). |
| `project_name` moved from `[modules.bmm]` to `[core]` in `config.toml`; auto-migrated on user install | None — plugin tree carries no `config.toml`; this affects end-user installs only. |
| Pre-v6.2.0 wrapper skills `bmad-bmm-*` / `bmad-agent-bmm-*` auto-removed on upgrade | None — none of those names exist in `plugins/bmad/skills/`. |

## [6.5.0.1] - 2026-04-28

Architectural refactor: the plugin now sources its content directly
from the official `npx bmad-method install --tools claude-code`
output, replacing the multi-source git-clone-based sync pipeline.
**No upstream version change** — this release is purely a refactor of
how the plugin is built. The shipped skill content matches what
end-users get from the upstream installer byte-for-byte.

### Changed

- **Sync pipeline rewritten** as a thin wrapper around
  `npx bmad-method@<version> install --tools claude-code`. The
  installer is the single source of truth; the plugin does not perform
  any custom merging, path-rewriting, or per-source iteration.
- `plugins/bmad/skills/` regenerated from the installer output. Skill
  count: **102** (was 93). The 9 net new entries are: 3 research
  skills (`bmad-domain-research`, `bmad-market-research`,
  `bmad-technical-research`) that used to live nested under
  `skills/research/`; `bmad-tea` and 5 `gds-agent-*` skills that used
  to live as flat .md files in `agents/`; and `gds-document-project`
  which the old sync was missing entirely.
- `customize.toml` files: 86 → 90 (no longer missing for agent skills).

### Removed

- `plugins/bmad/agents/` directory (22 files). Agents are skills now;
  invoke via `/bmad:bmad-agent-pm` etc. instead of `Use the pm
  agent…`.
- `plugins/bmad/_shared/` directory. Replaced by per-skill
  `resources/` (e.g., each TEA testarch skill now ships its own
  `resources/tea-index.csv` instead of all sharing one in `_shared/`).
- `plugins/bmad/templates/` directory. Templates are inside their
  individual skill directories now.
- 4 zombie agents that were retired upstream in v6.3.0 and should
  never have survived the v6.5.0.0 wipe-and-regenerate: `sm.md`
  (Bob), `qa.md` (Quinn-as-broad-QA), `quick-flow-solo-dev.md`
  (Barry), `bmad-master.md` (BMad Master Orchestrator).
- 16 deleted scripts (≈3455 net lines removed). The old multi-source
  pipeline is gone:
  `sync-upstream-content.ts`, `sync-all.ts`, `generate-agents.ts`,
  `generate-skills.ts`, `generate-agent-manifest.ts`,
  `clean-orphaned-skills.ts`, `find-orphan-files.ts`, `bump-core.ts`,
  `bump-module.ts`, `lib/path-rewriter.ts`,
  `lib/workflow-iterator.ts`, plus 7 `lib/checks/*.ts` files.
- `package.json` scripts that backed the deleted scripts:
  `generate:agents`, `generate:skills`, `generate:manifest`,
  `sync-all`, `sync:source`, `clean:orphaned`, `find-orphans`,
  `find-orphans:delete`, `bump-core`, `bump-module`.

### Added

- `scripts/sync-from-installer.ts` — the new sync script (one
  command: `bun run sync`).
- `.upstream-install/` — git-ignored install output, fresh on each
  sync.
- `docs/plan-npx-resync.md` — the migration plan that drove this
  refactor.

### Fixed

- README's upstream-version table: drop "Released" column (we no
  longer keep git clones to read tag dates from).
- All references in source comments and example scripts updated to
  v6.5.0+ versions; legacy "v6.0.0-Beta.X" / "v6.2.2" / "v6.3.0"
  examples either bumped or labeled as historical.
- Test suite (`tests/e2e/skill-load.test.ts`) updated to use current
  prefixed skill names (`bmad-help`, `bmad-brainstorming`,
  `bmad-customize`, `bmad-tea`, `bmad-agent-pm`, …).

### Migration notes

If you previously installed the plugin and want the v6.5.0.1 layout:

```sh
claude plugin uninstall bmad@bmad-method
claude plugin install bmad@bmad-method@v6.5.0.1
```

The installed cache will then contain only `skills/` (plus the
`.claude-plugin/` manifest and the marketplace README) — no
`agents/`, no `_shared/`, no `templates/`. Agent personas are
invoked via slash commands like `/bmad:bmad-tea`.

## [6.5.0.0] - 2026-04-27

Regression-style upgrade: no backward compatibility with pre-v6.5 layouts.
The plugin tree was wiped and rebuilt purely from v6.5.0-era upstream
sources to guarantee zero leftover artifacts from earlier versions.

### Added

- New core skill `bmad-customize` (v6.5.0): authors per-skill `[agent]` /
  `[workflow]` TOML overrides for installed BMAD skills.
- `customize.toml` authoring pattern adopted across BMM and core skills.
- `module.yaml` and `module-help.csv` introduced at module roots (core, BMM).
- Path-rewriter passthrough for v6.5.0 user-side aliases:
  `_bmad/scripts/`, `_bmad/custom/`, `_bmad/planning/`.

### Changed

- Sync core BMAD-METHOD v6.3.0 → v6.5.0 (skipping v6.4.0 — direct upgrade).
- Sync upstream TEA v1.12.2 → v1.15.1 (TEA agent moved to SKILL.md format).
- Sync upstream BMB v1.4.0 → v1.7.0.
- Sync upstream CIS v0.1.9 → v0.2.0.
- Sync upstream GDS v0.3.0 → v0.4.0.
- `sync-upstream-content.ts` now delegates JSON version bumps to
  `bump-utils.updateJsonVersionFiles()` so `marketplace.json` is updated
  alongside `package.json` and `plugin.json`.
- TEA v1.15.1 ships its agent as a SKILL.md instead of a YAML file.
- `gds-agent-game-qa` and `gds-agent-game-scrum-master` registered as
  plugin-only agents (no upstream counterpart in GDS v0.4.0).

### Removed

- All v6.2/v6.3 backward-compat fallbacks in
  `scripts/clean-orphaned-skills.ts` (legacy `src/core/skills/` and
  `src/core/workflows/` candidate paths).
- Legacy fallback in `scripts/lib/path-rewriter.ts`
  `addCoreSpecialWorkflows()` (only `src/core-skills/` is checked).
- Stale `bmad-skill-manifest.yaml` and `workflow.md` files no longer
  shipped by upstream (already filtered by `skipContentFiles`, removed
  from disk via the wipe + rebuild).

### Fixed

- `marketplace.json` version drift: was stuck at v6.2.0.4 because the
  inline version-update block in `sync-upstream-content.ts` only touched
  `package.json` and `plugin.json`. Now bumps to v6.5.0.0 like the
  others.

> **Reconstructed entries (6.0.3.4 → 6.3.0.2)** — these releases were tagged
> on the upstream `PabloLION/bmad-plugin` fork during the Feb–Apr 2026 window
> while the CHANGELOG was unmaintained. Entries are reconstructed from git
> log + tag metadata.

## [6.3.0.2] - 2026-04-18

### Changed

- Sync core BMAD-METHOD v6.2.2 → v6.3.0
- Sync TEA v1.7.3 → v1.12.2
- Sync GDS v0.2.2 → v0.3.0

### Added

- `find-orphan-files.ts` script — detects stale files inside surviving plugin
  skill directories (orphaned by upstream renames mid-skill, not caught by
  `clean-orphaned-skills.ts` which only handles whole directories)
- `bmad-checkpoint-preview` skill (NEW in core v6.3.0)
- `bmad-prfaq` skill (Working Backwards PRFAQ challenge)

### Removed

- `bmad-init` skill (config now loads from `_bmad/bmm/config.yaml`)
- `bmad-agent-qa`, `bmad-agent-quick-flow-solo-dev`, `bmad-agent-sm` skill
  dirs (Barry/Quinn/Bob personas consolidated into Developer Amelia upstream)

> **Note:** this tag was merged "for local testing" so the user's fork could
> be used as a Claude Code marketplace before the upstream PR landed. There
> is no v6.3.0.0 / v6.3.0.1 — the plugin patch jumped to .2 to reflect the
> two iteration commits during the test cycle.

## [6.2.2.0] - 2026-03-31

### Changed

- Sync core BMAD-METHOD v6.2.0 → v6.2.2
- Sync BMB v1.1.0 → v1.4.0
- Sync TEA v1.7.1 → v1.7.3

### Fixed

- Update upstream version badges for bmb, cis, tea

## [6.2.0.4] - 2026-03-23

### Changed

- Sync TEA v1.7.0 → v1.7.1
- Sync BMB v1.0.2 → v1.1.0
- Sync CIS v0.1.6 → v0.1.9

## [6.2.0.3] - 2026-03-18

### Fixed

- Resolve all validation warnings: plugin-only agents register correctly,
  path checker no longer flags expected paths

## [6.2.0.2] - 2026-03-18

### Fixed

- Clean stale files left over after upstream renames
- Content / workflow validation false positives

## [6.2.0.1] - 2026-03-18

### Changed

- Resolve 23 `workflowWorkarounds` (remove 14 obsolete GDS entries, rename
  field for clarity)

### Added

- `docs/script-pipeline.md` — full script-pipeline reference
- Pre-push hook hardening: `set -e` so lint failures block pushes

## [6.2.0.0] - 2026-03-18

### Changed

- Sync core to upstream v6.2.0 (path migration: `src/bmm/workflows/` →
  `src/bmm-skills/`, agents now embedded in skill dirs)
- Bump GDS to v0.2.2

### Added

- Path rewriter handles new core-module layout
- Content checker deduplication
- TEA workflow workarounds for stale upstream agent refs
- `gds-domain-research` skill from upstream sync

### Fixed

- Skip `SKILL.md` generation when upstream provides it (prevent overwrite)
- Remove stale GDS files left over from prior sync

## [6.0.4.3] - 2026-03-09

### Changed

- Consolidate version files into a single `.upstream-versions/` directory
  (was previously scattered across `.upstream-version-*` dotfiles)
- Replace `_bmad/_memory/` sidecar paths with Claude Code's native
  `agent-memory` infrastructure
- Rewrite `_bmad-output/` paths to plain `bmad-output/` in plugin files

### Added

- `docs/terminology.md` — plugin storage conventions
- BMAD sidecar memory system analysis research note

## [6.0.4.2] - 2026-03-06

### Changed

- Bump upstreams: core v6.0.4, TEA v1.5.2, GDS v0.1.10

### Added

- `_config/` path rewrites in sync pipeline
- `agent-manifest.csv` generated alongside the rest of the sync
- `docs/plugin-distribution.md` — distribution reference

### Fixed

- Roll back issue-tracker store to SQLite, remove duplicate tombstones and
  stale statuses

## [6.0.3.4] - 2026-02-26

### Changed

- Beads issue-tracker sync before release

## [6.0.0-Beta.4.1] - 2026-01-29

### Added

- E2E test suite expanded to 6 tests: status, init, quinn agent, random smoke
- Tests run concurrently via `test.concurrent` for faster execution
- Dynamic upstream version badge (shields.io endpoint)
- GitHub dependency graph submission for BMAD-METHOD upstream
- Version bump and release script (`scripts/release.sh`)

### Changed

- Test runner upgraded from `Bun.spawnSync` to async `Bun.spawn`
- Sync workflow now auto-updates badge JSON on upstream changes

## [6.0.0-Beta.4.0] - 2026-01-29

### Added

- Quinn agent (QA engineer) replacing TEA agent

### Changed

- Synced content to BMAD-METHOD Beta.4
- Rephrased key advantages in docs

### Removed

- TEA module skills (upstream deleted in Beta.4)

## [6.0.0-Beta.2.2] - 2026-01-28

### Fixed

- Pin upstream validation to release tag, re-sync content
- Strip v prefix in upstream version comparison
- Add issues write permission to workflows
- List check names in validation output
- Add badges to README, make workflows robust

### Changed

- Rename workaround workflow to Skills Workaround Status
- Rename marketplace to bmad-plugin

## [6.0.0-Beta.2.0] - 2026-01-27

### Added

- Plugin versioning system
- Quiet mode to validation script
- Upstream coverage validation script with pre-push hook
- Content consistency check to validation script
- Upstream BMAD version sync workflow
- All remaining workflows as skills (27 new, 33 total)
- Remaining 7 agents (architect, SM, UX designer, TEA, tech writer, barry, bmad-master)
- Templates, config, and TEA knowledge base from upstream
- Plugin README and marketplace submission record

### Changed

- Rewrite SKILL.md descriptions to concise action-oriented format
- Reorganize into `plugins/bmad/` with bmad- prefix names
- Convert commands to skills, simplify plugin.json
- Split validation script into modular files
- Three-set skill validation (upstream/dirs/manifest)
- Sync plugin content to upstream Beta.2

### Fixed

- Flatten skills directory structure
- Workaround isHidden bug for skill autocomplete
- Normalize quotes in content comparison
- Add missing testarch-knowledge to plugin.json commands

## [0.1.0] - 2026-01-26

### Added

- Initial BMAD plugin POC

[6.6.0.0]: https://github.com/tgorka/bmad-plugin/compare/v6.5.0.1...v6.6.0.0
[6.5.0.1]: https://github.com/tgorka/bmad-plugin/compare/v6.5.0.0...v6.5.0.1
[6.5.0.0]: https://github.com/tgorka/bmad-plugin/compare/v6.3.0.2...v6.5.0.0
[6.3.0.2]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.2.0...v6.3.0.2
[6.2.2.0]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.0.4...v6.2.2.0
[6.2.0.4]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.0.3...v6.2.0.4
[6.2.0.3]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.0.2...v6.2.0.3
[6.2.0.2]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.0.1...v6.2.0.2
[6.2.0.1]: https://github.com/PabloLION/bmad-plugin/compare/v6.2.0.0...v6.2.0.1
[6.2.0.0]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.4.3...v6.2.0.0
[6.0.4.3]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.4.2...v6.0.4.3
[6.0.4.2]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.3.4...v6.0.4.2
[6.0.3.4]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.0-Beta.4.1...v6.0.3.4
[6.0.0-Beta.4.1]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.0-Beta.4.0...v6.0.0-Beta.4.1
[6.0.0-Beta.4.0]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.0-Beta.2.2...v6.0.0-Beta.4.0
[6.0.0-Beta.2.2]: https://github.com/PabloLION/bmad-plugin/compare/v6.0.0-Beta.2.0...v6.0.0-Beta.2.2
[6.0.0-Beta.2.0]: https://github.com/PabloLION/bmad-plugin/compare/c3db5e8...v6.0.0-Beta.2.0
[0.1.0]: https://github.com/PabloLION/bmad-plugin/commits/c3db5e8
