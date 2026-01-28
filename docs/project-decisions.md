# BMAD Plugin - Project Decisions & Plans

> Decisions made during planning sessions. This is our source of truth.

## 1. Project Goal

Create a **proper Claude Code plugin** for BMAD Method that:

- Installs via `/plugin install bmad`
- Supports versioning and auto-updates
- Listed in official plugin registry (discoverable)
- Follows Claude Code plugin architecture correctly

---

## 2. Source of Truth

| Repository                        | Purpose                       | Stars |
| --------------------------------- | ----------------------------- | ----- |
| **bmadcode/BMAD-METHOD**          | Official source (v6 alpha)    | 31.7k |
| aj-geddes/claude-code-bmad-skills | Reference only (format ideas) | 210   |

**Decision:** Source content from official `bmadcode/BMAD-METHOD`, NOT from AJ's
community version.

**Rationale:**

- When official BMAD updates → our plugin updates
- Not dependent on community fork maintenance
- Direct alignment with BMAD creators

---

## 3. Version Alignment

- Align to **BMAD Method v6** (official version)
- Use alpha content as-is (they provide it, we use it)
- Track official releases for updates

---

## 4. Architecture Decisions

### AJ's Mistake (What NOT to do)

AJ modeled **roles as skills**. This is architecturally incorrect.

### Our Correct Approach

| BMAD Concept                                                                      | Claude Code Component       | Why                                                                                    |
| --------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| **Roles** (Business Analyst, PM, Architect, Developer, Scrum Master, UX Designer) | **Subagents**               | Roles are personas with isolated context, specific tools, potentially different models |
| **Workflows** (product-brief, prd, architecture, sprint-planning)                 | **Skills** (task type)      | Workflows are step-by-step processes invoked by user                                   |
| **Methodology knowledge** (BMAD concepts, helpers)                                | **Skills** (knowledge type) | Reference material Claude should know                                                  |
| **User commands** (/init, /status)                                                | **Commands**                | Direct user invocation                                                                 |

---

## 5. Distribution Strategy

### Decision: Publish to BOTH

1. **Self-hosted marketplace** on GitHub
   - Immediate availability
   - Full control over updates
   - Users: `/plugin marketplace add PabloLION/bmad-plugin`

2. **Official Anthropic registry**
   - Submit via
     [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)
   - Discoverability in official listing
   - Review process required

### Marketplace Name

- TBD (cannot use reserved names like `claude-plugins-official`, `anthropic-*`,
  etc.)

---

## 6. CI/CD: Upstream Sync

### GitHub Action: Watch Official BMAD-METHOD

**Purpose:** Automatically check if `bmadcode/BMAD-METHOD` has updates.

**Trigger:**

- Scheduled (daily/weekly cron)
- Manual dispatch

**Workflow:**

1. Check latest release/commit of `bmadcode/BMAD-METHOD`
2. Compare with our tracked version
3. If different:
   - Create issue or PR notifying of upstream changes
   - Optionally: auto-generate diff of what changed
4. Manual review and update by maintainer

**File:** `.github/workflows/sync-upstream.yml`

```yaml
# Conceptual structure
name: Check BMAD Upstream
on:
  schedule:
    - cron: "0 0 * * 1" # Weekly on Monday
  workflow_dispatch:

jobs:
  check-upstream:
    runs-on: ubuntu-latest
    steps:
      - name: Check bmadcode/BMAD-METHOD for updates
        # Compare latest release/tag with our tracked version
        # Create issue if update detected
```

---

## 7. Plugin Structure (Target)

```text
bmad-plugin/
├── .claude-plugin/
│   ├── plugin.json           # Plugin metadata
│   └── marketplace.json      # Self-hosted marketplace config
├── agents/                   # BMAD roles as subagents
│   ├── business-analyst.md
│   ├── product-manager.md
│   ├── system-architect.md
│   ├── scrum-master.md
│   ├── developer.md
│   └── ux-designer.md
├── skills/                   # Workflows + knowledge
│   ├── workflows/
│   │   ├── product-brief.md
│   │   ├── prd.md
│   │   ├── architecture.md
│   │   ├── tech-spec.md
│   │   ├── sprint-planning.md
│   │   └── dev-story.md
│   └── knowledge/
│       ├── bmad-methodology.md
│       └── helpers.md
├── commands/                 # User commands
│   ├── init.md
│   └── status.md
├── templates/                # Document templates
│   ├── product-brief.md
│   ├── prd.md
│   └── ...
├── docs/
│   ├── research.md                        # Original research
│   ├── claude-code-plugin-architecture.md # Plugin format reference
│   └── project-decisions.md               # This file
├── .github/
│   └── workflows/
│       └── sync-upstream.yml  # Watch official BMAD for updates
├── README.md
└── LICENSE
```

---

## 8. Documentation to Keep

| File                                      | Decision                           |
| ----------------------------------------- | ---------------------------------- |
| `docs/research.md`                        | Keep - valuable planning info      |
| `docs/claude-code-plugin-architecture.md` | Keep - reference for plugin format |
| `docs/project-decisions.md`               | Keep - this file, our decisions    |

---

## 9. Open Questions

- [ ] What is the exact structure of official BMAD v6? (need to explore repo)
- [ ] Which workflows are required vs optional?
- [ ] What license should we use? (need to check BMAD's license)
- [ ] Plugin name: `bmad` or `bmad-method`?
- [ ] How to handle BMAD templates? Copy or reference?

---

## 10. Reference Commit Workflow

When experimenting with approaches that may not work, use git commits as
documentation:

1. Commit working baseline
2. Experiment with new approach
3. If it works: commit as reference snapshot
4. Revert to clean state (before experiments)
5. Reapply the correct solution cleanly

This creates a git history where future developers can see what was tried, what
worked, and what didn't. Dead-end commits document failed approaches so they
aren't retried.

**Example from this project:**

```text
9171e5c test: confirmed working workaround (REFERENCE — reverted after capture)
fa262be feat: commands/ wrappers approach (dead end — reverted)
91ee90f refactor: reorganize into plugins/bmad/ (KEEP)
```

Commits `fa262be` and `9171e5c` were reverted after confirming the working
approach. The clean workaround was then reapplied on top of `91ee90f`.

---

## 11. References

| Resource                        | URL                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Official BMAD-METHOD            | [github.com/bmadcode/BMAD-METHOD](https://github.com/bmadcode/BMAD-METHOD)                               |
| AJ's Implementation (reference) | [github.com/aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills)     |
| Claude Code Plugins Docs        | [code.claude.com/docs/en/plugins.md](https://code.claude.com/docs/en/plugins.md)                         |
| Plugin Marketplace Docs         | [code.claude.com/docs/en/plugin-marketplaces.md](https://code.claude.com/docs/en/plugin-marketplaces.md) |
| Official Plugin Submission      | [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)                       |
| Agent Skills Standard           | [agentskills.io](https://agentskills.io)                                                                 |

---

## 12. Progress Tracker

### Completed

- [x] Initial plugin POC with core skills and agents
- [x] Flatten skills directory structure
- [x] Convert commands to skills, simplify plugin.json
- [x] Workaround isHidden bug (anthropics/claude-code#17271) — skills listed in `commands` array with `bmad-` prefix
- [x] Reorganize into `plugins/bmad/` structure
- [x] Add all 10 agents (analyst, architect, dev, pm, sm, ux-designer, tea, tech-writer, barry, bmad-master)
- [x] Add all 33 workflow skills from upstream
- [x] Add templates, config, and TEA knowledge base from upstream
- [x] CI: upstream BMAD version sync workflow (`.github/workflows/sync-upstream.yml`)
- [x] CI: workaround monitoring workflow (`.github/workflows/check-workarounds.yml`)
- [x] Rewrite all 33 SKILL.md descriptions to concise action-oriented format
- [x] Upstream coverage validation script (`scripts/validate-upstream-coverage.ts`) — Bun + Husky pre-push hook
- [x] Fix missing `testarch-knowledge` in plugin.json commands (found by validation script)

### Pending

#### Name alignment (workarounds in validation script)

The validation script accepts these mismatches via workaround maps but prints ⚠ warnings. Each should be resolved by renaming the plugin file/directory to match upstream exactly, then removing the workaround entry.

Agent rename:

- [ ] Rename `barry.md` → `quick-flow-solo-dev.md` (upstream: `quick-flow-solo-dev.agent.yaml`)

Workflow/skill renames (7 total):

- [ ] Rename skill `epic-retrospective` → `retrospective` (upstream: `4-implementation/retrospective`)
- [ ] Rename skill `implementation-readiness` → `check-implementation-readiness` (upstream: `3-solutioning/check-implementation-readiness`)
- [ ] Rename skill `product-brief` → `create-product-brief` (upstream: `1-analysis/create-product-brief`)
- [ ] Rename skill `test-automate` → `automate` (upstream: `testarch/automate`)
- [ ] Rename skill `continuous-integration` → `ci` (upstream: `testarch/ci`)
- [ ] Rename skill `test-framework` → `framework` (upstream: `testarch/framework`)
- [ ] Rename skill `test-trace` → `trace` (upstream: `testarch/trace`)

#### Gaps found by validation script

- [ ] Upstream renamed `prd` → `create-prd` — plugin skill `prd` is now orphaned, needs rename
- [ ] Update `.upstream-version` to match upstream `v6.0.0-Beta.2` (was `v6.0.0-alpha.23`)
- [ ] Investigate `bmad-master` agent — no upstream counterpart, determine if plugin-only or missing from upstream

#### Other

- [ ] Verify upstream BMAD version sync CI catches new releases
- [ ] Verify isHidden workaround CI detects when anthropics/claude-code#17271 is fixed
- [ ] Remove isHidden workaround when anthropics/claude-code#17271 is fixed
- [ ] Submit to official Anthropic plugin registry
- [ ] Decide marketplace name
- [ ] Resolve open questions (section 9)

---

Last updated: 2026-01-28
