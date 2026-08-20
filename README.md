# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

[![Synced with BMAD-METHOD](https://github.com/tgorka/bmad-plugin/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/tgorka/bmad-plugin/actions/workflows/sync-upstream.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
<!-- upstream-badges-start -->
[![BMAD Method version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version.json)](https://github.com/bmad-code-org/BMAD-METHOD)
[![TEA Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-tea.json)](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise)
[![BMB Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-bmb.json)](https://github.com/bmad-code-org/bmad-builder)
[![CIS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-cis.json)](https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite)
[![GDS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-gds.json)](https://github.com/bmad-code-org/bmad-module-game-dev-studio)
[![Loop Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-bmad-loop.json)](https://github.com/bmad-code-org/bmad-loop)
[![Manticore Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-manticore.json)](https://github.com/bmad-code-org/bmad-manticore)
[![Module template Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/tgorka/bmad-plugin/main/.github/badges/upstream-version-module-template.json)](https://github.com/bmad-code-org/bmad-module-template)
<!-- upstream-badges-end -->

<!-- upstream-version-start -->
**Plugin version:** v6.11.0.0

| Module | Version | Delivery | Last Checked |
|---|---|---|---|
| [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) | v6.11.0 | installer | 2026-08-20 |
| [TEA](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise) | v1.23.3 | installer module | 2026-08-20 |
| [BMB](https://github.com/bmad-code-org/bmad-builder) | v2.2.1 | installer module | 2026-08-20 |
| [CIS](https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite) | v0.3.1 | installer module | 2026-08-20 |
| [GDS](https://github.com/bmad-code-org/bmad-module-game-dev-studio) | v0.7.1 | installer module | 2026-08-20 |
| [Loop](https://github.com/bmad-code-org/bmad-loop) | v0.11.0 | installer module | 2026-08-20 |
| [Manticore](https://github.com/bmad-code-org/bmad-manticore) | v1.0.1 | custom source | 2026-08-20 |
| [Module template](https://github.com/bmad-code-org/bmad-module-template) | f1440ec8 | vendored asset | 2026-08-20 |
<!-- upstream-version-end -->

A Claude Code plugin that transforms Claude into a complete agile development
environment with specialized agents, structured workflows, and intelligent
context management.

## How it's built

This plugin is a **thin wrapper around the official `npx bmad-method
install --tools claude-code`** output. On every sync (`bun run sync`),
the entire skill tree is regenerated from a fresh installer run, so every
file is exactly what an end-user would get from the upstream installer.
There is no custom merge / rewrite layer, and nothing under
`plugins/*/skills/` or `plugins/*/runtime/` is ever hand-edited.

What the sync adds on top of the raw installer output:

1. **Runtime template + initializer.** The installer also writes a
   per-project `_bmad/` tree (module config, shared scripts like
   `memlog.py` and `render_skill.py`, help catalogs) that skills resolve
   from `{project-root}/_bmad/` at run time. The sync captures that tree
   into `plugins/bmad/runtime/_bmad/`, replacing the values the
   installing machine baked in with `__BMAD_PROJECT_NAME__`,
   `__BMAD_USER_NAME__` and `__BMAD_INSTALL_DATE__`. `/bmad:init`
   materializes it into your working repo (see
   [Step 3](#step-3-initialize-your-project)).
2. **A second plugin for BMad Manticore.** Manticore is a real BMad
   module but is absent from upstream's `bmad-modules.yaml` registry, so
   the sync clones it at a pinned tag and installs it through
   `--custom-source` in its own installer run. It ships as a separate
   marketplace entry rather than 15 more skills in the aggregate — see
   [Optional: BMad Manticore](#optional-bmad-manticore).
3. **The upstream module-authoring scaffold**, vendored (not published)
   under `plugins/bmad/templates/module-template/`.

**Changed in v6.11.0.0: deprecated shims now ship.** Up to v6.10 the sync
pruned upstream's v6 forwarder skills. That is no longer correct —
upstream's own `v6-shims/README.md` states "External module repos (gds,
loop, tea, bmb, os-utils) still invoke these IDs, so they ship by
default. Removal rides the v7 cut — never a 6.x minor." Pruning them in a
6.x minor breaks cross-module invocation. 20 of the 110 skills are such
shims; they forward to their replacement and are not listed below.
Rationale in [docs/plan-6.11-rebuild.md](docs/plan-6.11-rebuild.md).

## Requirements

- **Claude Code** with plugin support.
- **`uv` and Python ≥ 3.11** — required by `bmad-build` and
  `bmad-build-auto`. As of upstream v6.11 those two skills carry no
  workflow logic of their own: they run
  `uv run _bmad/scripts/render_skill.py` and **halt** if `uv` is
  unavailable. Every other skill degrades gracefully. `/bmad:init` warns
  when `uv` is missing.
  `curl -LsSf https://astral.sh/uv/install.sh | sh`

## Features

**110 skills across 7 upstream modules**, agent personas included as
Claude Code-native skills. Counts are the installer's own
`_config/skill-manifest.csv` grouping:

| Module | Skills | Highlights |
|---|---|---|
| core | 14 | `bmad-help`, `bmad-review` (one review skill, many lenses), `bmad-deep-recon`, `bmad-project-context`, `bmad-party-mode`, `bmad-customize` |
| bmm | 35 | 5 `bmad-agent-*` personas, `bmad-prd`, `bmad-architecture`, `bmad-ux`, `bmad-spec`, `bmad-build`, `bmad-build-auto`, `bmad-sprint-planning`, `bmad-code-review`, `bmad-retrospective` |
| gds | 33 | Game Dev Studio: 5 `gds-agent-*` personas plus `gds-gdd` / `gds-prd` / `gds-ux` and the production pipeline |
| core+bmm shims | (20 of the above) | v6 forwarder IDs external modules still call |
| tea | 10 | `bmad-tea` (Murat) + 8 `bmad-testarch-*` + `bmad-teach-me-testing` |
| cis | 10 | 6 `bmad-cis-agent-*` personas + design thinking, storytelling, innovation strategy, problem solving |
| bmb | 5 | `bmad-{agent,workflow,module}-builder`, `bmad-bmb-setup` |
| bmad-loop | 3 | `bmad-loop-{setup,resolve,sweep}` — the skill side of the unattended orchestrator |

Plus, as a separate opt-in plugin: **15 `mc-*` skills** (BMad Manticore,
AI video production).

Notable in this release:

- **Phase 4 is one chain** — `bmad-sprint-planning` → `bmad-build` →
  `bmad-code-review`. `bmad-quick-dev` and `bmad-dev-auto` were renamed
  to `bmad-build` / `bmad-build-auto`; `bmad-create-story` and
  `bmad-dev-story` are deprecated but still run when invoked by name.
- **Review consolidated** — the adversarial, edge-case, verification-gap
  and editorial reviewers are now lenses on `bmad-review`, configurable
  from `_bmad/custom/bmad-review.toml`.
- **Research consolidated** — market / domain / technical research is one
  `bmad-deep-recon` skill with six type packs.
- **`bmad-project-context`** replaces generated project documentation
  with one verified block in the repository's `AGENTS.md`.
- **`/bmad:init` project initializer** — one command provisions the
  working-repo files skills depend on, and registers sibling plugins.
- **`customize.toml` per skill** — layered
  `customize.toml` → `_bmad/custom/<skill>.toml` → `.user.toml`.

## Usage

### Step 1: Add Marketplace

> Skip this step once the plugin is listed on the official Claude Code registry.

In-session (inside Claude Code):

```sh
# Non-interactive
/plugin marketplace add tgorka/bmad-plugin

# Interactive — use the /plugin UI → Marketplace tab
/plugin

# Pin to a specific version
/plugin marketplace add tgorka/bmad-plugin#v6.11.0.0
```

External CLI (outside Claude Code):

```sh
claude plugin marketplace add tgorka/bmad-plugin
```

### Step 2: Install Plugin

The marketplace publishes two plugins. `bmad` is the one you want;
`bmad-manticore` is opt-in and depends on it.

In-session (inside Claude Code):

```sh
# Non-interactive — installs at default (user) scope
/plugin install bmad@bmad-method

# Interactive — use the /plugin UI → Discover tab → choose scope
/plugin
```

External CLI (outside Claude Code):

```sh
# User scope (default — you, all projects)
claude plugin install bmad@bmad-method

# Project scope (shared with team, committed to repo)
claude plugin install bmad@bmad-method --scope project

# Local scope (you only, this repo only)
claude plugin install bmad@bmad-method --scope local
```

### Installation Scopes

| Scope | Who sees it | Stored in |
|---|---|---|
| **User** (default) | You, all projects | `~/.claude/settings.json` |
| **Project** | All collaborators | `.claude/settings.json` (in repo) |
| **Local** | You, this repo only | `.claude/settings.local.json` |

### Step 3: Initialize Your Project

The plugin's skill files are immutable, but skills read per-project files
from `{project-root}/_bmad/` (module config, the shared `memlog.py` /
`resolve_config.py` / `render_skill.py` scripts, help catalogs) and write
artifacts to configured output folders. Run once per repo:

```sh
/bmad:init
```

The initializer is idempotent and it **upgrades**, not just seeds:
`_bmad/custom/**` is the user-owned layer and is never touched, while
everything else is installer-managed (upstream's own header calls it
"Regenerated on every install — treat as read-only") and is refreshed
when it differs from the shipped template. Re-run it after every plugin
update — that is how a repo initialized under an older version picks up
new shared scripts and a current help catalog. A second run on an
up-to-date repo reports `0 created, 0 refreshed`. It creates:

- `_bmad/` — module config (`config.toml`, `config.user.toml`,
  per-module `config.yaml`), shared scripts, help catalogs, the
  `custom/` override layer, and the `render/` snapshot area
- `_bmad-output/planning-artifacts/`, `_bmad-output/implementation-artifacts/`
- `docs/`, `skills/{planning,implementation,test}-artifacts/` — default
  knowledge and module output folders. The `skills/` ones come from the
  gds/tea/bmb module defaults upstream ships; they are reproduced here so
  an initialized repo matches a real install.

Project name comes from the directory, user name from
`git config user.name` (falling back to `$USER`).

Commit `_bmad/` to version control so your team shares one configuration
(`_bmad/custom/*.user.toml` files are gitignored by the shipped
`_bmad/custom/.gitignore`).

### Optional: BMad Manticore

`bmad-manticore` is an AI video production pipeline: brain dump → script
in your own words → word-level cut plan → preview render → brand-themed
motion graphics → title/thumbnail package → offered final render, with
hard approval gates at every taste decision.

It ships as a **separate plugin** because its prerequisites (ffmpeg,
node/npx, uv, Python ≥ 3.11, multi-GB model caches) are irrelevant to
most users, and because 14 of its 15 skills fail closed until `mc-setup`
has run.

```sh
/plugin install bmad-manticore@bmad-method

# register it with the working repo so bmad-help lists its skills
/bmad:init
```

`/bmad:init` detects an installed sibling plugin from its own loaded
skill list and passes `--with-plugin bmad-manticore` to the initializer,
which materializes `_bmad/manticore/` and merges the module's rows into
`_bmad/_config/bmad-help.csv`. Then say **"talk to Manny"** and run
`mc-setup` once.

See [plugins/bmad-manticore/README.md](plugins/bmad-manticore/README.md)
for prerequisites and the two known upstream defects at v1.0.1.

### Troubleshooting: Plugin Update Shows Stale Version

`claude plugin update` may report the plugin is "already at the latest version"
even when a newer version exists. This is a
[known Claude Code bug](https://github.com/anthropics/claude-code/issues/28540)
where the marketplace cache is not fetched before comparing versions.

Workaround — manually pull the marketplace cache, then retry:

```sh
git -C ~/.claude/plugins/marketplaces/bmad-method pull origin main
claude plugin update bmad@bmad-method
```

### Quick Start

```bash
# Initialize the repo (once): _bmad/ config + output folders
/bmad:init

# Show available BMAD skills + module map
/bmad:bmad-help

# Sharpen a half-formed idea
/bmad:bmad-forge-idea

# Plan: product brief, then a PRD, then the architecture spine
/bmad:bmad-product-brief
/bmad:bmad-prd
/bmad:bmad-architecture

# Build: sprint plan -> implement -> review
/bmad:bmad-sprint-planning
/bmad:bmad-build
/bmad:bmad-code-review

# Customize a skill (per-skill TOML overrides)
/bmad:bmad-customize
```

## Learn BMAD Method

New to BMAD? See the [official documentation](http://docs.bmad-method.org) for
methodology overview, workflow explanations, and best practices. The
[Getting Started Tutorial](http://docs.bmad-method.org/tutorials/getting-started/)
walks through a complete project from scratch.

## Agent Personas

As of v6.5.0+, agent personas are shipped as **skills**, not as separate
agent files. Invoke `/bmad:bmad-agent-pm` (John, the PM) or
`/bmad:bmad-tea` (Murat, the Test Architect) the same way you invoke any
other skill. The roster below is the one upstream writes into
`_bmad/config.toml` — 17 personas.

| Skill | Persona | Module | Role |
|---|---|---|---|
| `bmad-agent-analyst` | Mary | BMM | Business Analyst |
| `bmad-agent-pm` | John | BMM | Product Manager |
| `bmad-agent-ux-designer` | Sally | BMM | UX Designer |
| `bmad-agent-architect` | Winston | BMM | System Architect |
| `bmad-agent-dev` | Amelia | BMM | Senior Software Engineer |
| `bmad-tea` | Murat | TEA | Master Test Architect |
| `bmad-cis-agent-brainstorming-coach` | Carson | CIS | Brainstorming Coach |
| `bmad-cis-agent-creative-problem-solver` | Dr. Quinn | CIS | Problem-Solving Expert |
| `bmad-cis-agent-design-thinking-coach` | Maya | CIS | Design Thinking Coach |
| `bmad-cis-agent-innovation-strategist` | Victor | CIS | Innovation Strategist |
| `bmad-cis-agent-presentation-master` | Caravaggio | CIS | Presentation Expert |
| `bmad-cis-agent-storyteller` | Sophia | CIS | Master Storyteller |
| `bmad-agent-builder` | Bond | BMB | Agent Building Expert |
| `gds-agent-game-architect` | Cloud Dragonborn | GDS | Principal Game Systems Architect |
| `gds-agent-game-designer` | Samus Shepard | GDS | Lead Game Designer |
| `gds-agent-game-dev` | Link Freeman | GDS | Senior Game Developer |
| `gds-agent-game-solo-dev` | Indie | GDS | Elite Indie Game Developer |
| `gds-agent-tech-writer` | Paige (game-scoped) | GDS | Game Technical Writer |

`bmad-agent-tech-writer` (Paige, BMM) was **retired upstream in v6.11.0**;
her replacement is expected as an optional installable agent. The
game-scoped `gds-agent-tech-writer` is unaffected. `bmad-workflow-builder`
and `bmad-module-builder` remain as skills but are no longer declared as
personas in the roster.

## Workflow Phases

### Phase 1: Analysis

- Idea forging — Socratic interrogation of half-formed ideas
  (`bmad-forge-idea`)
- Brainstorming and ideation (`bmad-brainstorming`)
- Research — market, domain, technical, competitive, user-voice and
  academic-lit type packs in one skill (`bmad-deep-recon`)
- Product brief creation (`bmad-product-brief`)

### Phase 2: Planning

- Product Requirements Document — create / update / validate in one
  intent-based skill (`bmad-prd`)
- Spec kernel — distill messy intent into a tight SPEC.md, optionally
  emitting `stories.yaml` (`bmad-spec`)
- PRFAQ working-backwards (`bmad-prfaq`)
- UX design — DESIGN.md + EXPERIENCE.md (`bmad-ux`)

### Phase 3: Solutioning

- System architecture — lean ARCHITECTURE-SPINE.md as source of truth
  (`bmad-architecture`)
- Epic and story breakdown (`bmad-create-epics-and-stories`)

### Phase 4: Implementation

One chain: `bmad-sprint-planning` → `bmad-build` → `bmad-code-review`.

- Sprint planning, status view and repair, opening with a readiness gate
  that replaced `bmad-check-implementation-readiness`
  (`bmad-sprint-planning`)
- Implementation (`bmad-build`) and the unattended loop
  (`bmad-build-auto`) — both require `uv`
- Code review with configurable parallel review layers
  (`bmad-code-review`)
- Sprint correction (`bmad-correct-course`)
- Evidence-based epic retrospective (`bmad-retrospective`)

### Phase 5: Customization

- Per-skill `[agent]` and `[workflow]` TOML overrides (`bmad-customize`)
- Layered config: `_bmad/config.toml` → `config.user.toml` →
  `custom/config.toml` → `custom/config.user.toml`; per skill,
  `customize.toml` → `_bmad/custom/<skill>.toml` → `.user.toml`
- Project context recorded as a verified block in `AGENTS.md`
  (`bmad-project-context`)

## Attribution

This plugin implements the **BMAD Method** created by **BMad Code, LLC**.

- [Original Repository](https://github.com/bmadcode/BMAD-METHOD)
- [Website](https://bmadcodes.com/bmad-method/)
- [YouTube](https://www.youtube.com/@BMadCode)
- [Discord](https://discord.gg/gk8jAdXWmj)

## Releases

A release is cut when upstream changes are detected and verified — see
[docs/releasing.md](docs/releasing.md) for the workflow and
[docs/versioning.md](docs/versioning.md) for the versioning strategy.

## Development

This repository includes the tooling that regenerates and verifies the
plugin tree (in `scripts/` and `package.json`). None of it ships inside
the plugin.

```sh
bun install                          # deps + Husky hooks
bun run sync                         # regenerate from the pinned versions
bun run sync -- --tag v6.12.0        # regenerate against a new core release
bun run sync:dry                     # preview without writing
bun run validate                     # gates
bun run test:unit                    # plugin-tree + init-script tests
bun run test                         # also runs e2e (needs the `claude` CLI)
```

`bun run validate` runs as a pre-push hook and checks:

- **Version pinning** — every `.upstream-versions/<id>.json` is
  well-formed, the plugin version is anchored to core, registry and
  custom sources pin a `v`-prefixed release tag, and vendored sources
  pin a full 40-character commit SHA.
- **Marketplace integrity** — every declared plugin resolves to a real
  directory whose `plugin.json` name and version match its marketplace
  entry and whose `skills/` is non-empty; and every `plugins/<dir>` is
  published, so no dead weight rides along in marketplace clones.
- **Skill surface** — `plugins/bmad/skills/` equals the installer's own
  `_config/skill-manifest.csv` in both directions.
- **Templatization** — no vendored file carries the throwaway install-dir
  name or a `user_name` other than the placeholder, and no live nested
  `.gitignore` exists (it would strip its siblings out of every
  marketplace clone).
- **Runtime template + init assets** are present.

**Never hand-edit `plugins/*/skills/`, `plugins/*/runtime/` or
`plugins/bmad/templates/module-template/`** — all are wiped and
regenerated on every sync, and all are excluded from biome, markdownlint
and tsc so upstream content stays byte-identical to the installer output.

## Why This Plugin

There is an existing community implementation
([aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills))
with 221 stars. Here is how this plugin differs:

| | **bmad-plugin** (this repo) | aj-geddes/claude-code-bmad-skills |
|---|---|---|
| Upstream version tracked | v6.11.0 (8 sources pinned via `.upstream-versions/*.json`) | v6 (approximate) |
| Skills | 110 in `bmad` (core 14 + bmm 35 + gds 33 + tea 10 + cis 10 + bmb 5 + loop 3), plus 15 in `bmad-manticore` | 4 |
| Agents | 17 personas (shipped as skills) | 12 |
| Source of truth | The official `npx bmad-method install --tools claude-code` output, copied 1:1 | Manual shell-script copy |
| Project initializer | Yes (`/bmad:init` — `_bmad/` runtime + output folders + sibling-plugin registration) | No |
| Automated upstream sync | Yes (GitHub Actions, weekly, matrix-driven from the source registry) | No |
| Plugin marketplace | Yes, two plugins (`marketplace.json`) | No (Smithery only) |
| Last updated | 2026-08-20 (v6.11.0.0) | 2026-01-01 |

**Key advantages:**

- **Full coverage** — the complete v6.11.0 surface across seven upstream
  modules, including every agent persona as a skill, mirrored
  byte-for-byte from the upstream installer.
- **Single source of truth** — every sync regenerates the plugin tree
  from `npx bmad-method install`, so what users get is exactly what
  upstream ships. No merge or rewrite layer to drift, and the gates
  compare the committed tree against the installer's own manifest.
- **Works out of the box** — `/bmad:init` provisions the per-project
  `_bmad/` runtime that skills depend on and that a plugin alone cannot
  deliver.
- **Stays up to date** — a weekly GitHub Actions matrix watches every
  registered upstream repo and opens a sync issue on a new release.
- **Tracks versions honestly** — module versions are read back from the
  installer's own `_bmad/_config/manifest.yaml` rather than guessed, and
  no machine-specific value from the syncing host reaches the tree.

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
