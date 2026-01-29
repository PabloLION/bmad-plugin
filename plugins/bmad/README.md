# BMAD Method Plugin for Claude Code

Breakthrough Method for Agile AI-Driven Development — a Claude Code plugin
that provides structured agents and skills for the full software development
lifecycle.

## Installation

### From marketplace

```sh
claude plugin add bmad
```

### From local directory

```sh
claude --plugin-dir /path/to/bmad-plugin/plugins/bmad
```

## Agents

| Agent | Role |
|-------|------|
| analyst | Business & requirements analyst |
| architect | Software architect |
| bmad-master | Orchestrator across all BMAD roles |
| dev | Developer |
| pm | Product manager |
| quick-flow-solo-dev | Solo developer quick-start flow |
| sm | Scrum master |
| tea | Test engineering analyst |
| tech-writer | Technical writer |
| ux-designer | UX designer |

## Skill categories

- **Planning** — create-product-brief, create-prd, create-architecture,
  create-epics-and-stories, create-story, sprint-planning
- **Development** — dev-story, quick-dev, quick-spec, code-review
- **Design** — create-ux-design, create-wireframe, create-dataflow,
  create-diagram, create-flowchart
- **Testing** — atdd, test-design, test-review, trace, nfr-assess, ci
- **Process** — init, status, sprint-status, retrospective, correct-course,
  check-implementation-readiness
- **Utilities** — help, research, brainstorming, document-project, framework,
  automate

## Upstream

This plugin is derived from
[bmadcode/BMAD-METHOD](https://github.com/bmadcode/BMAD-METHOD). See that
repository for full methodology documentation.
