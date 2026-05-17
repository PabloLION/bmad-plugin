# Plan: Re-source plugin from `npx bmad-method install`

> **Status:** Proposal. Not yet executed. Awaiting your approval of the
> open questions in section 3 before any code changes.

## 1. Why

While auditing v6.5.0.0 we found that the current sync pipeline is
producing a plugin tree that **drifts from the canonical upstream
install** in several specific ways. The drift is not a single bug — it's
the cumulative cost of treating "five git clones + custom
sync-upstream-content.ts" as the source of truth, when upstream
v6.5.0+ ships a real `npx bmad-method install --tools claude-code`
installer that does the work *correctly* by definition.

### Concrete drift detected (this audit)

| Symptom | Plugin | `npx bmad-method@6.5.0 install` | Severity |
|---|---|---|---|
| `customize.toml` files | 79 | 86 (with TEA enabled) | **7 missing** |
| Skill total | 93 | 102 | 11 mismatched |
| Research skills layout | nested under `skills/research/<name>/` | flat at `.claude/skills/<name>/` | structural |
| GDS agents layout | flat `.md` in `plugins/bmad/agents/` | `.claude/skills/gds-agent-*/SKILL.md + customize.toml + resources/` | structural |
| TEA agent layout | flat `bmad-tea.md` in agents/ | `.claude/skills/bmad-tea/SKILL.md + customize.toml + resources/` | structural |
| `gds-document-project` skill | missing | present | missing skill |
| `workflows/*.md` stray files | shipped under `skills/workflows/` | not present | accidental cruft |
| Zombie agents (Bob, Quinn-as-QA, Barry, BMad Master) | shipped | gone since v6.3.0 | stale |

### Root cause

The current sync iterates **upstream git clones** by category dir
(`src/bmm-skills/<phase>/<skill>/`) and tries to flatten them into our
`plugins/bmad/skills/` while preserving file ownership rules. It works,
but every refactoring upstream does (path renames, agent-becomes-skill,
skill-becomes-agent, customize.toml introduction, …) requires us to
update both `path-rewriter.ts` and `upstream-sources.ts` to compensate.

The official **`npx bmad-method install --tools claude-code`** installer
*already produces the correct Claude Code-compatible tree* including:

- Correct flat `skills/` layout (no nested categories)
- All `customize.toml` files in their right places
- Agents-as-skills (TEA, GDS, BMM agent skills all live in `skills/` with
  their own SKILL.md + customize.toml + resources/)
- Cross-module config (`_bmad/scripts/`, `_bmad/config.toml`,
  `_bmad/_config/agent-manifest.csv`) wired up
- All upstream modules' `module.yaml` and `module-help.csv` pre-merged
  into a single `_bmad/help-catalog.csv`

If we **use the installer's output as our source-of-truth**, the path
rewriter, the multi-source sync logic, and the per-source generate
scripts all become **unnecessary**. The plugin becomes a thin wrapper
around the canonical install.

## 2. Proposed architecture

```
┌─────────────────────────────────────────────────────────────┐
│  scripts/sync-from-installer.ts  (NEW — replaces 4 scripts) │
│                                                             │
│   1. Run `npx bmad-method@<core-version> install            │
│        --yes --directory .upstream-install                  │
│        --modules bmm,bmb,cis,gds,tea                        │
│        --tools claude-code`                                 │
│   2. Wipe plugins/bmad/skills/, plugins/bmad/_shared/       │
│   3. Copy .upstream-install/.claude/skills/* →              │
│              plugins/bmad/skills/                           │
│   4. Copy .upstream-install/_bmad/scripts/* →               │
│              plugins/bmad/_shared/scripts/                  │
│   5. Copy .upstream-install/_bmad/help-catalog.csv →        │
│              plugins/bmad/_shared/help-catalog.csv          │
│   6. Layer in plugin-only additions (see §3)                │
│   7. Bump version files via existing bump-utils.ts          │
└─────────────────────────────────────────────────────────────┘
```

### Scripts that become redundant after the migration

- `scripts/sync-upstream-content.ts` — replaced
- `scripts/generate-agents.ts` — agents are skills now, no separate generation
- `scripts/generate-skills.ts` — installer ships SKILL.md natively
- `scripts/generate-agent-manifest.ts` — installer ships help-catalog.csv
- `scripts/lib/path-rewriter.ts` — installer outputs correct paths already
- `scripts/lib/workflow-iterator.ts` — flattening is the installer's job
- `scripts/clean-orphaned-skills.ts` — wipe-and-replace each sync
- `scripts/find-orphan-files.ts` — same

These ~1500 lines of glue code become unnecessary.

### Scripts that survive

- `scripts/bump-core.ts` and `scripts/bump-module.ts` — version bumping
  is still the plugin's responsibility, not the installer's
- `scripts/lib/bump-utils.ts` — JSON file bumping
- `scripts/update-readme-version.ts` — README badge
- `scripts/release.sh` — release flow
- `scripts/validate-upstream-coverage.ts` — but heavily simplified (just
  check installer output matches plugin output, no three-way check)
- `scripts/lib/upstream-sources.ts` — kept for module list + version
  tracking, but `agentRefMappings`, `agentsRoot`, `pluginOnlySkills`,
  `pluginOnlyAgents`, `sharedFileTargets`, `pluginOnlyData`,
  `skipDirs`, `skipContentFiles`, `skipContentPatterns`,
  `plannedWorkflows`, `flatWorkflows`, `contentRoot` all become unused
  once the installer does the merging.

## 3. Open questions (decide before execution)

### Q1. Plugin-only agents — keep, drop, or upgrade?

The installer ships all agents as **skills** in `.claude/skills/`. Our
plugin has 22 separate `.md` files in `plugins/bmad/agents/`. Three
options:

| Option | What happens to `plugins/bmad/agents/` | Effect |
|---|---|---|
| **A. Drop entirely** | deleted | Match upstream 100%. Lose Claude Code's agent picker affordance. Users invoke each agent via its skill name (`/bmad:bmad-agent-pm` etc.) instead of `Use the pm agent…`. |
| **B. Keep BMM core agents only** (analyst, architect, dev, pm, tech-writer, ux-designer) — 6 files | shrunk from 22 to 6 | Drop zombies (Bob, Quinn-as-QA, Barry, BMad Master). Keep BMM personas as agent picker entries. Drop TEA/BMB/GDS agents (they're skills now). Drop quinn, gds-game-qa, gds-game-scrum-master too (they were plugin-only enhancements). |
| **C. Keep BMM core + plugin-only enhancements** | shrunk from 22 to 9 | Drop only the zombies. Keep 6 BMM + 1 quinn + 2 GDS plugin-only. |

**Recommendation: B.** Cleanest. If users miss the plugin-only QA flavor, can
re-add it as a skill later (`plugins/bmad/skills/quinn/` with a SKILL.md), which
is the v6.5+ idiomatic shape anyway. Plugin-only GDS QA / Scrum Master can move
to skills the same way.

### Q2. Plugin-only `_shared/` content — keep or drop?

Currently `plugins/bmad/_shared/` has:
- `agent-manifest.csv` (replaced by upstream `help-catalog.csv`)
- `excalidraw-library.json` + `excalidraw-templates.yaml` (excalidraw skills)
- `tasks/` (plugin-only task templates)
- `tea-index.csv` (TEA knowledge index)

The installer's `_bmad/_config/` and `_bmad/help-catalog.csv` cover the
manifest and the help index. **Recommendation:** keep `_shared/` only for
genuinely plugin-only assets (Excalidraw library, custom task templates),
drop `agent-manifest.csv` (replaced) and `tea-index.csv` (TEA ships its
own).

### Q3. Pinning strategy

The installer command needs an explicit version. Two options:

- **A. Pin to upstream core version** — `npx bmad-method@6.5.0 install …`.
  The installer auto-resolves matching module versions per its
  compatibility table. Predictable.
- **B. Pin every module independently** — installer flag `--channel
  stable|next` plus per-module version pins. Maximum control, more setup.

**Recommendation: A.** Lower maintenance, the installer already knows
which TEA / BMB / CIS / GDS versions match each core release.

### Q4. CI integration

GitHub Actions sync workflow currently watches 5 git repos for new
releases via API. After the migration, we just watch the **bmad-method
npm package** for new versions (single npm registry call). Simpler.

## 4. Phased task list

Once Q1-Q4 are answered, the work breaks into 6 phases. Each phase has
its own commit boundary so the migration is reviewable per-phase.

### Phase 0 — Pre-flight (read-only, ~10 min)

1. Confirm working tree clean on `main`
2. Confirm `node` >= 20 and `npm` available in PATH
3. Confirm `npx bmad-method@6.5.0 --help` runs successfully
4. Snapshot current state: `git log --oneline -5`,
   `find plugins/bmad -type f | wc -l` (record number)
5. Commit baseline: nothing yet

### Phase 1 — Branch + new sync script (~1 day)

1. `git checkout -b chore/sync-via-installer`
2. Write `scripts/sync-from-installer.ts`:
   - Reads target version from `.upstream-versions/core.json`
   - Runs the installer into `.upstream-install/` (gitignored)
   - Wipes `plugins/bmad/skills/` and `plugins/bmad/_shared/`
     (preserves `plugins/bmad/agents/` per Q1 decision)
   - Copies installer output 1:1
   - Layers in plugin-only additions (per Q1 decision)
3. Add `.upstream-install/` to `.gitignore`
4. Wire `bun run sync` to call the new script
5. **Commit:** `feat(scripts): add installer-based sync (replaces multi-source sync)`

### Phase 2 — Wipe + first installer-driven sync

1. `rm -rf plugins/bmad/skills/ plugins/bmad/_shared/`
2. (Per Q1 decision) shrink or delete `plugins/bmad/agents/`
3. Run `bun run sync`
4. Run `bun run typecheck` / `lint` / `validate`
5. Smoke test: `claude plugin marketplace add /Users/tgorka/tg/bmad-plugin && claude plugin install bmad@bmad-method --scope local`
6. **Commit:** `chore: regenerate plugin tree from npx bmad-method@6.5.0 install`

### Phase 3 — Retire redundant scripts

1. Delete `scripts/sync-upstream-content.ts`
2. Delete `scripts/sync-all.ts`
3. Delete `scripts/generate-agents.ts`
4. Delete `scripts/generate-skills.ts`
5. Delete `scripts/generate-agent-manifest.ts`
6. Delete `scripts/clean-orphaned-skills.ts`
7. Delete `scripts/find-orphan-files.ts`
8. Delete `scripts/lib/path-rewriter.ts`
9. Delete `scripts/lib/workflow-iterator.ts`
10. Delete `scripts/lib/checks/{paths,content,naming,workflows,agents}.ts`
11. Shrink `scripts/lib/upstream-sources.ts` to {id, repo, version-tracking only}
12. Shrink `scripts/validate-upstream-coverage.ts` to a single check:
    "installer output matches plugin output"
13. Update `package.json` scripts: drop `generate:*`, `find-orphans`,
    `clean:orphaned`, `sync:source`
14. **Commit:** `refactor(scripts): retire multi-source sync (~1500 lines deleted)`

### Phase 4 — Doc & test refresh

1. Rewrite `docs/upstream-sync-design.md` to describe the installer flow
2. Rewrite `docs/script-pipeline.md`
3. Mark `docs/bmad-method-analysis.md` and (if applicable)
   `docs/upstream-structure-audit.md` as fully historical
4. Update `README.md` skill/agent counts to whatever Phase 2 produced
5. Update `tests/e2e/skill-load.test.ts` to test the new layout
6. **Commit:** `docs: refresh sync docs for installer-based approach`

### Phase 5 — CHANGELOG + release

1. Add CHANGELOG entry for the new version (`v6.5.1.0` or similar — the
   installer-sync change is significant, warrants a `.X` bump even with
   no upstream version change)
2. Bump versions via `bun run bump-module --source core --tag v6.5.0` or
   manual bump
3. Validate one more time
4. **Commit:** `docs: changelog for vX.Y.Z.W (installer-based sync)`

### Phase 6 — PR + merge

1. Push branch
2. Open PR to `tgorka/bmad-plugin@main`
3. Wait for CI green
4. Merge with `--no-ff` (per orchestration rules)
5. Tag the new release
6. (Optional) Open PR to `PabloLION/bmad-plugin` upstream

## 5. Risks and rollback

| Risk | Mitigation |
|---|---|
| Installer output drifts from what we synced | Phase 2 produces a diff vs current state; we eyeball it before committing |
| Plugin-only agents we delete cause UI regressions | Q1 decision documented; users can re-create as skills if needed |
| `npx` is slow / requires network on every sync | Cache `.upstream-install/` between runs; only re-run if version changes |
| Test sandbox needs different layout | Confirm in Phase 2 smoke test before committing |
| Downstream consumers depend on `agents/` directory | Rare; documented in CHANGELOG release notes |

Per-phase rollback is straightforward: `git reset --hard <pre-phase commit>`.

## 6. Effort estimate

- Phase 0: 10 min
- Phase 1: 4–8 hours (writing the new script)
- Phase 2: 30 min (running it + smoke tests)
- Phase 3: 1–2 hours (deletions + script package.json cleanup)
- Phase 4: 1–2 hours (doc rewrites)
- Phase 5: 30 min (CHANGELOG + bump)
- Phase 6: 30 min (PR + merge)

**Total: ~1 working day of focused work.**

## 7. Decision matrix

| If you answer Q1 = | Then I will… |
|---|---|
| **A** (drop all 22 agents) | Phase 1 sync script wipes `plugins/bmad/agents/` entirely; Phase 4 README drops the Agents section in favor of "Skills with agent personas" |
| **B** (keep 6 BMM agents) | Phase 1 sync script keeps `plugins/bmad/agents/{analyst,architect,dev,pm,tech-writer,ux-designer}.md`; deletes the other 16; Phase 4 README updated to 6 + 92 skills |
| **C** (keep 6 BMM + 3 plugin-only) | Phase 1 sync script keeps 9 files (6 BMM + quinn + gds-game-qa + gds-game-scrum-master); Phase 4 README updated to 9 + 92 skills |
