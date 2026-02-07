# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

[![Synced with BMAD-METHOD](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml)
[![BMAD Method version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version.json)](https://github.com/bmad-code-org/BMAD-METHOD)
[![TEA Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-tea.json)](https://github.com/bmad-code-org/BMAD-TEA)
[![BMB Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-bmb.json)](https://github.com/bmad-code-org/bmad-builder)
[![CIS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-cis.json)](https://github.com/bmad-code-org/bmad-module-creative-intelligence-suite)
[![GDS Module version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version-gds.json)](https://github.com/bmad-code-org/bmad-module-game-dev-studio)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- upstream-version-start -->
**Plugin version:** v6.0.0-Beta.4.5 | **Upstream version:** v6.0.0-Beta.4 | **Last synced:** 2026-02-06
<!-- upstream-version-end -->

A Claude Code plugin that transforms Claude into a complete agile development
environment with specialized agents, structured workflows, and intelligent
context management.

## Installation

### Step 1: Add Marketplace

> Skip this step once the plugin is listed on the official Claude Code registry.

In-session (inside Claude Code):

```sh
# Non-interactive
/plugin marketplace add PabloLION/bmad-plugin

# Interactive — use the /plugin UI → Marketplace tab
/plugin

# Pin to a specific version
/plugin marketplace add PabloLION/bmad-plugin#v6.0.0-Beta.4.2
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

## Features

- **9 Specialized Agents**: Business Analyst, Product Manager, UX Designer,
  System Architect, Scrum Master, Developer, QA Engineer, Tech Writer, and
  Solo Dev
- **26 Guided Workflows**: From brainstorming to implementation
- **4 Development Phases**: Analysis, Planning, Solutioning, Implementation
- **Progressive Disclosure**: Step-by-step workflow execution
- **State Tracking**: Resume workflows across sessions

## Quick Start

```bash
# Initialize BMAD in your project
/bmad:init

# Check workflow status
/bmad:status

# Start a workflow
/bmad:product-brief
```

## Agents

| Agent                  | Name    | Role                       | Key Workflows                    |
| ---------------------- | ------- | -------------------------- | -------------------------------- |
| analyst                | Mary    | Business analysis          | product-brief, research, brainstorm |
| pm                     | John    | Product requirements       | create-prd, create-epics-and-stories |
| ux-designer            | Sally   | User experience            | create-ux-design                 |
| architect              | Winston | System design              | create-architecture              |
| sm                     | Bob     | Sprint management          | sprint-planning, create-story    |
| dev                    | Amelia  | Implementation             | dev-story, code-review           |
| tea                    | Murat   | Test architecture          | atdd, ci, test-design, framework |
| quinn                  | Quinn   | QA automation              | automate, test-review            |
| tech-writer            | Paige   | Documentation              | document-project                 |
| quick-flow-solo-dev    | Barry   | Solo dev quick flow        | quick-spec, quick-dev            |

## Workflow Phases

### Phase 1: Analysis

- Brainstorming and ideation
- Market and competitive research
- Product brief creation

### Phase 2: Planning

- Product Requirements Document (PRD)
- UX design specifications

### Phase 3: Solutioning

- System architecture
- Epic and story breakdown
- Implementation readiness

### Phase 4: Implementation

- Sprint planning
- Story development
- Code review

## Attribution

This plugin implements the **BMAD Method** created by **BMad Code, LLC**.

- [Original Repository](https://github.com/bmad-code-org/BMAD-METHOD)
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

The validation script checks three-way consistency: upstream BMAD-METHOD repo, plugin files, and `plugin.json` manifest. It runs automatically as a pre-push git hook via Husky.

## Why This Plugin

There is an existing community implementation
([aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills))
with 221 stars. Here is how this plugin differs:

| | **bmad-plugin** (this repo) | aj-geddes/claude-code-bmad-skills |
|---|---|---|
| Upstream version tracked | v6.0.0-Beta.4 (explicit) | v6 (approximate) |
| Skills | 26 | 4 |
| Agents | 10 | 12 |
| Automated upstream sync | Yes (GitHub Actions) | No |
| Version tracking | Explicit with `.upstream-version-<id>` files | None |
| CI & validation | Biome, markdownlint, Husky, upstream coverage checks | None |
| Plugin marketplace | Yes (`marketplace.json`) | No (Smithery only) |
| Architecture | Roles → agents, workflows → skills (correct mapping) | Roles → skills (incorrect mapping) |
| Last updated | Active | 2026-01-01 |

**Key advantages:**

- **Full coverage** — all 26 BMAD-METHOD workflows are available as skills,
  not just 4. Every workflow from the official repo has a matching skill
- **Correct role mapping** — BMAD roles (PM, Architect, etc.) are modeled as
  agents with isolated context, not lumped into skills. The alternative treats
  roles and workflows the same way, which breaks Claude Code's agent model
- **Stays up to date** — a GitHub Actions workflow checks BMAD-METHOD weekly
  for new releases and creates an issue when one is found. No manual checking
- **Catches drift** — a pre-push hook validates that every agent, skill, and
  file in this plugin matches the official BMAD-METHOD repo. If something is
  missing or out of date, the push is blocked
- **Tracks versions** — the plugin version (`6.0.0-Beta.4.2`) includes the
  upstream version so you always know which BMAD-METHOD release you're running

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
