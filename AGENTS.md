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
| sync:source | `bun run sync:source <id>` | Sync a single upstream source |
| generate:agents | `bun run generate:agents` | Generate agent .md files from upstream YAML |
| generate:skills | `bun run generate:skills` | Generate SKILL.md files from upstream workflows |
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

| Agent (filename)        | Personnel  | Module | Role                         |
| ----------------------- | ---------- | ------ | ---------------------------- |
| analyst                 | Mary       | Core   | Business Analyst             |
| pm                      | John       | Core   | Product Manager              |
| ux-designer             | Sally      | Core   | UX Designer                  |
| architect               | Winston    | Core   | System Architect             |
| sm                      | Bob        | Core   | Scrum Master                 |
| dev                     | Amelia     | Core   | Developer                    |
| tea                     | Murat      | TEA    | Test Architect               |
| quinn                   | Quinn      | Core   | QA Engineer                  |
| tech-writer             | Paige      | Core   | Technical Writer             |
| quick-flow-solo-dev     | Barry      | Core   | Quick Flow Solo Dev          |
| bmad-master             | —          | Core   | Orchestrator                 |
| agent-builder           | Bond       | BMB    | Agent Building Expert        |
| module-builder          | Morgan     | BMB    | Module Creation Master       |
| workflow-builder        | Wendy      | BMB    | Workflow Building Master     |
| brainstorming-coach     | Carson     | CIS    | Brainstorming Facilitator    |
| creative-problem-solver | Dr. Quinn  | CIS    | Problem-Solving Expert       |
| design-thinking-coach   | Maya       | CIS    | Design Thinking Coach        |
| innovation-strategist   | Victor     | CIS    | Innovation Strategist        |
| presentation-master     | Caravaggio | CIS    | Presentation Expert          |
| storyteller             | Sophia     | CIS    | Master Storyteller           |

## Automation First

Script everything repeatable — never do manually what a script can do.

- Agent files → `bun run generate:agents --source <id>`
- Skill files → `bun run generate:skills --source <id>`
- Sync content → `bun run sync --source <id>`
- All scripts support `--source <id>` and `--dry-run` flags
- When something breaks, **fix the script** — don't work around it manually

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
