# BMAD Plugin for Claude Code

> BMAD Method - Breakthrough Method for Agile AI-Driven Development

<!-- upstream-version-start -->
**Plugin version:** v6.0.0-Beta.2.0 | **Upstream version:** v6.0.0-Beta.2 | **Last synced:** 2026-01-28
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
/plugin install bmad@bmad-marketplace
```

### From Official Registry

Coming soon - pending submission to the official Anthropic plugin registry.

## Features

- **9 Specialized Agents**: Business Analyst, Product Manager, UX Designer,
  System Architect, Scrum Master, Developer, Test Architect, Tech Writer, and
  Solo Dev
- **27+ Guided Workflows**: From brainstorming to implementation
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
| **TEA** (Murat)         | Test architecture           | test-framework, atdd                |
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

- [Original Repository](https://github.com/bmadcode/BMAD-METHOD)
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

## License

MIT License - See [LICENSE](LICENSE) for details.

BMad, BMad Method, and BMad Core are trademarks of BMad Code, LLC.
