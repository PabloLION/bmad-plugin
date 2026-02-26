# Roles

How to manage multi-agent dispatch sessions. The main thread is the
**orchestrator** (maestro) — it conducts the symphony, never plays an
instrument.

## Prerequisites

This ruleset assumes the following are set up in the project:

- **beads** — git-backed issue tracker (`bd create`, `bd show`, `bd close`,
  `bd sync`). All task tracking goes through beads, not TodoWrite or markdown.
- **Named agents** — defined in `.claude/agents/` per the template in
  `agent-template.md`. Define agents before dispatching so their IDs survive
  compaction. Settings like `isolation`, `memory`, and `background` are
  configured in agent frontmatter, not as prose rules.
- **Git worktrees** — used for agent isolation via `isolation: worktree` in
  agent frontmatter. Each dispatch gets a fresh worktree from current main.
- **Post-merge git hook** — runs formatting auto-fix and the project test suite
  after each merge. Ensures drift is caught immediately.
- **Project test suite** — a command (or set of commands) that runs tests and
  linting for the project. Referenced as "project test suite" throughout —
  substitute your actual commands (e.g., `cargo test && cargo clippy`,
  `npm test && npm run lint`, `pytest && ruff check`).

## Main Thread Role

The main thread is the **orchestrator**. It does NOT write code (except 1-2 line
fixes). Responsibilities:

- Assess task readiness per issue
- Present issues to user before dispatching
- Discuss doubts with user — dispatch only after explicit user approval
- Create and manage git worktrees
- Dispatch agents with clear task descriptions
- Merge worktree branches back to main after each issue
- Sync main → worktree before assigning next issue
- Review agent output for spec drift
- Handle issue tracker sync and git operations
- Context management (avoid drift, keep agents aligned)

## Agent Role

Agents do ALL code work. Worktree isolation, persistent memory, and background
execution are configured via agent frontmatter settings (see `agent-template.md`)
— not repeated as prose rules here. Each agent:

- Makes atomic commits per issue
- Runs the project test suite before each commit
- Updates its persistent memory after completing
- Does NOT push — orchestrator handles merges

## Named Agents as Domain Experts

Agents are **permanent domain experts**, not single-use task workers. They can
be consulted on any issue in their field across multiple sessions. See
`agent-template.md` for how to define them with proper frontmatter settings.
