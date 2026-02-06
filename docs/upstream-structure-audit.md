# Upstream Structure Audit

> Inconsistencies in how upstream files, version tracking, sync config, and
> automation are organized. This audit informs bmp-h6k (clean up upstream file
> structure) which blocks adding CIS, GDS, and BMB modules.
>
> Audited: 2026-02-05.

## Findings

### Version file naming asymmetry

**Current state:**

- Core: `.upstream-version` (no source suffix)
- TEA: `.upstream-version-tea` (suffixed)

**Problem:** Inconsistent pattern. Adding more modules means the core file looks
like a special case rather than following the same convention.

**Fix:** Rename `.upstream-version` → `.upstream-version-core`. All modules
follow `.upstream-version-<id>`.

**Files to update:** `upstream-sources.ts`, `sync-upstream-content.ts`,
`update-readme-version.ts`, `sync-upstream.yml`, `dependency-submission.yml`,
`versioning.md`, `upstream-sync-design.md`, `CONTRIBUTING.md`,
`project-decisions.md`.

### Dead exports in config.ts

**Current state:** `scripts/lib/config.ts` exports 8 core-specific constants
(`AGENT_WORKAROUNDS`, `WORKFLOW_WORKAROUNDS`, `PLUGIN_ONLY_AGENTS`,
`PLUGIN_ONLY_SKILLS`, `SKIP_DIRS`, `SHARED_FILE_TARGETS`, `PLUGIN_ONLY_DATA`,
`SKIP_CONTENT_FILES`) plus a hardcoded `UPSTREAM` path.

**Problem:** None of the core-specific exports are imported anywhere. All check
modules use `source.xxx` from `upstream-sources.ts` directly. The `UPSTREAM`
constant is hardcoded to the core path and used only by the sync script's
version update logic (line 287).

**Fix:** Remove dead exports. Keep only `ROOT`, `PLUGIN`, `PLUGIN_JSON_PATH`.
Replace `UPSTREAM` usage in sync script with source-aware code.

### TEA skip patterns use hardcoded dates

**Current state:** `upstream-sources.ts` TEA config has:

```typescript
skipContentFiles: new Set([
  'workflow.md', 'workflow.yaml', 'SKILL.md',
  'validation-report-20260127-095021.md',
  'validation-report-20260127-102401.md',
  'workflow-plan.md',
  'workflow-plan-teach-me-testing.md',
]),
```

**Problem:** The `validation-report-*` filenames contain timestamps. When TEA
upstream is re-synced with new validation reports, these exact matches will miss
the new files.

**Fix:** Add `skipContentPatterns?: RegExp[]` to the `UpstreamSource` interface.
Replace hardcoded dated filenames with patterns:

```typescript
skipContentPatterns: [
  /^validation-report-.*\.md$/,
  /^workflow-plan.*\.md$/,
],
```

### Workflow badge automation gap

**Current state:** The `sync-upstream.yml` workflow has two jobs:

- `check-core`: Fetches version, compares, updates badge JSON, creates issue
- `check-tea`: Fetches version, compares, creates issue (no badge update)

**Problem:** TEA badge is never auto-updated. The issue body claims "Version file
is updated automatically by sync" but the workflow has no step for this.

**Fix:** Tracked separately as bmp-ojt. Generalize badge update to work for all
sources.

### Unused `.upstream/` directories

**Current state:** Four directories exist locally:

```text
.upstream/
  BMAD-METHOD/              ← active (core)
  bmad-method-test-architecture-enterprise/  ← active (TEA)
  bmad-builder/                             ← active (BMB)
  claude-code-bmad-skills/  ← unused
  claude-plugins-official/  ← unused
```

**Problem:** The unused directories are historical reference clones from early
development. They cause confusion about which upstreams are active.

**Fix:** These are gitignored (only exist locally). Remove them locally and
document which directories should exist in the sync design doc.

### Sync script version update is core-only

**Current state:** Lines 286-295 of `sync-upstream-content.ts`:

```typescript
const pkgJson = await Bun.file(join(UPSTREAM, 'package.json')).json();
const newUpstream = `v${pkgJson.version}`;
await Bun.write(join(ROOT, '.upstream-version'), `${newUpstream}\n`);
```

Uses `UPSTREAM` (hardcoded core path) and writes to a hardcoded filename.

**Problem:** Not source-aware. When we rename version files or add sources, this
breaks.

**Fix:** Already partially handled at lines 321-332 (iterates non-core sources).
Refactor the core block to also use `source.versionFile` from config.

### upstream-sync-design.md is core-only

**Current state:** The sync design doc (`docs/upstream-sync-design.md`)
describes a single-upstream architecture. It references `config.ts` as the
configuration source and only mentions `BMAD-METHOD`.

**Problem:** Outdated. The system now supports multiple upstreams via
`upstream-sources.ts`.

**Fix:** Update the doc to reflect multi-source architecture. Reference
`upstream-sources.ts` instead of `config.ts` for source config. Keep `config.ts`
reference only for path constants.

## Action Plan

### Must fix (blocks new modules)

| Item | Effort |
|------|--------|
| Rename `.upstream-version` → `.upstream-version-core` | Medium (many file refs) |
| Clean up `config.ts` dead exports | Small |
| Fix sync script core-only version logic | Small |
| Add `skipContentPatterns` support | Small |

### Should fix (documentation)

| Item | Effort |
|------|--------|
| Update `upstream-sync-design.md` for multi-source | Medium |
| Document expected `.upstream/` directories | Small |

### Tracked elsewhere

| Item | Issue |
|------|-------|
| Workflow badge automation for all sources | bmp-ojt |

## Not actionable

| Item | Reason |
|------|--------|
| Different GitHub orgs (`bmadcode` vs `bmad-code-org`) | External; both orgs host BMAD repos |
| Core categorized vs TEA flat structure difference | By design; `flatWorkflows` flag handles it |
| Agent YAML → MD conversion not documented | Sync script handles it; conversion is identity copy for supporting files |
| Content normalization is simplistic | Adequate for current needs |
| Manual sync (no auto-PR) | Intentional; sync requires human review |
