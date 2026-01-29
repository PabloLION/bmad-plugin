# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

[![Synced with BMAD-METHOD](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/PabloLION/bmad-plugin/actions/workflows/sync-upstream.yml)
[![BMAD Method version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/PabloLION/bmad-plugin/main/.github/badges/upstream-version.json)](https://github.com/bmad-code-org/BMAD-METHOD)
[![Skills Visibility Fix](https://github.com/PabloLION/bmad-plugin/actions/workflows/check-workarounds.yml/badge.svg)](https://github.com/PabloLION/bmad-plugin/actions/workflows/check-workarounds.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- upstream-version-start -->
**Plugin version:** v6.0.0-Beta.4.1 | **Upstream version:** v6.0.0-Beta.4 | **Last synced:** 2026-01-29
<!-- upstream-version-end -->

A Claude Code plugin that transforms Claude into a complete agile development
environment with specialized agents, structured workflows, and intelligent
context management.

## Installation

### From Self-Hosted Marketplace

```bash
# Add marketplace
/plugin marketplace add PabloLION/bmad-plugin

# Install plugin
/plugin install bmad@bmad-method
```

### From Official Registry

Coming soon - pending submission to the official Anthropic plugin registry.

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

| Agent                   | Role                        | Key Workflows                       |
| ----------------------- | --------------------------- | ----------------------------------- |
| **Analyst** (Mary)      | Business analysis, research | product-brief, research, brainstorm |
| **PM** (John)           | Product requirements        | create-prd, validate-prd, epics     |
| **UX Designer** (Sally) | User experience             | create-ux-design                    |
| **Architect** (Winston) | System design               | create-architecture                 |
| **SM** (Bob)            | Sprint management           | sprint-planning, create-story       |
| **DEV** (Amelia)        | Implementation              | dev-story, code-review              |
| **Quinn**               | QA engineer                 | automate                            |
| **Tech Writer** (Paige) | Documentation               | document-project                    |
| **Barry**               | Solo dev quick flow         | quick-spec, quick-dev               |

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
| Version tracking | Explicit with `.upstream-version` | None |
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
- **Tracks versions** — the plugin version (`6.0.0-Beta.4.1`) includes the
  upstream version so you always know which BMAD-METHOD release you're running

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
