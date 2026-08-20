# Plan — v6.11.0 from-scratch rebuild

Status: executing
Date: 2026-08-20
Supersedes nothing; extends `docs/plan-npx-resync.md` (the v6.5.0 move to
installer-sourced content).

## 1. Why a rebuild rather than a bump

`bun run sync` is already a full regeneration (`wipePluginTree()` +
fresh installer run), so "reinstall from scratch" is the normal path —
but three upstream changes in v6.11.0 make a blind re-run produce a
**silently wrong** tree:

1. **The prune gate stopped measuring.** `pruneDeprecatedSkills()` matches
   `description` starting with the literal `DEPRECATED`. v6.11.0 writes
   `description: 'Deprecated — forwards to bmad-prd (create intent).'`
   (sentence case, quoted). The predicate matches **zero** skills, and
   `bun run validate`'s companion check (`frontmatter.includes('DEPRECATED')`)
   misses them too — a gate that passes while measuring nothing.
2. **bmad-loop became an installer module.** v6.11.0 ships
   `bmad-modules.yaml` at the BMAD-METHOD repo root; `bmad-loop` is a
   registry entry (`code: bmad-loop`, `marketplace-plugin: true`). The
   bespoke git-clone in `syncLoopSkills()` now *overwrites* installer
   output with tag-pinned copies.
3. **The runtime tree grew load-bearing pieces.** `_bmad/render/`
   (snapshot area), `_bmad/scripts/render_skill.py`, `config_utils.py`,
   and `_bmad/bmad-loop/`. `bmad-build` / `bmad-build-auto` are pure
   loaders that HALT without `uv` + Python ≥3.11.

## 2. Decisions

### D1 — Stop pruning deprecated shims. Ship the installer surface 1:1.

Reversal of the v6.5.0 policy. Upstream's own
`src/core-skills/v6-shims/README.md` states:

> External module repos (gds, loop, tea, bmb, os-utils) still invoke
> these IDs, so they ship by default. Removal rides the v7 cut — never a
> 6.x minor.

Pruning them in a 6.x minor breaks cross-module invocation from gds /
tea / bmb / bmad-loop. Two of the twenty (`bmad-create-story` 23 KB,
`bmad-dev-story` 26 KB) are full-bodied skills, not forwarders, so the
prune was never a pure no-op either.

Consequence: `pruneDeprecatedSkills()` and the CSV manifest scrub in
`captureRuntimeTemplate()` are deleted; `validate` flips from "no
DEPRECATED skill exists" to "the plugin skill set equals the installer
output exactly".

### D2 — bmad-loop installs as a registry module.

`--modules bmm,bmb,cis,gds,tea,bmad-loop`. `syncLoopSkills()`,
`--loop-tag`, `LOOP_*` constants and `.upstream-loop/` are deleted.
`.upstream-versions/loop.json` is renamed `bmad-loop.json` so the version
id matches the installer manifest name and `bumpModuleVersions()` stops
silently skipping it.

### D3 — bmad-manticore ships as a second plugin in the same marketplace.

Manticore is a real BMad module (`skills/module.yaml`, `code: manticore`)
but is *not* in the official registry. It installs through
`--custom-source <path>`, which accepts a local checkout — so the sync
clones it at a pinned tag and hands the installer a local path, keeping
the run deterministic.

It is a **separate plugin**, not merged into the aggregate, because:

- Its 15 skills carry heavyweight prerequisites (ffmpeg, node/npx, uv,
  Python ≥3.11, multi-GB model caches) irrelevant to most users.
- Every stage skill fails closed until `mc-setup` writes
  `[modules.manticore]` into `_bmad/custom/config.toml` — 14 skills that
  do nothing in a default install.
- `mc-agent` ("talk to Manny") is an always-on persona that would compete
  for activation with the aggregate's agents.

It stays *usable* because the only runtime it needs from core —
`_bmad/scripts/resolve_config.py` and `_bmad/custom/` — is materialised
by `/bmad:init` from the `bmad` plugin, and `mc-setup` bootstraps the
rest itself.

Pin: **`v1.0.1`, the newest tag.** `main` self-declares `3.1.0` but
`CHANGELOG.md` marks both `3.0.0` and `3.1.0` as `- Unreleased`, and the
repo has no tag above `v1.0.1`. Every other source here is tag-pinned;
pinning a bundle to an explicitly-unreleased tree is the regression risk
this rebuild exists to avoid. `check-manticore` in `sync-upstream.yml`
picks up a real `v3.x` tag the day it lands.

Known upstream defect at `v1.0.1`, documented not patched: `mc-audio`'s
frontmatter is invalid YAML — `description:` is an unquoted scalar
containing `": "`, so `yaml.parse` throws, the installer's
`parseSkillMd()` returns null, and the skill is dropped from
`skill-manifest.csv`. 16 declared skills install as 15. Fixed on `main`.

### D4 — bmad-module-template is vendored, not published.

Its `.claude-plugin/marketplace.json` declares `"skills":
["./skills/my-skill"]` and that directory does not exist in any ref —
`skills/` holds a single 0-byte `.gitkeep`. Publishing it would put a
dead plugin entry named `my-module` (description "TODO: What your module
does in one sentence.") into the marketplace.

It is instead vendored under `plugins/bmad/templates/module-template/`
— the `templates/` slot the sync already owns and wipes — pinned by
commit, version-tracked, and referenced from the module-authoring doc.

### D5 — Templatize what the installer bakes in.

`__BMAD_PROJECT_NAME__` already exists. Added:
`__BMAD_USER_NAME__` (the literal `Dev` currently ships in the vendored
tree) and `__BMAD_INSTALL_DATE__` for `_config/manifest.yaml`
timestamps. `init.sh` substitutes all three.

### D6 — `init.sh` gains a `uv` preflight and module-help merging.

`bmad-build` and `bmad-build-auto` contain no workflow logic; they
`uv run _bmad/scripts/render_skill.py` and HALT if `uv` is missing. init
reports this as an actionable prerequisite rather than letting the
flagship skill die at first use. It also appends a sibling plugin's
`module-help.csv` rows into `_bmad/_config/bmad-help.csv` (idempotent),
so an installed `bmad-manticore` shows up in `bmad-help`.

## 3. Version targets

| Source | Was | Now | Provenance |
|---|---|---|---|
| BMAD-METHOD (core + bmm) | v6.10.0 | **v6.11.0** | npm `latest` |
| BMad Builder (bmb) | v2.1.0 | **v2.2.1** | installer manifest |
| Creative Intelligence Suite (cis) | v0.6.0 † | **v0.3.1** | installer manifest |
| Game Dev Studio (gds) | v0.2.1 † | **v0.7.1** | installer manifest |
| Test Architect (tea) | v1.19.0 | **v1.23.3** | installer manifest |
| BMad Loop | v0.8.0 | **v0.11.0** | installer manifest |
| BMad Manticore | — | **v1.0.1** | newest tag |
| Module template | — | **f1440ec8** | commit (no tags) |

† The v6.10 sync wrote `cis.json` and `gds.json` transposed relative to
`_bmad/_config/manifest.yaml` (which recorded cis v0.2.1, gds v0.6.0).
The manifest-driven bump corrects both. CIS is therefore *not* a
downgrade — the pinned value was simply wrong.

## 4. Stories (PR stack, bottom → top, base `main`)

| # | Branch | Concern |
|---|---|---|
| 1 | `chore/sync-6.11-pipeline` | sync/registry/CI: modules list, loop removal, prune removal, custom-source, manifest-driven bumps, templatization, badge-URL and core-repo-slug fixes |
| 2 | `chore/sync-6.11-tree` | regenerated `plugins/bmad/{skills,runtime}` + version anchors |
| 3 | `feat/manticore-and-template` | `plugins/bmad-manticore/**`, vendored module template, multi-plugin marketplace |
| 4 | `feat/init-6.11` | `init.sh` + `/bmad:init` for the new runtime and sibling plugins |
| 5 | `test/gates-6.11` | `validate` rewrite, unit tests, e2e smoke pool |
| 6 | `docs/refresh-6.11` | README, AGENTS, CHANGELOG, docs inventory |

Each layer compiles and passes its own gates alone; layer 2 is generated
content only.
