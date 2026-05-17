# BMAD Plugin Project Conventions

## Runtime

This project uses **Bun** as its JavaScript runtime and package manager.
All scripts use `bun run <script>`. For local tooling (biome, tsc), use
`./node_modules/.bin/<tool>` — never npx or bunx.

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| prepare | `bun run prepare` | Install husky git hooks |
| typecheck | `bun run typecheck` | Type-check all TypeScript (no emit) |
| lint | `bun run lint` | Biome lint + format check |
| lint:staged | `bun run lint:staged` | Biome lint + auto-fix staged files |
| validate | `bun run validate` | Validate plugin (version consistency + skill-tree sanity) |
| sync | `bun run sync` | Regenerate plugin tree from `npx bmad-method install` |
| sync:dry | `bun run sync:dry` | Preview a sync without writing files |
| update-readme | `bun run update-readme` | Update README version table + badge files |
| test | `bun run test` | Run tests |
| release | `./scripts/release.sh [version]` | Full release workflow (see Release below) |

## Upstream Sync

The plugin delegates 100% of content shaping to the official
`npx bmad-method install --tools claude-code` CLI. To bring in a new
upstream version:

```sh
# 1. Pin the new core version
echo '{"version":"v6.5.1","syncedAt":"2026-04-28"}' > .upstream-versions/core.json

# 2. Run the installer-based sync
bun run sync                    # uses .upstream-versions/core.json
# OR
bun run sync -- --tag v6.5.1    # ad-hoc tag override

# 3. Verify
bun run typecheck && bun run lint && bun run validate && bun run test
```

The `sync` script:

1. Runs `npx -y bmad-method@<version> install --yes --directory
   .upstream-install --modules bmm,bmb,cis,gds,tea --tools claude-code`
2. Wipes `plugins/bmad/skills/`, `plugins/bmad/_shared/`,
   `plugins/bmad/agents/`, `plugins/bmad/templates/`
3. Copies `.upstream-install/.claude/skills/*` 1:1 into
   `plugins/bmad/skills/`
4. Bumps `.plugin-version`, `package.json`, `plugin.json`,
   `marketplace.json`, and every `.upstream-versions/<id>.json` to
   match the installed module versions
5. Updates the README version table

If only a non-core module changed, the installer still pulls the
latest matching versions for that core release — there's no separate
"bump-module" anymore (the installer auto-resolves compatible versions).

## Release

Run from **dev** branch with clean working tree:

```sh
./scripts/release.sh                  # release current version (full run)
./scripts/release.sh 6.5.1.0         # bump version first, then release
./scripts/release.sh --after-ci       # finish release after CI passes
```

Two phases: **prepare** (bump → beads sync → release branch → PR → wait for CI)
and **finish** (merge → tag → GitHub release → return to dev).

If CI is slow to register or fails, the script saves state to `.release-state`
and exits with instructions. Fix the issue, then `--after-ci` completes Phase 2.

## Git Workflow

- **main** is for releases only — never commit directly to main
- **dev** branch accepts PRs from feature branches
- PRs target **dev**, not main
- When merging PRs to dev: **do not squash** — preserve individual commits
- Releases: merge dev → main (unidirectional)
- One branch per module/story

## Agents and Skills

As of v6.5.0+, the plugin treats **agents as skills**. Every agent
persona — from BMM (Mary, Winston, Amelia, John, Paige, Sally) to TEA
(Murat) to GDS (Cloud Dragonborn, Samus Shepard, …) — ships as a
SKILL.md under `plugins/bmad/skills/<name>/`. Invoke them via
`/bmad:bmad-agent-pm`, `/bmad:bmad-tea`, etc.

There is no longer a separate `plugins/bmad/agents/` directory. The
upstream `module.yaml` agent rosters and the upstream installer are
authoritative for the agent list — no plugin-side mirror is needed.

### Reference: BMM agent roster (from upstream module.yaml)

| Slug                    | Persona  | Role                       |
| ----------------------- | -------- | -------------------------- |
| bmad-agent-analyst      | Mary     | Business Analyst           |
| bmad-agent-pm           | John     | Product Manager            |
| bmad-agent-ux-designer  | Sally    | UX Designer                |
| bmad-agent-architect    | Winston  | System Architect           |
| bmad-agent-dev          | Amelia   | Senior Software Engineer   |
| bmad-agent-tech-writer  | Paige    | Technical Writer           |
| bmad-tea (TEA)          | Murat    | Master Test Architect      |
| bmad-cis-agent-*  (CIS) | various  | Brainstorming, design-thinking, problem-solving, etc. |
| bmad-agent-builder (BMB)| Bond     | Agent builder              |
| gds-agent-* (GDS)       | various  | Game architect, designer, dev, solo-dev, tech-writer |

For the full canonical list, see the SKILL.md frontmatter of each
`plugins/bmad/skills/*-agent-*` (or `bmad-tea`, `gds-agent-*`)
directory, or run `/bmad:bmad-help` inside Claude Code.

## Automation First

Script everything repeatable — never do manually what a script can do.

- Full sync → `bun run sync` (one command, runs the upstream installer
  and rebuilds the entire plugin tree from its output)
- Preview a sync → `bun run sync:dry`
- README badge / version table refresh → `bun run update-readme`
- Validate → `bun run validate` (version consistency + skill-tree sanity)
- All scripts are **idempotent** — running them twice produces the same
  result. Always run a script twice to verify idempotency after
  changes.
- When something breaks, **fix the script** — don't work around it
  manually.

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

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
