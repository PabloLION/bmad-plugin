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
| validate | `bun run validate` | Validate version pinning, marketplace integrity, skill surface, templatization |
| sync | `bun run sync` | Regenerate plugin tree from `npx bmad-method install` |
| sync:dry | `bun run sync:dry` | Preview a sync without writing files |
| update-readme | `bun run update-readme` | Update README version table + badge files |
| test | `bun run test` | Run all tests (incl. e2e — needs the `claude` CLI) |
| test:unit | `bun run test:unit` | Run unit tests only (plugin tree + init script; runs in CI) |
| release | `./scripts/release.sh [version]` | Full release workflow (see Release below) |

## Upstream Sync

The plugin delegates 100% of content shaping to the official
`npx bmad-method install --tools claude-code` CLI. To bring in a new
upstream version:

```sh
# Regenerate against a new core release (also rewrites the pin)
bun run sync -- --tag v6.11.0

# …or re-run against the currently pinned versions
bun run sync

# Verify
bun run typecheck && bun run lint && bun run validate && bun run test
```

Two installer runs happen, into two throwaway directories:

1. `.upstream-install/` — the registry modules
   (`bmm,bmb,cis,gds,tea,bmad-loop`). Feeds the `bmad` plugin.
2. `.upstream-install-<id>/` — one per **custom source**: a real BMad
   module absent from upstream's `bmad-modules.yaml` registry, cloned at
   a pinned tag and handed to the installer as a local
   `--custom-source` path. Feeds its own sibling plugin. Currently just
   `manticore` → `plugins/bmad-manticore`.

Splitting the runs keeps each plugin's runtime template describing only
the modules that plugin ships.

The `sync` script:

1. Clones every custom source at the tag in
   `.upstream-versions/<id>.json` (`--<id>-tag` to override). A local
   path, not a URL — `--custom-source <url>` resolves the moving default
   branch.
2. Runs the registry installer into `.upstream-install/`.
3. Wipes `plugins/bmad/{skills,runtime,_shared,agents}`,
   `plugins/bmad/templates/module-template`, and each sibling plugin's
   `skills/` + `runtime/`.
4. Copies `.upstream-install/.claude/skills/*` 1:1 into
   `plugins/bmad/skills/`. **Deprecated shims are not pruned** — upstream
   keeps them because external module repos still invoke those IDs, and
   removes them at the v7 cut.
5. Captures `.upstream-install/_bmad/` into `plugins/bmad/runtime/_bmad/`,
   replacing the installing machine's values with
   `__BMAD_PROJECT_NAME__`, `__BMAD_USER_NAME__` and
   `__BMAD_INSTALL_DATE__`, and storing nested `.gitignore` files as
   `dot.gitignore`.
6. Vendors `bmad-module-template` at its pinned commit into
   `plugins/bmad/templates/module-template/`.
7. Per custom source: second installer run, copy the prefixed skills into
   the sibling plugin, capture its `_bmad/<code>/`.
8. Bumps `.plugin-version`, `package.json`, `plugin.json`,
   `marketplace.json`, and every `.upstream-versions/<id>.json` — module
   versions read back from the installer's own
   `_bmad/_config/manifest.yaml`, never guessed.
9. Regenerates the README version table and the badge files.

**Never hand-edit `plugins/*/skills/`, `plugins/*/runtime/` or
`plugins/bmad/templates/module-template/`** — all are wiped and
regenerated on every sync, and all are excluded from biome, markdownlint
and tsc so upstream content stays byte-for-byte identical to the
installer output.

`scripts/lib/upstream-sources.ts` is the single registry of upstream
sources. Each entry carries a `kind`: `core`, `registry`, `custom`, or
`vendored`. Adding a source there is enough to get a README row, a badge
file, and a weekly release-watcher job — `.github/workflows/sync-upstream.yml`
builds its matrix from `scripts/list-sources.ts`. See
`docs/module-integration.md`.

Registry module versions cannot be bumped independently: the installer
resolves them for the pinned core release.

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

- **main** is the trunk. Every merged PR to date targets `main`; the
  `dev` branch is 51 commits behind and carries nothing of its own.
  Base new work on `main` unless `dev` is revived.
- Do not commit directly to the trunk — open a PR.
- Related changes ship as a **stack** of one-concern PRs
  (`gh stack init --base main <branch>` / `gh stack add`), each of which
  passes its own gates alone.
- When merging: **do not squash** — preserve individual commits.
- One branch per concern.

## Marketplace

`.claude-plugin/marketplace.json` publishes two plugins:

| Plugin | Source | Version tracks |
| --- | --- | --- |
| `bmad` | `./plugins/bmad` | the plugin version (`<core>.<patch>`) |
| `bmad-manticore` | `./plugins/bmad-manticore` | the upstream module version |

Every directory under `plugins/` must be published — `bun run validate`
fails on an unlisted one, because a marketplace install is a git clone of
the whole repo and unpublished directories are dead weight in it. That is
also why `plugins/bmad/templates/module-template/` lives inside the
`bmad` plugin rather than as a directory of its own.

## Agents and Skills

As of v6.5.0+, the plugin treats **agents as skills**. Every agent
persona — from BMM (Mary, Winston, Amelia, John, Sally) to TEA (Murat)
to GDS (Cloud Dragonborn, Samus Shepard, …) — ships as a SKILL.md under
`plugins/bmad/skills/<name>/`. Invoke them via `/bmad:bmad-agent-pm`,
`/bmad:bmad-tea`, etc.

There is no longer a separate `plugins/bmad/agents/` directory. The
upstream `module.yaml` agent rosters and the upstream installer are
authoritative for the agent list — no plugin-side mirror is needed.

### Reference: agent roster (from `_bmad/config.toml`, 17 personas)

| Slug                    | Persona  | Role                       |
| ----------------------- | -------- | -------------------------- |
| bmad-agent-analyst      | Mary     | Business Analyst           |
| bmad-agent-pm           | John     | Product Manager            |
| bmad-agent-ux-designer  | Sally    | UX Designer                |
| bmad-agent-architect    | Winston  | System Architect           |
| bmad-agent-dev          | Amelia   | Senior Software Engineer   |
| bmad-tea (TEA)          | Murat    | Master Test Architect      |
| bmad-cis-agent-*  (CIS) | various  | Brainstorming, design-thinking, problem-solving, innovation, storytelling, presentation |
| bmad-agent-builder (BMB)| Bond     | Agent builder              |
| gds-agent-* (GDS)       | various  | Game architect, designer, dev, solo-dev, tech-writer |

`bmad-agent-tech-writer` (Paige, BMM) was **retired upstream in
v6.11.0**; the game-scoped `gds-agent-tech-writer` is unaffected.
`mc-agent` (Manny) ships with the `bmad-manticore` plugin but upstream
does not write it into the core roster.

For the full canonical list, see the SKILL.md frontmatter of each
`plugins/bmad/skills/*-agent-*` (or `bmad-tea`, `gds-agent-*`)
directory, or run `/bmad:bmad-help` inside Claude Code.

## Automation First

Script everything repeatable — never do manually what a script can do.

- Full sync → `bun run sync` (one command, runs the upstream installer
  and rebuilds the entire plugin tree from its output)
- Preview a sync → `bun run sync:dry`
- README badge / version table refresh → `bun run update-readme`
- Validate → `bun run validate` (version consistency + skill-tree
  sanity + no-deprecated-shims + runtime-template/init assets)
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
