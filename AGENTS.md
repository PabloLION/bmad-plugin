# BMAD Plugin Project Conventions

## Runtime

This project uses **Bun** as its JavaScript runtime and package manager.
All scripts use `bun run <script>`. For local tooling (biome, tsc), use
`./node_modules/.bin/<tool>` — never npx or bunx.

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| typecheck | `bun run typecheck` | Type-check all TypeScript (no emit) |
| lint | `bun run lint` | Biome lint + format check |
| lint:staged | `bun run lint:staged` | Biome lint + auto-fix staged files |
| validate | `bun run validate` | Upstream coverage validation (agents, skills, content, naming) |
| sync | `bun run sync` | Sync upstream content to plugin |
| sync:dry | `bun run sync:dry` | Dry-run sync (preview changes) |
| update-readme | `bun run update-readme` | Update README version badge |

## Git Workflow

- **main** is for releases only — never commit directly to main
- **dev** branch accepts PRs from feature branches
- PRs target **dev**, not main
- When merging PRs to dev: **do not squash** — preserve individual commits
- Releases: merge dev → main (unidirectional)
- One branch per module/story

## BMAD Agent Naming

Two distinct names for each agent:

| Term | Source | Example | Used for |
|------|--------|---------|----------|
| **Agent name** | Filename (without `.md`) | `quick-flow-solo-dev` | Invocation, delegation, code references |
| **Personnel name** | `name` field in frontmatter or heading | Barry | Documentation, user-facing display |

The agent name (filename) is the canonical identifier. Personnel names add personality but are optional in tables.

### Current Agents

| Agent (filename)      | Personnel | Role                    |
| --------------------- | --------- | ----------------------- |
| analyst               | Mary      | Business Analyst        |
| pm                    | John      | Product Manager         |
| ux-designer           | Sally     | UX Designer             |
| architect             | Winston   | System Architect        |
| sm                    | Bob       | Scrum Master            |
| dev                   | Amelia    | Developer               |
| tea                   | Murat     | Test Architect          |
| quinn                 | Quinn     | QA Engineer             |
| tech-writer           | Paige     | Technical Writer        |
| quick-flow-solo-dev   | Barry     | Quick Flow Solo Dev     |
| bmad-master           | —         | Orchestrator            |
| agent-builder         | Bond      | Agent Building Expert   |
| module-builder        | Morgan    | Module Creation Master  |
| workflow-builder      | Wendy     | Workflow Building Master |

## Session Completion

When ending a work session, complete ALL steps below. Work is NOT complete until
`git push` succeeds.

1. File issues for remaining work
2. Run quality gates (if code changed)
3. Update issue status — close finished work
4. Push to remote:
   ```sh
   git pull --rebase
   bd sync
   git push
   git status  # must show "up to date with origin"
   ```
5. Verify all changes committed AND pushed
