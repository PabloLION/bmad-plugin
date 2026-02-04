# BMAD Plugin Project Conventions

## Git Workflow

- **main** branch is for releases only — do not commit directly to main
- All work must go through feature branches and PRs
- Use `dev` branch for integration if needed

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
