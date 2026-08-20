# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

[![Synced with BMAD-METHOD](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml)
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
the entire `plugins/bmad/skills/` tree is regenerated from a fresh
installer run, so every file is exactly what an end-user would get from
the upstream installer. There is no custom merge / rewrite layer.

Three deliberate divergences from the raw installer output:

1. **No backwards-compatibility shims.** Upstream ships deprecated
   forwarder skills (e.g. `bmad-create-prd` → `bmad-prd`, slated for
   removal in v7). The sync prunes anything whose frontmatter
   description starts with `DEPRECATED` — the plugin publishes only
   the current skill surface.
2. **Runtime template + initializer.** The installer also writes a
   per-project `_bmad/` tree (module config, shared scripts like
   `memlog.py`, help catalogs) that skills resolve from
   `{project-root}/_bmad/` at run time. The sync captures that tree
   into `plugins/bmad/runtime/_bmad/`, and `/bmad:init` materializes
   it into your working repo (see [Step 3](#step-3-initialize-your-project)).
3. **The bmad-loop skill module.** [bmad-loop](https://github.com/bmad-code-org/bmad-loop)
   is not an npx-installer module — it is a Python orchestrator tool
   whose skills ship inside its own repo. The sync clones that repo at
   the tag pinned in `.upstream-versions/loop.json` and copies its
   `bmad-loop-{setup,resolve,sweep}` skills into the plugin.

## Features

- **103 skills across 6 BMAD modules**, including all agent personas as
  Claude Code-native skills:
  - **6 BMM agents** — `bmad-agent-{analyst,pm,ux-designer,architect,dev,tech-writer}`
  - **36 BMM workflow skills** — analysis → planning → solutioning →
    implementation, including v6.7–v6.10's intent-based `bmad-prd`,
    `bmad-architecture`, `bmad-ux`, plus `bmad-spec`,
    `bmad-forge-idea`, `bmad-dev-auto`, and `bmad-eval-runner`
  - **11 TEA skills** — `bmad-tea` (Murat) + 8 `bmad-testarch-*` + 2 helpers
  - **4 BMB skills** — `bmad-{agent,workflow,module}-builder`, `bmad-bmb-setup`
  - **10 CIS skills** — `bmad-cis-*` (design thinking, storytelling,
    problem-solving, brainstorming, innovation strategy, presentation)
  - **33 GDS skills** — full game-development studio including 5
    `gds-agent-*` personas and intent-based `gds-gdd` / `gds-prd` /
    `gds-ux`
  - **3 Loop skills** — `bmad-loop-{setup,resolve,sweep}`, the skill
    module of [bmad-loop](https://github.com/bmad-code-org/bmad-loop)
    (v6.10's successor to bmad-automator): a deterministic
    orchestrator that drives `bmad-dev-auto` through pick story →
    implement → review → verify → commit. `/bmad:bmad-loop-setup`
    installs the Python orchestrator tool itself (via `uv`)
- **Intent-based planning skills (v6.7+)** — `bmad-prd`,
  `bmad-architecture`, `bmad-ux`, `gds-gdd` detect create / update /
  validate intent from the conversation; the old `create-*` / `edit-*`
  / `validate-*` skill trios are gone
- **`/bmad:init` project initializer** — one command provisions the
  working-repo files skills depend on (`_bmad/` config, shared
  `memlog.py` / customization-resolver scripts, output folders)
- **`customize.toml` per skill** — each skill ships an override surface;
  the `bmad-customize` skill drives skill / agent customization
- **Progressive Disclosure** — step-by-step workflow execution with
  resumable state per skill

## Usage

### Step 1: Add Marketplace

> Skip this step once the plugin is listed on the official Claude Code registry.

In-session (inside Claude Code):

```sh
# Non-interactive
/plugin marketplace add PabloLION/bmad-plugin

# Interactive — use the /plugin UI → Marketplace tab
/plugin

# Pin to a specific version
/plugin marketplace add PabloLION/bmad-plugin#v6.10.0.0
```

External CLI (outside Claude Code):

```sh
claude plugin marketplace add PabloLION/bmad-plugin
```

### Step 2: Install Plugin

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

The plugin's skill files are immutable, but skills read per-project
files from `{project-root}/_bmad/` (module config, the shared
`memlog.py` / `resolve_customization.py` scripts, help catalogs) and
write artifacts to configured output folders. Run once per repo:

```sh
/bmad:init
```

The initializer is idempotent — it only fills in missing files, never
overwrites existing ones, so it is also safe to re-run after a plugin
update to pick up newly added runtime files. It creates:

- `_bmad/` — module config (`config.toml`, per-module `config.yaml`),
  shared scripts, help catalogs, and the `custom/` override layer
- `_bmad-output/planning-artifacts/`, `_bmad-output/implementation-artifacts/`
- `docs/`, `skills/{planning,implementation,test}-artifacts/` — default
  knowledge and module output folders

Commit `_bmad/` to version control so your team shares one
configuration (`_bmad/custom/*.user.toml` files are gitignored by the
shipped `_bmad/custom/.gitignore`).

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

# Sharpen a half-formed idea (new in v6.9)
/bmad:bmad-forge-idea

# Start a workflow (e.g., draft a product brief, then a PRD)
/bmad:bmad-product-brief
/bmad:bmad-prd

# Customize a skill (per-skill TOML overrides)
/bmad:bmad-customize
```

## Learn BMAD Method

New to BMAD? See the [official documentation](http://docs.bmad-method.org) for
methodology overview, workflow explanations, and best practices. The
[Getting Started Tutorial](http://docs.bmad-method.org/tutorials/getting-started/)
walks through a complete project from scratch.

## Agent Personas

As of v6.5.0+, agent personas are shipped as **skills**, not as
separate agent files. Invoke `/bmad:bmad-agent-pm` (John, the PM) or
`/bmad:bmad-tea` (Murat, the Test Architect) the same way you invoke
any other skill. The full agent roster is declared in each module's
upstream `module.yaml`; the table below lists the canonical personas.

| Skill | Persona | Module | Role |
|---|---|---|---|
| `bmad-agent-analyst` | Mary | BMM | Business Analyst |
| `bmad-agent-pm` | John | BMM | Product Manager |
| `bmad-agent-ux-designer` | Sally | BMM | UX Designer |
| `bmad-agent-architect` | Winston | BMM | System Architect |
| `bmad-agent-dev` | Amelia | BMM | Senior Software Engineer |
| `bmad-agent-tech-writer` | Paige | BMM | Technical Writer |
| `bmad-tea` | Murat | TEA | Master Test Architect |
| `bmad-cis-agent-brainstorming-coach` | Carson | CIS | Brainstorming Coach |
| `bmad-cis-agent-creative-problem-solver` | Dr. Quinn | CIS | Problem-Solving Expert |
| `bmad-cis-agent-design-thinking-coach` | Maya | CIS | Design Thinking Coach |
| `bmad-cis-agent-innovation-strategist` | Victor | CIS | Innovation Strategist |
| `bmad-cis-agent-presentation-master` | Caravaggio | CIS | Presentation Expert |
| `bmad-cis-agent-storyteller` | Sophia | CIS | Master Storyteller |
| `bmad-agent-builder` | Bond | BMB | Agent Building Expert |
| `bmad-workflow-builder` | Wendy | BMB | Workflow Building Master |
| `bmad-module-builder` | Morgan | BMB | Module Creation Master |
| `gds-agent-game-architect` | Cloud Dragonborn | GDS | Principal Game Systems Architect |
| `gds-agent-game-designer` | Samus Shepard | GDS | Lead Game Designer |
| `gds-agent-game-dev` | Link Freeman | GDS | Senior Game Developer |
| `gds-agent-game-solo-dev` | Indie | GDS | Elite Indie Game Developer |
| `gds-agent-tech-writer` | Paige (game-scoped) | GDS | Game Technical Writer |

## Workflow Phases

### Phase 1: Analysis

- Idea forging — Socratic interrogation of half-formed ideas
  (`bmad-forge-idea`, new in v6.9)
- Brainstorming and ideation (`bmad-brainstorming`)
- Market, domain, and technical research (`bmad-market-research`,
  `bmad-domain-research`, `bmad-technical-research`)
- Product brief creation (`bmad-product-brief`)

### Phase 2: Planning

- Product Requirements Document — create / update / validate in one
  intent-based skill (`bmad-prd`)
- Spec kernel — distill messy intent into a tight SPEC.md
  (`bmad-spec`, new in v6.8)
- PRFAQ working-backwards (`bmad-prfaq`)
- UX design — DESIGN.md + EXPERIENCE.md (`bmad-ux`, replaces
  `bmad-create-ux-design`)

### Phase 3: Solutioning

- System architecture — lean ARCHITECTURE-SPINE.md as source of truth
  (`bmad-architecture`, rewritten in v6.9)
- Epic and story breakdown (`bmad-create-epics-and-stories`)
- Implementation readiness check (`bmad-check-implementation-readiness`)

### Phase 4: Implementation

- Sprint planning + status (`bmad-sprint-planning`, `bmad-sprint-status`)
- Story development (`bmad-dev-story`, `bmad-create-story`)
- Unattended dev loop (`bmad-dev-auto`, new in v6.10)
- Code review (`bmad-code-review`)
- Sprint correction (`bmad-correct-course`)
- Retrospective (`bmad-retrospective`)

### Phase 5: Customization

- Per-skill `[agent]` and `[workflow]` TOML overrides (`bmad-customize`)
- Layered config: base `customize.toml` → team `.toml` → user `.user.toml`

## Attribution

This plugin implements the **BMAD Method** created by **BMad Code, LLC**.

- [Original Repository](https://github.com/bmadcode/BMAD-METHOD)
- [Website](https://bmadcodes.com/bmad-method/)
- [YouTube](https://www.youtube.com/@BMadCode)
- [Discord](https://discord.gg/gk8jAdXWmj)

## Releases

Plugin updates are published **every Wednesday** when upstream changes are detected.
No release is made if nothing changed. See [docs/versioning.md](docs/versioning.md)
for the full versioning strategy.

## Development

This repository includes verification tooling (in `scripts/` and `package.json`) that validates the plugin implementation fully covers the upstream BMAD-METHOD content. The tooling is not part of the plugin itself.

```sh
bun install          # install dependencies (Husky hooks set up automatically)
bun run validate     # run upstream coverage validation
```

The validation script checks version consistency (each `.upstream-versions/<id>.json` is well-formed and the plugin version is anchored to the core version), confirms `plugins/bmad/skills/` has been populated with no deprecated upstream shims, and verifies the runtime template + init assets (`plugins/bmad/runtime/_bmad/`, `scripts/init.sh`, `commands/init.md`) are in place. It runs automatically as a pre-push git hook via Husky.

## Why This Plugin

There is an existing community implementation
([aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills))
with 221 stars. Here is how this plugin differs:

| | **bmad-plugin** (this repo) | aj-geddes/claude-code-bmad-skills |
|---|---|---|
| Upstream version tracked | v6.10.0 (all 6 modules pinned via `.upstream-versions/*.json`) | v6 (approximate) |
| Skills | 103 (42 BMM + 11 TEA + 4 BMB + 10 CIS + 33 GDS + 3 Loop) | 4 |
| Agents | 21 personas (shipped as skills) | 12 |
| Source of truth | The official `npx bmad-method install --tools claude-code` output (deprecated shims pruned) | Manual shell-script copy |
| Project initializer | Yes (`/bmad:init` — `_bmad/` runtime + output folders) | No |
| Automated upstream sync | Yes (GitHub Actions, weekly) | No |
| Plugin marketplace | Yes (`marketplace.json`) | No (Smithery only) |
| Last updated | 2026-07-04 (v6.10.0.0) | 2026-01-01 |

**Key advantages:**

- **Full coverage** — all 103 current-surface skills across 6 BMAD
  modules (core, TEA, BMB, CIS, GDS, Loop), including the intent-based
  planning skills from v6.7–v6.10 and the 6 BMM agent personas as
  agent skills. Mirrors the upstream installer's output byte-for-byte
  — minus upstream's deprecated compatibility shims, which are pruned.
- **Single source of truth** — every sync regenerates the plugin tree
  from `npx bmad-method install`, so what users get is exactly what
  upstream ships. No custom merge / rewrite layer to drift.
- **Works out of the box** — `/bmad:init` provisions the per-project
  `_bmad/` runtime (config, shared scripts, help catalogs) that skills
  depend on and that a plugin alone cannot deliver.
- **Stays up to date** — a GitHub Actions workflow watches all 6
  upstream repos weekly and creates a sync issue on new releases.
- **Tracks versions** — the plugin version (`6.10.0.0`) anchors to the
  core BMAD-METHOD release, and every module has its own pinned tag in
  `.upstream-versions/`.

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
