# Module Integration

How to add an upstream module to this repo.

Since v6.5.0.1 the official installer is the only thing that shapes plugin
content (`npx bmad-method@<tag> install --tools claude-code`). There is no
merge layer, no path rewriting and no per-module generator. Integration is
therefore mostly *registration*: one entry in
[`scripts/lib/upstream-sources.ts`](../scripts/lib/upstream-sources.ts), plus a
small amount extra depending on how the content reaches the plugin.

See [`docs/plan-6.11-rebuild.md`](plan-6.11-rebuild.md) for why the delivery
paths are split this way, and
[`docs/upstream-sync-design.md`](upstream-sync-design.md) /
[`docs/script-pipeline.md`](script-pipeline.md) for the retired multi-clone
pipeline (both are marked historical).

## The source registry

Every source is one `UpstreamSource` in `UPSTREAM_SOURCES`. The interface has
five fields and nothing else:

| Field | Purpose |
|---|---|
| `id` | Unique identifier and the `.upstream-versions/<id>.json` stem; for a `custom` source it is also the `--<id>-tag` flag stem |
| `repo` | GitHub `org/repo`, used by the release watcher and for badge/table links |
| `label` | Short name shown in the README table and badge names |
| `enabled` | `false` drops the source from the version gate, the README table and badges, and the CI watcher. It does **not** remove it from `MODULES` / `CUSTOM_SOURCES` — the sync's own lists are independent |
| `kind` | How the content reaches the plugin |

`kind` decides the whole procedure:

| `kind` | Delivery | Pinned by | Currently |
|---|---|---|---|
| `core` | the installer itself | `v`-tag | `core` |
| `registry` | official module in upstream's `bmad-modules.yaml`, passed to `--modules` | `v`-tag (resolved by the installer) | `tea`, `bmb`, `cis`, `gds`, `bmad-loop` |
| `custom` | real BMad module absent from that registry; cloned at a tag, installed via `--custom-source` | `v`-tag | `manticore` |
| `vendored` | not installed at all; copied in as a plugin asset | full 40-char commit SHA | `module-template` |

## What registration already gives you

Do not hand-author any of this — it is generated from the registry entry:

- **Badge endpoint.** `scripts/update-readme-version.ts` writes
  `.github/badges/upstream-version-<id>.json` (`upstream-version.json` for
  `core`), creating the file from the registry when it does not exist yet and
  setting `message` from `.upstream-versions/<id>.json`.
- **README badge and dependency-table row.** Both blocks are regenerated
  between their marker comments (`<!-- upstream-badges-start -->` and
  `<!-- upstream-version-start -->`). The table shows label, version,
  delivery kind and `syncedAt`. `bun run sync` calls this at the end; run
  `bun run update-readme` to do it alone.
- **CI release watcher.** `scripts/list-sources.ts` emits the enabled,
  non-`vendored` sources as JSON; the `sources` job in
  [`.github/workflows/sync-upstream.yml`](../.github/workflows/sync-upstream.yml)
  turns that into the `check` job matrix. It runs weekly (Monday 00:00 UTC)
  and on `workflow_dispatch`, compares the pinned version against
  `repos/<repo>/releases/latest`, and opens one tracking issue per changed
  source carrying the correct per-kind sync command. There is no per-module
  job to copy any more.
- **Version gate.** `bun run validate` iterates `getEnabledSources()` and
  enforces the pin format for the source's `kind`
  (see [`docs/versioning.md`](versioning.md)).

A `vendored` source is deliberately absent from the watcher matrix: it has no
releases to compare against.

## `kind: 'registry'` — an official installer module

Preconditions: the module is listed in upstream's `bmad-modules.yaml` for the
core release you are pinning.

1. Add the registry entry:

   ```ts
   {
     id: 'bmad-loop',
     repo: 'bmad-code-org/bmad-loop',
     label: 'Loop',
     enabled: true,
     kind: 'registry',
   }
   ```

   **`id` must equal the module name in the installer's
   `_bmad/_config/manifest.yaml`** — `bmad-loop`, not `loop`.
   `bumpModuleVersions()` looks the id up in that manifest and exits non-zero
   when there is no entry, so a mismatched id is a hard failure rather than a
   silent skip.

2. Add the module code to `MODULES` in
   [`scripts/sync-from-installer.ts`](../scripts/sync-from-installer.ts):

   ```ts
   const MODULES = ['bmm', 'bmb', 'cis', 'gds', 'tea', 'bmad-loop'] as const;
   ```

   The list is always passed to the installer because `--yes` needs an
   explicit module list; core is force-added by the installer itself.

3. `bun run sync`
4. `bun run validate && bun run test:unit`

That is the whole procedure. You do not create the version file — the
installer resolves the module version and `bumpModuleVersions()` writes
`.upstream-versions/<id>.json` from `_bmad/_config/manifest.yaml`. `bmm` is
skipped there because it ships inside core and carries the core version.

Registry modules **cannot be bumped independently**: the installer resolves
them from the pinned core release. That is why the watcher issue for a
registry source says plain `bun run sync` rather than a tag flag — bumping one
means moving `--tag` for core.

## `kind: 'custom'` — a real module outside the registry

Preconditions: the repo ships `skills/module.yaml` (that is what makes it a
BMad module the installer can consume) and has a release tag. If it is not in
`bmad-modules.yaml`, `--modules` will not find it and `--custom-source` is the
only route.

### Worked example: `bmad-manticore`

1. **Registry entry**, `kind: 'custom'`:

   ```ts
   {
     id: 'manticore',
     repo: 'bmad-code-org/bmad-manticore',
     label: 'Manticore',
     enabled: true,
     kind: 'custom',
   }
   ```

2. **Create `.upstream-versions/<id>.json` by hand.** This is required and it
   is the one version file the sync does not bootstrap:
   `cloneCustomSources()` calls `readVersion(source.id)` before anything
   writes it. (Alternatively pass `--manticore-tag v1.0.1` on the first run;
   the clone step writes the file afterwards.)

   ```json
   { "version": "v1.0.1", "syncedAt": "2026-08-20" }
   ```

   Manticore is pinned to `v1.0.1`, the newest tag, even though `main`
   self-declares `3.1.0` — its `CHANGELOG.md` marks both `3.0.0` and `3.1.0`
   as unreleased and no tag above `v1.0.1` exists. The watcher picks up a real
   `v3.x` tag the day one lands.

3. **Decide whether it becomes its own plugin.** Manticore is a sibling
   plugin rather than more skills inside `bmad`, because:

   - its skills carry heavyweight prerequisites (ffmpeg, node/npx, uv,
     Python >= 3.11, multi-GB model caches) irrelevant to most users;
   - 14 of its 15 skills fail closed until `mc-setup` writes
     `[modules.manticore]` into `_bmad/custom/config.toml`;
   - `mc-agent` ("talk to Manny") is an always-on persona that would compete
     for activation with the aggregate's agents.

   A module whose skills are cheap, always usable and non-competing belongs in
   `plugins/bmad` instead — the sibling-plugin split costs the user an extra
   install and an extra `/bmad:init --with-plugin` flag.

   For a sibling plugin, create `plugins/<dir>/.claude-plugin/plugin.json`
   (hand-authored: `name`, `version`, `description`, `skills: "./skills/"`),
   a `plugins/<dir>/README.md`, and an entry in
   `.claude-plugin/marketplace.json`. `bun run validate` fails if a
   `plugins/<dir>` is not published, if `plugin.json`'s `name` or `version`
   disagrees with the marketplace entry, or if `skills/` is missing or empty.

4. **Add the `CUSTOM_SOURCES` entry** in `scripts/sync-from-installer.ts`:

   ```ts
   {
     id: 'manticore',
     repoUrl: 'https://github.com/bmad-code-org/bmad-manticore.git',
     pluginDir: 'bmad-manticore',
     moduleCode: 'manticore',
     skillPrefix: 'mc-',
   }
   ```

   `moduleCode` is the code the installer records at `_bmad/<code>/`;
   `skillPrefix` is how installed skill directories are routed to this plugin
   instead of the aggregate.

5. `bun run sync` (or `bun run sync -- --manticore-tag <tag>`)
6. `bun run validate && bun run test:unit`

Nothing to add to `.gitignore`: every throwaway checkout lands under
`.upstream-clones/<id>` and every throwaway install under
`.upstream-install-<id>/`, both already ignored. The patterns are
deliberately not widened to `.upstream-*`, which would swallow the
tracked `.upstream-versions/`.

### Why the sync clones locally and passes a path

`--custom-source` accepts either a URL or a local path. Given a **URL** the
installer resolves the repo's **default branch**, which moves — a re-run of a
pinned sync would produce different content. So `cloneCustomSources()` does
`git clone --depth 1 --branch <tag>` into `.upstream-<id>/` and hands the
installer that directory. The pin is enforced by git, not by the installer,
and the run stays reproducible offline once the clone exists.

### Why a second installer run

Each custom source gets its own throwaway install at
`.upstream-install-<id>/`, run with `--modules bmm --custom-source <clone>`.
Splitting the runs keeps each plugin's runtime template describing only the
modules that plugin ships — a `bmad`-only install must not advertise manticore
skills in its help catalog.

From that run the sync copies skill directories matching `skillPrefix` into
`plugins/<pluginDir>/skills/`, and captures only the module's own metadata,
`_bmad/<moduleCode>/{config.yaml,module-help.csv}`. The core runtime those
skills resolve against (`_bmad/scripts/resolve_config.py`, `_bmad/custom/`)
comes from the `bmad` plugin, which `/bmad:init` materialises first.

Registration in a working repo is opt-in:
`/bmad:init --with-plugin bmad-manticore` materialises the sibling's
`_bmad/<module>/` metadata and merges its `module-help.csv` rows into
`_bmad/_config/bmad-help.csv`. It is never inferred from the directory
listing, because a marketplace install is a git clone of the whole repo — a
sibling's files are on disk whether or not the user enabled the plugin.

## `kind: 'vendored'` — a plugin asset, not an install

Use this when the upstream content is not installable at all and only needs to
ship as reference material.

### Worked example: `bmad-module-template`

The module-authoring scaffold lands at
`plugins/bmad/templates/module-template/`. It is **not** published as a
marketplace plugin: its own `.claude-plugin/marketplace.json` declares
`"skills": ["./skills/my-skill"]` and that directory exists in no upstream ref
— `skills/` holds a single empty `.gitkeep`, because an early `.gitignore`
line (`.*/skills`) swallowed the scaffold before it was committed. Publishing
it would put a dead entry named `my-module` in front of end users. See
[`plugins/bmad/templates/README.md`](../plugins/bmad/templates/README.md).

1. Registry entry, `kind: 'vendored'`.
2. `.upstream-versions/module-template.json` pinning a **full 40-char commit
   SHA** (`f1440ec80b9c8b13e0779dedd47487b74d634a02`) — the repo has no tags
   and no releases, and anything shorter (a branch name, an abbreviated SHA)
   would let the bundle mutate underneath us. `bun run validate` rejects
   anything else.
3. A copy step in the sync, plus a matching entry in `wipePluginTree()`.

Step 3 is **not generic**: `vendorModuleTemplate()` is written against
`MODULE_TEMPLATE_SOURCE` and the hard-coded `MODULE_TEMPLATE_DIR`, and
`wipePluginTree()` names that directory explicitly (only the vendored
scaffold, not the whole `templates/` dir, whose `README.md` is
hand-authored). A second vendored asset needs a second function and a second
wipe entry, or a refactor to drive both from the registry. There is exactly
one vendored source today, so that generalisation has not been paid for.

Two things to carry over from `vendorModuleTemplate()` if you write another:
the clone's `.git` is removed before copying, and any nested `.gitignore` is
stored as `dot.gitignore`. A live nested `.gitignore` would exclude sibling
files from *this* repo's git tree, and marketplace installs are git clones, so
those files would vanish from the shipped plugin. `bun run validate` fails on
a live nested `.gitignore` in vendored content.

## Edge cases

### The installer can silently drop a module's skills

The count a module declares and the count that installs are not the same
number, and nothing errors. Manticore's
`plugins/bmad-manticore/runtime/_bmad/manticore/module-help.csv` lists 16
skills (17 rows, one of which is `_meta`); `plugins/bmad-manticore/skills/`
contains 15. The missing one is `mc-audio`: its `SKILL.md` frontmatter is
invalid YAML — `description:` is an unquoted scalar containing `": "` — so
`yaml.parse` throws, the installer's `parseSkillMd()` returns null, and the
skill never reaches `skill-manifest.csv`. Fixed on upstream `main`, still
broken at `v1.0.1`; documented, not patched, because rewriting installer
output is precisely the merge layer this pipeline exists without.

The sync handles the catalog half of this automatically:
`pruneUnshippedHelpRows()` drops any help row naming a skill the installer
did not install, and `bun run validate` fails if one survives — a row for a
missing skill would make `bmad-help` offer and route into nothing. That is
why the vendored `module-help.csv` carries 16 rows (15 skills plus
`_meta`) against upstream's 17.

What the sync cannot repair is a dead cross-reference inside another
skill's prose: `mc-graphics`, `mc-setup` and `mc-stream-pack` all delegate
sound work to `mc-audio` by name. Check for those by hand when a module
under-installs.

### Per-module artifact defaults can point at `{project-root}/skills/`

Some modules ship output paths that collide with the working repo's own
`skills/` directory. In the current tree:

```
plugins/bmad/runtime/_bmad/bmb/config.yaml:6: bmad_builder_output_folder: "{project-root}/skills"
plugins/bmad/runtime/_bmad/bmb/config.yaml:7: bmad_builder_reports: "{project-root}/skills/reports"
plugins/bmad/runtime/_bmad/gds/config.yaml:7: planning_artifacts: "{project-root}/skills/planning-artifacts"
plugins/bmad/runtime/_bmad/gds/config.yaml:8: implementation_artifacts: "{project-root}/skills/implementation-artifacts"
plugins/bmad/runtime/_bmad/tea/config.yaml:6: test_artifacts: "{project-root}/skills/test-artifacts"
```

The same values appear in `plugins/bmad/runtime/_bmad/config.toml`. These are
upstream defaults captured verbatim, so a user running a bmb/gds/tea workflow
writes generated artifacts into `<repo>/skills/…`, which in a plugin repo is
source. The sync does not rewrite them — rewriting installer output is exactly
the merge layer that was deleted — so a new module with paths like this needs
the collision called out in the plugin README and overridden in the user's
`_bmad/custom/config.toml`.

## Command reference

| Command | Purpose |
|---|---|
| `bun run sync` | Full regeneration: clone custom sources, run the installer, wipe and rebuild every plugin tree, bump versions, refresh README and badges |
| `bun run sync -- --tag v6.11.0` | Pin the core release for this run |
| `bun run sync -- --manticore-tag v1.0.1` | Pin one custom source (`--<id>-tag`) |
| `bun run sync:dry` | Preview only (`--dry-run`) |
| `bun run sync -- --keep-install` | Keep the throwaway `.upstream-install*` dirs and custom-source clones |
| `bun run validate` | Version pins, marketplace integrity, skill surface vs installer manifest, runtime template assets, templatization |
| `bun run test:unit` | Plugin-tree and init-script tests |
| `bun run update-readme` | Regenerate README badges/table and `.github/badges/*.json` alone |
| `bun scripts/list-sources.ts` | Emit the watcher matrix as JSON |

The current surface: 110 skills in `plugins/bmad/skills/`, 15 in
`plugins/bmad-manticore/skills/`.
