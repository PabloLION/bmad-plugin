# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

[![Synced with BMAD-METHOD](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
<!-- upstream-badges-start -->
[![BMAD Method version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version.json)](https://github.com/bmadcode/BMAD-METHOD)
[![TEA Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-tea.json)](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise)
[![BMB Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-bmb.json)](https://github.com/bmad-code-org/bmad-builder)
[![CIS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-cis.json)](https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite)
[![GDS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-gds.json)](https://github.com/bmad-code-org/bmad-module-game-dev-studio)
<!-- upstream-badges-end -->

<!-- upstream-version-start -->
**Plugin version:** v6.6.0.0

| Module | Version | Last Checked |
|---|---|---|
| [BMAD Method](https://github.com/bmadcode/BMAD-METHOD) | v6.6.0 | 2026-05-10 |
| [TEA](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise) | v1.17.0 | 2026-05-10 |
| [BMB](https://github.com/bmad-code-org/bmad-builder) | v1.7.0 | 2026-05-10 |
| [CIS](https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite) | v0.2.0 | 2026-05-10 |
| [GDS](https://github.com/bmad-code-org/bmad-module-game-dev-studio) | v0.4.0 | 2026-05-10 |
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

## Features

- **102 skills across 5 BMAD modules**, including all agent personas as
  Claude Code-native skills:
  - **6 BMM agents** — `bmad-agent-{analyst,pm,ux-designer,architect,dev,tech-writer}`
  - **35 BMM workflow skills** — analysis → planning → solutioning → implementation
  - **11 TEA skills** — `bmad-tea` (Murat) + 8 `bmad-testarch-*` + 2 helpers
  - **4 BMB skills** — `bmad-{agent,workflow,module}-builder`, `bmad-bmb-setup`
  - **10 CIS skills** — `bmad-cis-*` (design thinking, storytelling,
    problem-solving, brainstorming, innovation strategy, presentation)
  - **36 GDS skills** — full game-development studio including 5
    `gds-agent-*` personas
- **`customize.toml` per skill** — each skill ships an override surface;
  the new `bmad-customize` skill drives skill / agent customization
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
/plugin marketplace add PabloLION/bmad-plugin#v6.6.0.0
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
# Show available BMAD skills + module map
/bmad:bmad-help

# Start a workflow (e.g., draft a product brief)
/bmad:bmad-product-brief

# Customize a skill (v6.5.0+: per-skill TOML overrides)
/bmad:bmad-customize
```

> **Note (v6.5.0):** the dedicated `init` and `status` skills were removed.
> Project config now loads from `_bmad/bmm/config.yaml`.

> **Note (v6.6.0.1):** the first time you invoke a `bmad-*` or `gds-*`
> skill in a project, the plugin auto-seeds `{project-root}/_bmad/` from
> a bundled template (scripts, configs, module assets). This is what
> makes the skill's `python3 {project-root}/_bmad/scripts/resolve_customization.py`
> step succeed without a separate `npx bmad-method install` run. To
> personalize, edit `_bmad/config.user.toml` and `_bmad/bmm/config.yaml`,
> or re-run `npx bmad-method install` to walk through the installer
> prompts (your edits to `_bmad/custom/` are preserved on re-install).

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

- Brainstorming and ideation (`bmad-brainstorming`)
- Market, domain, and technical research (`bmad-market-research`,
  `bmad-domain-research`, `bmad-technical-research`)
- Product brief creation (`bmad-product-brief`)

### Phase 2: Planning

- Product Requirements Document (`bmad-create-prd`, `bmad-edit-prd`)
- PRFAQ working-backwards (`bmad-prfaq`)
- UX design specifications (`bmad-create-ux-design`)

### Phase 3: Solutioning

- System architecture (`bmad-create-architecture`)
- Epic and story breakdown (`bmad-create-epics-and-stories`)
- Implementation readiness check (`bmad-check-implementation-readiness`)

### Phase 4: Implementation

- Sprint planning + status (`bmad-sprint-planning`, `bmad-sprint-status`)
- Story development (`bmad-dev-story`, `bmad-create-story`)
- Code review (`bmad-code-review`)
- Sprint correction (`bmad-correct-course`)
- Retrospective (`bmad-retrospective`)

### Phase 5 (v6.5.0+): Customization

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

The validation script checks version consistency (each `.upstream-versions/<id>.json` is well-formed and the plugin version is anchored to the core version) and confirms `plugins/bmad/skills/` has been populated. It runs automatically as a pre-push git hook via Husky.

## Why This Plugin

There is an existing community implementation
([aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills))
with 221 stars. Here is how this plugin differs:

| | **bmad-plugin** (this repo) | aj-geddes/claude-code-bmad-skills |
|---|---|---|
| Upstream version tracked | v6.6.0 (all 5 modules pinned via `.upstream-versions/*.json`) | v6 (approximate) |
| Skills | 102 (41 BMM + 11 TEA + 4 BMB + 10 CIS + 36 GDS) | 4 |
| Agents | 21 personas (shipped as skills) | 12 |
| Source of truth | The official `npx bmad-method install --tools claude-code` output (1:1 mirror) | Manual shell-script copy |
| Automated upstream sync | Yes (GitHub Actions, weekly) | No |
| Plugin marketplace | Yes (`marketplace.json`) | No (Smithery only) |
| Last updated | 2026-05-10 (v6.6.0.0) | 2026-01-01 |

**Key advantages:**

- **Full coverage** — all 102 skills across 5 BMAD modules (core, TEA,
  BMB, CIS, GDS), including v6.5.0's new `bmad-customize` and the
  6 BMM agent personas as agent skills. Mirrors the upstream installer's
  output byte-for-byte.
- **Single source of truth** — every sync regenerates the plugin tree
  from `npx bmad-method install`, so what users get is exactly what
  upstream ships. No custom merge / rewrite layer to drift.
- **Stays up to date** — a GitHub Actions workflow watches all 5
  upstream repos weekly and creates a sync issue on new releases.
- **Tracks versions** — the plugin version (`6.6.0.0`) anchors to the
  core BMAD-METHOD release, and every module has its own pinned tag in
  `.upstream-versions/`.

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
