# Upstream Sync Design

How the plugin stays synchronized with the upstream BMAD-METHOD repository.

## The Core Problem

The plugin wraps upstream BMAD-METHOD content into Claude Code's plugin format.
Upstream uses `workflow.md`/`workflow.yaml` as workflow definitions; the plugin
uses `SKILL.md` with different frontmatter. However, both systems share the same
**supporting files**: step files, instructions, checklists, and templates.

The challenge: keep supporting files in sync without overwriting the plugin's own
`SKILL.md` files, which are hand-written and structurally different from
upstream's `workflow.md`.

## Architecture

### Two separate systems

```text
Upstream (BMAD-METHOD)              Plugin (bmad)
========================            =======================
src/bmm/workflows/                  plugins/bmad/skills/
  1-analysis/                         create-product-brief/
    create-product-brief/               SKILL.md          ← PLUGIN-OWNED
      workflow.md        ← SKIP        steps/step-01.md   ← SYNCED
      workflow.yaml      ← SKIP        steps/step-02.md   ← SYNCED
      steps/step-01.md   → COPY →      ...
      steps/step-02.md   → COPY →
```

### File ownership rules

| File type | Owner | Sync behavior |
|---|---|---|
| `SKILL.md` | Plugin | Never overwritten by sync |
| `workflow.md` | Upstream | Never copied to plugin |
| `workflow.yaml` | Upstream | Never copied to plugin |
| Step files (`steps/*.md`) | Upstream | Copied on sync |
| Instructions (`instructions.md`) | Upstream | Copied on sync |
| Checklists (`checklist.md`) | Upstream | Copied on sync |
| Templates (`*-template.md`) | Upstream | Copied on sync |
| Data files (`data/*`) | Mixed | See shared files section |

### How SKILL.md frontmatter is preserved

The sync script (`scripts/sync-upstream-content.ts`) uses `SKIP_CONTENT_FILES`
to exclude `workflow.md`, `workflow.yaml`, and `SKILL.md` from copying. This
means:

- Sync **never touches** `SKILL.md` — the plugin's frontmatter, name, and
  description are always safe
- Sync **only copies** supporting files that are structurally identical between
  upstream and plugin
- If upstream adds a new supporting file, sync picks it up automatically
- If upstream deletes a supporting file, the plugin copy remains (detected as
  "extra file" by validation)

## Sync Process

### Running sync

```sh
bun run sync            # Copy files from upstream to plugin
bun run sync:dry        # Preview without copying
```

### What happens during sync

1. **Pair matching**: For each upstream workflow directory, find the corresponding
   plugin skill directory (using the same name, or a workaround mapping)
2. **File enumeration**: List all files recursively in the upstream directory
3. **Filtering**: Skip files in `SKIP_CONTENT_FILES` (`workflow.md`,
   `workflow.yaml`, `SKILL.md`)
4. **Copying**: Copy each remaining file to the same relative path in the plugin
   skill directory, creating parent directories as needed
5. **Shared files**: Copy `_shared/` files to `skills/_shared/` and distribute
   copies to each target skill's `data/` directory
6. **Version update**: Write upstream version to `.upstream-version-core` and update
   the README badge

### Directory mapping

Upstream organizes workflows into phase categories:

```text
src/bmm/workflows/
  1-analysis/create-product-brief/
  2-plan-workflows/create-prd/
  3-solutioning/create-architecture/
  4-implementation/dev-story/
  testarch/framework/
```

The plugin flattens this into a single `skills/` directory:

```text
plugins/bmad/skills/
  create-product-brief/
  create-prd/
  create-architecture/
  dev-story/
  framework/
```

The sync script traverses the upstream category structure and matches by leaf
directory name.

## Shared Files

### The problem

Some upstream workflows share files via a `_shared/` directory. For example, all
four excalidraw diagram workflows reference a single
`excalidraw-diagrams/_shared/excalidraw-templates.yaml`.

In the plugin, each skill must be self-contained — skills can't reference
sibling directories. So shared files must be copied into each skill.

### Why duplication (not symlinks or shared paths)

Claude Code plugin skills must be self-contained. The plugin manifest forbids
`../` paths — a skill cannot reference files outside its own directory. This is
by design: skills are the unit of progressive disclosure, loaded independently
into context.

The official `claude-plugins-official` repo confirms this: no official plugin
shares files between skills. When two skills need the same reference material,
each skill gets its own copy under `references/` (the official convention) or
`data/` (BMAD's convention).

Alternatives considered:

| Approach | Why rejected |
|---|---|
| Symlinks | Not portable across OS/git; Claude Code doesn't resolve them |
| `../` relative paths | Explicitly forbidden by plugin manifest spec |
| Shared directory at plugin root | Skills can't reference outside their directory |
| Single skill aggregating everything | Defeats progressive disclosure; bloats context |

**Decision:** Duplicate shared files into each skill, synchronized by script.
The sync script is the single source of truth — it copies from upstream
`_shared/` into each target skill's `data/` directory and validates all copies
match. No manual copying, no symlinks, just scripted duplication with automated
consistency checks.

### The solution

A three-tier approach:

1. **Upstream `_shared/`** — the authoritative source
2. **Plugin `skills/_shared/`** — local source of truth (synced from upstream)
3. **Skill `data/` directories** — working copies distributed to each skill

The sync script handles all three tiers automatically. The mapping is configured
in `SHARED_FILE_TARGETS` in `config.ts`:

```typescript
export const SHARED_FILE_TARGETS: Record<string, string[]> = {
  "excalidraw-diagrams": [
    "create-dataflow",
    "create-diagram",
    "create-flowchart",
    "create-wireframe",
  ],
};
```

### Validation

The shared file consistency check verifies all three tiers match:

- Upstream `_shared/` content matches plugin `_shared/`
- Plugin `_shared/` content matches each skill's `data/` copy
- Any drift triggers a validation failure

## Validation

### Running validation

```sh
bun run validate        # Full validation (also runs as pre-push hook)
```

### Checks performed

| Check | What it validates |
|---|---|
| Sync | Pulls latest upstream before checking |
| Agents | Every upstream agent has a plugin `.md` file |
| Skills (three-set) | Upstream names ↔ plugin directories ↔ plugin.json manifest |
| Content | Supporting files match between upstream and plugin |
| Shared files | `_shared/` ↔ skill `data/` copies are consistent |
| Version | `.upstream-version-core` matches upstream `package.json` |

### Content comparison

Content comparison uses normalization to avoid false positives from formatting
tools like Prettier:

```typescript
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").replace(/'/g, '"').trim();
}
```

This handles:

- **Line wrapping differences**: Prettier may rewrap lines at different widths
- **Quote style**: Prettier converts `'single'` to `"double"` in YAML frontmatter
- **Trailing whitespace**: Stripped by normalization

### What validation does NOT check

- **SKILL.md content quality** — these are hand-written and not compared to
  upstream `workflow.md` (they are structurally different by design)
- **Agent `.md` content** — only checks existence, not content
- **Upstream file deletions** — extra plugin files produce warnings, not failures

## Plugin-Only Content

Some files exist only in the plugin with no upstream counterpart:

### Plugin-only skills

Skills like `help`, `init`, `status`, `brainstorm`, and `testarch-knowledge`
are plugin-specific. They are listed in `PLUGIN_ONLY_SKILLS` and validation
skips them.

### Plugin-only data files

Some skills have data files that were extracted from upstream prose into
structured formats (e.g., `quick-dev/data/project-levels.yaml`). These are
listed in `PLUGIN_ONLY_DATA` and validation treats them as expected.

## Configuration Reference

All per-source sync/validation configuration lives in `scripts/lib/upstream-sources.ts`
as `UpstreamSource` entries. See `docs/module-integration.md` for the full field
reference.

## Typical Workflow

### When upstream releases a new version

1. `cd .upstream/BMAD-METHOD && git pull`
2. `bun run sync` — copies supporting files, updates version
3. `bun run validate` — checks everything is consistent
4. Review any new warnings (extra files, missing files)
5. Commit the sync

### When adding a new upstream module

See `docs/module-integration.md` for the full procedure, including generation
scripts, edge cases, and configuration reference.

### When adding a new upstream workflow as a skill

1. Create `plugins/bmad/skills/<name>/SKILL.md` with plugin frontmatter
2. `bun run sync` — copies supporting files from upstream
3. `bun run validate` — confirms alignment

### When upstream renames a workflow

1. `git mv plugins/bmad/skills/<old-name> plugins/bmad/skills/<new-name>`
2. Update `SKILL.md` name field
3. `bun run sync` — copies files to new location
4. `bun run validate` — confirms alignment
