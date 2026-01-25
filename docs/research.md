# BMAD Plugin Research

Research findings on BMAD Method and Claude Code plugin ecosystem.

## Background

BMAD (Breakthrough Method for Agile AI Driven Development) is a popular
AI-driven agile development framework with 31,704 stars on GitHub. It provides
50+ workflows and 19 specialized agents for software development.

## Current State

### Official BMAD Repository

| Metric         | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Repository     | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) |
| Stars          | 31,704                                                                    |
| Latest Version | v6.0.0-alpha.23 (2026-01-11)                                              |
| Installation   | `npx bmad-method@alpha install`                                           |
| Focus          | IDE-agnostic (Cursor, Windsurf, VS Code, etc.)                            |

### Existing Claude Code Implementations

Community members have created Claude Code skill packages, but **none are
official plugins**.

| Repository                                                                                | Stars | Last Push  | Installation Method |
| ----------------------------------------------------------------------------------------- | ----- | ---------- | ------------------- |
| [aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills) | 210   | 2026-01-24 | Shell script        |
| [24601/BMAD-AT-CLAUDE](https://github.com/24601/BMAD-AT-CLAUDE)                           | 179   | 2025-09-03 | Manual copy         |
| [bacoco/BMad-Skills](https://github.com/bacoco/BMad-Skills)                               | 62    | 2025-11-04 | Shell script        |

Plus 5+ smaller implementations and 37+ forks.

### Plugin Marketplace Verification

**Verified (2026-01-25):** BMAD is NOT in the official Claude Code plugin
marketplace.

- Checked
  [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
  marketplace.json
- No BMAD entry found
- No discussion about plugin registration in aj-geddes repo (checked issues,
  discussions, README)

## Gap Identified

All existing implementations use shell script installers that copy files to
`~/.claude/skills/`. This approach has limitations:

| Limitation               | Impact                                  |
| ------------------------ | --------------------------------------- |
| No versioning            | Users don't know what version they have |
| No auto-update           | Must manually re-run installer          |
| Not discoverable         | Not listed in `/plugin` command         |
| Manual installation      | Requires git clone + running scripts    |
| No dependency management | Cannot declare dependencies             |

## Project Goal

Create a proper Claude Code plugin for BMAD Method that:

1. **Installs via standard command:** `/plugin install bmad`
2. **Supports versioning:** Track and display installed version
3. **Auto-updates:** Update when new versions are available
4. **Listed in registry:** Discoverable in official plugin marketplace
5. **Token-optimized:** Maintain the 70-85% token reduction from aj-geddes
   implementation

## Research Needed

1. **Plugin format:** What is the required structure for Claude Code plugins?
2. **Registry submission:** How to submit to anthropics/claude-plugins-official?
3. **Base implementation:** Fork aj-geddes or start fresh?
4. **Versioning strategy:** How to sync with upstream BMAD releases?

## References

- [BMAD-METHOD][bmad] - Official repository
- [aj-geddes/claude-code-bmad-skills][aj] - Most active CC implementation
- [anthropics/claude-plugins-official][plugins] - Official plugin registry
- [BMAD Skills Documentation][aj-docs] - aj-geddes docs

[bmad]: https://github.com/bmad-code-org/BMAD-METHOD
[aj]: https://github.com/aj-geddes/claude-code-bmad-skills
[plugins]: https://github.com/anthropics/claude-plugins-official
[aj-docs]: https://aj-geddes.github.io/claude-code-bmad-skills/

---

Created: 2026-01-25
