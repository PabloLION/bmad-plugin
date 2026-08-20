# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [6.11.0.0] - 2026-08-20

From-scratch rebuild against BMAD-METHOD **v6.11.0**, not an incremental
bump. Module bumps: BMB v2.1.0 → **v2.2.1**, TEA v1.19.0 → **v1.23.3**,
BMad Loop v0.8.0 → **v0.11.0**, CIS → **v0.3.1**, GDS → **v0.7.1**.
Skill count **103 → 110** in the `bmad` plugin (core 14 + bmm 35 + gds 33
+ tea 10 + cis 10 + bmb 5 + loop 3), plus a second plugin shipping 15
more. Rationale for every decision below:
[docs/plan-6.11-rebuild.md](docs/plan-6.11-rebuild.md).

### Changed — policy reversals

- **Deprecated shims now ship. The sync no longer prunes them.** Two
  independent reasons. First, correctness: upstream's own
  `src/core-skills/v6-shims/README.md` states "External module repos
  (gds, loop, tea, bmb, os-utils) still invoke these IDs, so they ship by
  default. Removal rides the v7 cut — never a 6.x minor" — pruning them
  in a 6.x minor breaks cross-module invocation. Second, the gate had
  already stopped working: `pruneDeprecatedSkills()` matched a
  `description` starting with the literal uppercase `DEPRECATED`, and
  v6.11.0 writes `'Deprecated — forwards to bmad-prd (create intent).'`,
  so it matched **zero** skills while still reporting success — as did
  the companion check in `bun run validate`. Two of the twenty shims
  (`bmad-create-story` 23 KB, `bmad-dev-story` 26 KB) are full-bodied
  skills rather than forwarders, so the prune was never a no-op either.
  `pruneDeprecatedSkills()` and the CSV manifest scrub it fed are gone.
- **bmad-loop installs as a registry module.** Core v6.11.0 added
  `bmad-modules.yaml` at its repo root, in which `bmad-loop` is an
  official entry. The bespoke git-clone (`syncLoopSkills()`,
  `--loop-tag`, `.upstream-loop/`) was overwriting the installer's own
  output with tag-pinned copies; it is deleted and `bmad-loop` joins
  `--modules`. `.upstream-versions/loop.json` → `bmad-loop.json` so the
  id matches the installer manifest name, which is what
  `bumpModuleVersions()` keys on.

### Added

- **A second plugin: `bmad-manticore`** (upstream v1.0.1, 15 `mc-*`
  skills) — an AI video production pipeline. Manticore is a real BMad
  module (`skills/module.yaml`, `code: manticore`) but is absent from
  upstream's registry, so the sync clones it at a pinned tag and installs
  it through `--custom-source` from a **local path**; a URL would
  resolve the moving default branch and make the bundle irreproducible.
  It gets its own installer run so the `bmad` plugin's runtime template
  does not advertise skills that plugin does not ship.
  Separate plugin rather than 15 more skills in the aggregate: its
  prerequisites (ffmpeg, node/npx, uv, Python ≥ 3.11, multi-GB model
  caches) are irrelevant to most users, 14 of its 15 skills fail closed
  until `mc-setup` writes `[modules.manticore]` into
  `_bmad/custom/config.toml`, and `mc-agent` is an always-on persona
  that would compete for activation with the aggregate's agents.
  Pinned to the tag `v1.0.1`: upstream `main` self-declares `3.1.0` but
  its CHANGELOG marks both `3.0.0` and `3.1.0` as `- Unreleased` and no
  tag exists above `v1.0.1`.
  Two upstream defects at that tag are documented, not patched:
  `mc-audio`'s frontmatter is invalid YAML (`description:` is an
  unquoted scalar containing `": "`), so the installer's
  `parseSkillMd()` drops it and 16 declared skills install as 15; and
  `mc-agent` is not written into the core `config.toml` agent roster.
- **Vendored module-authoring scaffold** at
  `plugins/bmad/templates/module-template/`, pinned by commit
  `f1440ec8` (the repo has no tags). Deliberately **not** published as a
  marketplace plugin: its own manifest declares
  `"skills": ["./skills/my-skill"]` and that directory exists in no
  upstream ref — an early `.gitignore` rule (`.*/skills`) swallowed the
  scaffold — so a plugin entry would be a dead `my-module` in front of
  end users.
- **`/bmad:init --with-plugin <name>`** registers a sibling plugin from
  the same marketplace: materializes its `_bmad/<module>/` metadata and
  merges its help rows into `_bmad/_config/bmad-help.csv`. Opt-in, never
  inferred from the directory listing — a marketplace install is a git
  clone of the whole repo, so a sibling's files are on disk whether or
  not that plugin is enabled; `/bmad:init` decides from its own loaded
  skill list.
- **`uv` preflight in `/bmad:init`.** `bmad-build` and
  `bmad-build-auto` carry no workflow logic in v6.11 — they run
  `uv run _bmad/scripts/render_skill.py` and HALT if `uv` is missing.
  init warns (never fails) with install instructions.
- Runtime template gained `_bmad/render/` (content-addressed skill
  snapshots), `_bmad/scripts/render_skill.py`,
  `_bmad/scripts/config_utils.py`, and `_bmad/bmad-loop/`.
- `scripts/list-sources.ts` emits the source registry as JSON;
  `.github/workflows/sync-upstream.yml` builds its job matrix from it,
  replacing six copy-pasted per-module jobs. Registering a source is now
  the only edit needed to get a README row, a badge and a watcher.

### Fixed

- **The vendored runtime shipped the syncing operator's user name.**
  `user_name: Dev` was baked into `config.user.toml` and all seven
  per-module `config.yaml` files. Templatized as `__BMAD_USER_NAME__`,
  substituted by init from `git config user.name` (falling back to
  `$USER`). Install timestamps in `_config/manifest.yaml` likewise
  become `__BMAD_INSTALL_DATE__`.
- **`cis.json` and `gds.json` were transposed.** The v6.10 sync recorded
  cis v0.6.0 / gds v0.2.1 while its own `_bmad/_config/manifest.yaml`
  said cis v0.2.1 / gds v0.6.0. Both are now read back from the manifest,
  so CIS moving to v0.3.1 is a correction, not a downgrade.
- **README badges pointed at this repo's fork parent.**
  `GITHUB_RAW_BASE` was `PabloLION/bmad-plugin`, so every version badge
  rendered the parent's pins rather than ours. Also corrected the core
  repo slug `bmadcode/BMAD-METHOD` → `bmad-code-org/BMAD-METHOD`.
- **`bmad-help.csv` merge corrupted the last row.** The installer writes
  the file without a trailing newline; appending a sibling module's rows
  glued the first one onto the last existing row (producing a 12-column
  line) and re-appended it on every subsequent run. init pads the newline
  first, and the merge is dedupe-checked per row.
- `init.sh` treated an unknown option as the target directory. Argument
  parsing is now a shift loop and rejects unknown flags.

### Removed

- `bmad-index-docs`, `bmad-shard-doc`,
  `bmad-check-implementation-readiness` (folded into
  `bmad-sprint-planning`'s readiness gate) and `bmad-agent-tech-writer`
  (Paige retired) — all removed upstream in v6.11.0, with no replacement
  shim. The game-scoped `gds-agent-tech-writer` is unaffected.
- `.github/workflows/check-workarounds.yml` — it monitored a workaround
  `docs/workarounds.md` records as resolved on 2026-02-03, and asserted a
  `commands` array in plugin.json that no longer holds skills.

### Fixed after adversarial review

Two review passes over this stack found defects that were green on every
gate; all are fixed here, each mutation-verified.

- **`/bmad:init` could only seed a repo, never upgrade one.** It skipped
  every existing path, so a repo initialized under v6.10 kept its stale
  shared scripts, a help catalog naming eight removed skills while
  omitting 34 shipped ones, and the `user_name = "Dev"` leak — making
  "safe to re-run after a plugin update" false in exactly the case it
  was written for. `_bmad/custom/**` is now the user-owned layer and is
  never touched; everything else is refreshed when it differs from the
  template.
- **Substituted values could make the runtime unparseable.** A git
  identity containing `"`, `:`, `#` or `\` landed raw inside a TOML
  string and an unquoted YAML scalar, breaking `resolve_config.py` —
  which every skill calls. A literal newline aborted init mid-write,
  unrecoverably. Values are now reduced to a set safe in both formats.
- **An interrupted version bump was unrecoverable.** `.plugin-version`
  was written before the three JSON manifests, so a re-run read the
  advanced value, decided there was nothing to do, and left the
  manifests behind forever. It is written last, the patch counter
  survives a re-sync, and `validate` now requires all four anchors to
  agree.
- **The release watcher could never file anything.** This repo is a
  fork, forks ship with issues disabled, and `gh issue list` exits 1 in
  that state — under `set -euo pipefail` every drifted source would have
  turned the job red and reported nothing. Drift now always lands in the
  job summary; an issue is filed only when the tracker exists, deduped
  on exact title rather than relevance search.
- **A pinned tag could be shadowed by a branch.** `git clone --branch`
  resolves branches before tags; custom sources are fetched by
  `refs/tags/<tag>` and the vendored template's SHA is verified.
- **`--tag=v6.12.0` was silently ignored** and the sync ran against the
  pinned version instead, producing a tree every gate passes.
- Sibling help rows could zombie across a point release; the catalog is
  now reassembled rather than patched. A sibling's filtered
  skill-manifest is no longer materialized into the user's repo, where
  it replaced the 110-row aggregate with 15 rows. `--dry-run` no longer
  reports work it did not do. Throwaway checkouts moved under
  `.upstream-clones/` so one ignore rule covers them.

### Gates

`bun run validate` was rewritten so it cannot silently stop measuring:
the skill surface must equal the installer's own
`_config/skill-manifest.csv` in both directions; every declared plugin
must resolve to a directory whose `plugin.json` agrees with its
marketplace entry; every `plugins/<dir>` must be published; no vendored
file may carry the install-dir name, a non-placeholder `user_name`, or a
live nested `.gitignore`; registry and custom sources must pin a
`v`-prefixed tag and vendored sources a full 40-character SHA. Each gate
was mutation-verified — reintroducing the defect fails both
`bun run validate` and `bun run test:unit`.

## [6.10.0.0] - 2026-07-04

Upstream sync: bumps BMAD-METHOD core from v6.6.0 to v6.10.0 (through
v6.7 intent-based PRD/Brief, v6.8 planning-shape rework, v6.9
reasoning/orchestration upgrades, v6.10 bmad-loop era). Module bumps:
TEA v1.17.0 → v1.19.0, BMB v1.7.0 → v2.1.0, CIS v0.2.0 → v0.2.1, GDS
v0.4.0 → v0.6.0, plus the **new Loop module** (bmad-loop v0.8.0).
Skill count: **102 → 103** (42 BMM + 11 TEA + 4 BMB + 10 CIS + 33 GDS
+ 3 Loop) — upstream added 11 core-side skills, retired 9, this
plugin now **prunes upstream's 4 deprecated compatibility shims**
instead of shipping them, and the bmad-loop skill module contributes
3 more. 645 installer skill files changed (166 added, 265 deleted,
186 modified, 28 renamed).

### Added

- **Working-repo initializer.** Skills resolve per-project files from
  `{project-root}/_bmad/` (module config, shared scripts like
  `memlog.py` / `resolve_customization.py` — mandatory since v6.9's
  canonical memlog) which the immutable plugin cannot provide. New:
  - `plugins/bmad/runtime/_bmad/` — the installer's runtime tree
    (40 files), captured at sync time with the project name
    templatized as `__BMAD_PROJECT_NAME__` and deprecated-shim rows
    stripped from the `_config/*.csv` manifests. Nested `.gitignore`
    files are stored as `dot.gitignore` (a real one would exclude
    sibling template files from this repo — and marketplace installs
    are git clones); init.sh restores the real name.
  - `plugins/bmad/scripts/init.sh` — idempotent initializer: fills in
    missing `_bmad/` files (never overwrites), substitutes the real
    project name, creates the default output folders
    (`_bmad-output/*`, `docs/`, `skills/*-artifacts`). Supports
    `--dry-run` and a target-dir argument.
  - `plugins/bmad/commands/init.md` — `/bmad:init` slash command
    wrapping the script (plugin.json now declares `commands`).
- New upstream skills since v6.6.0: `bmad-prd`, `bmad-architecture`
  (ARCHITECTURE-SPINE rewrite), `bmad-ux` (DESIGN.md + EXPERIENCE.md),
  `bmad-spec`, `bmad-forge-idea`, `bmad-dev-auto` (unattended dev
  loop), `bmad-eval-runner`, and intent-based GDS consolidations
  `gds-gdd`, `gds-prd`, `gds-ux`, plus `gds-investigate`.
- **Loop module** (`bmad-code-org/bmad-loop` v0.8.0 — upstream v6.10's
  successor to bmad-automator). Not an npx-installer module: it is a
  Python orchestrator tool whose skill module ships inside its repo
  (`src/bmad_loop/data/skills/`). The sync clones the repo at the tag
  pinned in `.upstream-versions/loop.json` (`--loop-tag` to override)
  and copies `bmad-loop-setup` (installs/upgrades the orchestrator
  tool via `uv` and registers `_bmad/` config + help),
  `bmad-loop-resolve` (interactive CRITICAL-escalation resolution),
  and `bmad-loop-sweep` (deferred-work triage, automation-only). The
  release watcher (`sync-upstream.yml`) gained a `check-loop` job and
  the README version table / badges a Loop row.
- `scripts/sync-from-installer.ts`: `pruneDeprecatedSkills()` (drops
  any skill whose frontmatter description starts with `DEPRECATED`)
  and `captureRuntimeTemplate()` (copies `.upstream-install/_bmad/`
  into the plugin and templatizes it). `plugins/bmad/runtime/` is part
  of the wipe-and-regenerate cycle.
- Tests: `tests/plugin-tree.test.ts` (no deprecated shims, retired
  skills absent, new surface present, runtime template complete) and
  `tests/init-script.test.ts` (structure, name substitution,
  idempotency, `--dry-run`). `bun run validate` now also checks the
  runtime template, init assets, and the no-deprecated-shims
  invariant.

### Changed

- `plugins/bmad/skills/` regenerated from `npx bmad-method@6.10.0
  install --tools claude-code`. Headline upstream changes: PRD /
  Product Brief / Architecture / UX / GDD are single intent-based
  skills (create / update / validate detected from conversation);
  party-mode gained custom parties and persistent memory; shared
  append-only memlog (`uv run _bmad/scripts/memlog.py`) replaces
  per-skill decision logs; Edge Case Hunter gained severity triage.
- `plugins/bmad/README.md` rewritten — it still described the
  pre-v6.3 agent roster (`bmad-master`, `sm`, `quick-flow-solo-dev`)
  and old skill categories.
- `tests/e2e/skill-load.test.ts` smoke pool: `bmad-create-prd` →
  `bmad-prd`, `bmad-create-architecture` → `bmad-architecture`; added
  `bmad-spec` and `bmad-forge-idea`.
- `biome.json`: `plugins/bmad/skills/` and `plugins/bmad/runtime/`
  are fully excluded. Upstream v6.10 ships lintable assets (e.g.
  `report-shell.html`, `adapter-claude-code.json`) that biome would
  otherwise reformat, breaking the byte-for-byte mirror.
- `scripts/lib/bump-utils.ts`: idempotent re-sync no longer emits
  spurious `version not found` warnings when old == new version.
- Sync summary recounts files after pruning (was reporting the
  pre-prune copy count).

### Removed

- **Upstream deprecated shims are no longer shipped** (plugin policy:
  current surface only, no backwards compatibility):
  `bmad-create-prd`, `bmad-edit-prd`, `bmad-validate-prd`,
  `bmad-create-architecture` — all four are thin forwarders to
  `bmad-prd` / `bmad-architecture` slated for removal in upstream v7.
  Their rows are also stripped from the runtime template manifests.
- Retired upstream between v6.6.0 and v6.10.0 (absent from the
  regenerated tree): `bmad-distillator` (superseded by `bmad-spec`,
  v6.8), `bmad-create-ux-design` (replaced by `bmad-ux`, v6.8),
  `gds-create-gdd` / `gds-edit-gdd` / `gds-validate-gdd` /
  `gds-create-prd` / `gds-edit-prd` / `gds-validate-prd` /
  `gds-create-ux-design` (consolidated into `gds-gdd` / `gds-prd` /
  `gds-ux`, GDS v0.6.0). `bmad-investigate` (added v6.7, retired
  v6.10) never appeared in a plugin release.

### Breaking-change matrix (upstream v6.7.0 → v6.10.0)

| Upstream breaking change | Impact on this plugin |
| --- | --- |
| PRD/Brief/Architecture/UX consolidated into intent-based skills; old names shipped only as deprecated shims | Shims are pruned — invoke `bmad-prd`, `bmad-architecture`, `bmad-ux` directly. Existing `_bmad/custom/bmad-create-*.toml` overrides must be migrated to the new skill names. |
| `bmad-distillator` retired (v6.8), `bmad-investigate` retired (v6.10) | Removed from the plugin tree; use `bmad-spec` (and `gds-investigate` for game projects). |
| Python helpers standardized on `uv run` (v6.9; hard requirement in v7) | Skills invoke `uv run _bmad/scripts/*.py`; `/bmad:init` provisions the scripts, `uv` must be on PATH. |
| Community-modules picker + remote marketplace registry removed from installer (v6.7) | None — sync pins exact module set via `--modules bmm,bmb,cis,gds,tea`. |
| bmad-automator replaced by bmad-loop module (v6.10) | bmad-automator was never shipped; the bmad-loop skill module (v0.8.0) is now included, alongside core's `bmad-dev-auto`. The orchestrator tool installs via `/bmad:bmad-loop-setup`. |

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
