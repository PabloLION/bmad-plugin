# BMAD Ecosystem

> What this bundle ships, and the state of the wider `bmad-code-org`
> organization. Last audited: **2026-08-20** against plugin v6.11.0.0 /
> core BMAD v6.11.0.
>
> Every count, version and repo claim below was derived in the audit —
> from this tree or from `gh api`. The derivation is named beside the
> claim so the next auditor can re-run it instead of trusting it. For the
> decisions behind the v6.11 shape, see
> [docs/plan-6.11-rebuild.md](plan-6.11-rebuild.md).

## What the bundle ships

`.claude-plugin/marketplace.json` publishes **two** plugins under the
marketplace name `bmad-method`:

| Plugin | Source | Version | Skills |
|--------|--------|---------|--------|
| `bmad` | `./plugins/bmad` | 6.11.0.0 | 110 |
| `bmad-manticore` | `./plugins/bmad-manticore` | 1.0.1 | 15 |

Skill counts: `ls plugins/bmad/skills | wc -l` → 110,
`ls plugins/bmad-manticore/skills | wc -l` → 15. Versions cross-checked
against each plugin's `.claude-plugin/plugin.json`; a `bun run validate`
gate asserts every declared plugin's `plugin.json` name and version equal
the marketplace entry, and — the other direction — that every
`plugins/<dir>` is listed in the marketplace, since an unpublished sibling
directory is dead weight in every clone.

### Delivery mechanisms

`scripts/lib/upstream-sources.ts` is the single registry of upstream
sources. Its `kind` field is the delivery vocabulary used below:

| `kind` | Meaning |
|--------|---------|
| `core` | The installer itself — `npx bmad-method@<tag>` |
| `registry` | An official module in upstream's `bmad-modules.yaml`; passed to the installer's `--modules` |
| `custom` | A real BMad module absent from that registry; cloned at a pinned tag and installed via `--custom-source` |
| `vendored` | Not installed at all; copied in as a plugin asset |

### Modules inside the `bmad` plugin

| Module | Code | Repo | Delivery | Pinned version | Personas | Skills |
|--------|------|------|----------|----------------|----------|--------|
| Core | `core` | `BMAD-METHOD` | installer | v6.11.0 | 0 | 14 |
| BMM | `bmm` | `BMAD-METHOD` (same monorepo) | installer | 6.11.0 | 5 | 35 |
| TEA | `tea` | `bmad-method-test-architecture-enterprise` | installer module | v1.23.3 | 1 (Murat) | 10 |
| BMB | `bmb` | `bmad-builder` | installer module | v2.2.1 | 0 in roster (see below) | 5 |
| CIS | `cis` | `bmad-module-creative-intelligence-suite` | installer module | v0.3.1 | 6 | 10 |
| GDS | `gds` | `bmad-module-game-dev-studio` | installer module | v0.7.1 | 5 | 33 |
| Loop | `bmad-loop` | `bmad-loop` | installer module | v0.11.0 | 0 | 3 |
| **Total** | | | | | **17** | **110** |

Derivations:

- Skills per module — the `module` column of the installer's own
  `plugins/bmad/runtime/_bmad/_config/skill-manifest.csv`
  (111 lines = header + 110 rows; the same file is what the skill-surface
  gate compares `plugins/bmad/skills/` against, in both directions).
- Versions — `plugins/bmad/runtime/_bmad/_config/manifest.yaml`, which
  the installer writes itself, cross-checked against
  `.upstream-versions/<id>.json`. `core` and `bmm` are `source: built-in`
  and carry the installation version; the rest are `source: external`
  with a `channel` and a resolved `sha`.
- Personas — the `[agents.*]` tables in
  `plugins/bmad/runtime/_bmad/config.toml`, grouped by their `module` key:
  bmm 5, cis 6, gds 5, tea 1 = 17.

Notes:

- **CIS v0.2.1 -> v0.3.1 and GDS v0.6.0 -> v0.7.1 are not the bumps they
  look like.** The v6.10 sync wrote `cis.json` and `gds.json` transposed
  against the installer manifest, so the previously published numbers were
  each other's. The manifest is now the sole authority for both.
- **`bmad-loop` is an installer registry module** as of core v6.11.0. The
  earlier claim that it "is not an npx-installer module" is dead: it has a
  `bmad-loop` entry in upstream's `bmad-modules.yaml` with
  `marketplace-plugin: true`, so the installer resolves its skills through
  `.claude-plugin/marketplace.json` rather than a single module directory.
  The bespoke git-clone path (`syncLoopSkills`, `--loop-tag`,
  `.upstream-loop/`) is deleted, and `.upstream-versions/loop.json` was
  renamed `bmad-loop.json` so the id matches the manifest name. The
  orchestrator tool itself is still installed per-project by
  `/bmad:bmad-loop-setup`; upstream carries a `post-install-message`
  saying so.
- **BMB ships no `[agents.*]` roster entry**, but it does ship one
  agent-shaped skill, `bmad-agent-builder`. The earlier "3 personas
  (Bond, Wendy, Morgan)" claim does not survive: BMB's five skills are
  `bmad-agent-builder`, `bmad-bmb-setup`, `bmad-eval-runner`,
  `bmad-module-builder`, `bmad-workflow-builder`.
- **Paige is gone from BMM.** `bmad-agent-tech-writer` no longer exists in
  `plugins/bmad/skills/`. GDS still ships its own `gds-agent-tech-writer`,
  which is why the roster still shows a technical writer under `gds`.
- **20 of the 110 skills announce themselves as deprecated, and they ship
  on purpose.** This reverses the v6.5.0 pruning policy. Upstream
  `v6-shims/README.md` (vendored at
  `plugins/bmad/runtime/_bmad/{core,bmm}/v6-shims/README.md`) states:
  "External module repos (gds, loop, tea, bmb, os-utils) still invoke
  these IDs, so they ship by default. Removal rides the v7 cut — never a
  6.x minor."
  Two counts exist and they differ by one, which matters if you are
  writing a gate: `grep -c v6-shims` on the skill manifest gives **19**
  (6 under `core/v6-shims/`, 13 under `bmm/v6-shims/`), while counting
  skills whose frontmatter `description` starts with `Deprecated` gives
  **20** — `bmad-generate-project-context` is deprecated but lives beside
  its replacement in `bmm/plan/`, not under `v6-shims/`. Directory
  membership is therefore not a reliable predicate for "is a shim".
  Two of them — `bmad-create-story` and `bmad-dev-story` — are retained
  in full, not forwarders, so "shim" does not imply "empty".

### The `bmad-manticore` plugin

BMad Manticore is a real BMad module (`skills/module.yaml`,
`code: manticore`) but it is **absent from upstream's
`bmad-modules.yaml`**, so it cannot arrive through `--modules`. The sync
clones it at its pinned tag and hands the installer a **local path** via
`--custom-source`; a URL would resolve the moving default branch instead
of the pin.

It is a separate plugin rather than more skills in `bmad` because its cost
profile is different in kind:

- Heavy prerequisites: ffmpeg, node/npx, `uv`, Python >= 3.11, multi-GB
  model caches.
- 14 of its 15 skills fail closed until `mc-setup` writes
  `[modules.manticore]` into `_bmad/custom/config.toml`.
- `mc-agent` ("talk to Manny") is an always-on persona, which a user who
  only wants planning skills should not have to carry.

Pinned to **v1.0.1**. Upstream `main` self-declares 3.1.0, but its
CHANGELOG marks both 3.0.0 and 3.1.0 "- Unreleased" and
`gh api repos/bmad-code-org/bmad-manticore/tags` returns only `v1.0.1`
and `v1.0.0`. Pinning to a self-declared, untagged version would make the
pin unreproducible, so the tag wins.

Two upstream defects at v1.0.1 are documented rather than patched — this
repo is a regeneration pipeline, and a local patch would be silently
reverted by the next sync:

1. **16 declared skills install as 15.** `mc-audio`'s frontmatter is
   invalid YAML: `description:` is an unquoted plain scalar containing
   `": "`. Verified against
   `repos/bmad-code-org/bmad-manticore/contents/skills/mc-audio/SKILL.md?ref=v1.0.1`.
   The installer's `parseSkillMd` drops it, so
   `plugins/bmad-manticore/skills/` holds 15 directories while
   `gh api .../contents/skills?ref=v1.0.1` counts 16, and
   `plugins/bmad-manticore/runtime/_bmad/manticore/module-help.csv` still
   advertises an `mc-audio` row.
2. **`mc-agent` is not in the core `[agents.*]` roster.**
   `grep -c mc-agent plugins/bmad/runtime/_bmad/config.toml` → 0, so
   roster-driven consumers (help routing, party mode) do not see Manny.

`/bmad:init --with-plugin bmad-manticore` registers the sibling: it
materializes `_bmad/manticore/{config.yaml,module-help.csv}` and merges
that module's help rows into `_bmad/_config/bmad-help.csv`. Registration
is opt-in and never inferred — a marketplace install is a git clone of the
whole repo, so `plugins/bmad-manticore/` is on disk whether or not the
plugin is enabled.

## The wider bmad-code-org organization

`gh api orgs/bmad-code-org/repos?per_page=100` returns 16 repositories.
All of them:

| Repo | Role | Status |
|------|------|--------|
| `BMAD-METHOD` | Core + BMM monorepo; owns `bmad-modules.yaml` and the installer | Active, bundled |
| `bmad-builder` | BMB module | Active, bundled |
| `bmad-module-creative-intelligence-suite` | CIS module | Active, bundled |
| `bmad-module-game-dev-studio` | GDS module | Active, bundled |
| `bmad-method-test-architecture-enterprise` | TEA module | Active, bundled |
| `bmad-loop` | Loop module + orchestrator tool | Active, bundled |
| `bmad-manticore` | Video production module | Active, bundled as its own plugin |
| `bmad-module-template` | Module-authoring scaffold | Active, vendored as an asset (not published) |
| `bmad-plugins-marketplace` | Official module registry (separate repo, not a Claude marketplace) | Active, not bundled |
| `bmad-skills` | Generated publish target for BMAD-METHOD skills | Active, machine-written, not bundled |
| `bmad-utility-skills` | Plugin of maintainer skills (triage, changelog, release) | Active, not bundled |
| `bmad-method-ui` | VS Code extension (was `bmad-method-vscode`) | Active, not bundled |
| `bmad-method-sample-data` | Sample data for testing workflows | Active, not bundled |
| `bmad-method-wds-expansion` | Whiteport Design Studio module | **Deprecated**, not bundled |
| `bmad-automator` | Predecessor of `bmad-loop` | **Archived + deprecated**, not bundled |
| `.github` | Org profile / shared workflow config | Infrastructure |

### Every module repo now carries its own marketplace manifest

This is new since the last audit and it changes how upstream distributes.
`gh api repos/bmad-code-org/<repo>/contents/.claude-plugin/marketplace.json`
resolves (non-zero `size`) for: `BMAD-METHOD`, `bmad-builder`,
`bmad-module-creative-intelligence-suite`,
`bmad-module-game-dev-studio`,
`bmad-method-test-architecture-enterprise`, `bmad-loop`,
`bmad-manticore`, `bmad-module-template`, `bmad-utility-skills` and
`bmad-method-wds-expansion`. It 404s only for `bmad-skills`.

Consequence for this repo: a module is now installable as a Claude plugin
straight from its own repo. We keep installer-sourced sync anyway, because
the installer is what resolves inter-module versions, writes
`_bmad/_config/manifest.yaml`, and generates the config and help catalogs
that every skill reads at runtime. Ten independent plugin installs would
produce no `_bmad/` tree at all. The tradeoff is that we are one
regeneration behind upstream's own manifests rather than tracking them
directly.

### Two registries, and they are not the same thing

Distinguishing these is the easiest way to misread the ecosystem:

- **`bmad-modules.yaml`**, at the root of `BMAD-METHOD` — the *installer's*
  registry. It decides what the installer picker offers, in what order,
  under which `code`, on which `default_channel`, and whether an entry is
  `deprecated`. Verified at `ref=v6.11.0`: it lists `bmad-builder`,
  `bmad-creative-intelligence-suite`,
  `bmad-method-test-architecture-enterprise`, `bmad-loop`,
  `bmad-game-dev-studio`, then `bmad-automator` and
  `bmad-method-wds-expansion` under a "Deprecated" comment block.
- **`bmad-plugins-marketplace`** — a *separate repository* upstream runs as
  the community-facing registry. It has no
  `.claude-plugin/marketplace.json` of its own (404); it holds
  `registry/{official,utility,community}/` YAML entries, a
  `registry-schema.yaml`, `categories.yaml`, `GOVERNANCE.md` and a
  generated `INDEX.md`. Its README calls it "the official registry of BMad
  modules … the single source of truth for what modules are available,
  their versions, and their trust status", and states that the installer
  resolves module versions from it. As audited, `INDEX.md` says
  "3 modules registered — Official: 0 | Utility: 1 | Community: 2":
  `bmad-utility-skills`, `whiteport-design-studio` and a third-party
  `suno-band-manager`. The community tier pins an approved tag plus commit
  SHA; official and utility tiers track `main`.

  So the registry is real but thinly populated, and the modules this
  bundle ships are *not* in it. Take module availability from
  `bmad-modules.yaml`, not from `INDEX.md`.

### `bmad-skills` is a generated mirror, not a source

Repo description: "Packaged BMAD Method skills — generated from
BMAD-METHOD, do not edit". Its README opens with "**Temporary
scaffolding.** This repository is a machine-written publish target …
Every file here is build output. The packager in BMAD-METHOD generates the
`skills/` tree and replaces it wholesale on each publish. **Do not edit**;
pull requests will be closed." It exists to serve
`npx skills add bmad-code-org/bmad-skills`.

Never sync from it. It is downstream of the same content this repo already
takes from the installer, and it is replaced wholesale, so any diff we saw
would be packaging noise rather than an upstream change.

### `bmad-automator` is archived and superseded by `bmad-loop`

`gh api` reports `archived: true`. Its README title is "Story Automator
(DEPRECATED)" and says it "has been replaced with the newer BMad-Loop —
the same fuctionality, with braoder support, customization, and control"
[sic], with no further updates planned. `bmad-modules.yaml` keeps the
entry only so existing installs can manage it, marked `deprecated: true`
with the message "BMad Automator has been deprecated and is replaced by
BMad Loop (bmad-loop). Install BMad Loop instead."

Its old `code` was `automator`, and the `bmad-loop` entry carries
`aliases: [bauto]` — a pre-rename code from when the module was
`bmad-auto`. Upstream's `quick-update` migrates a `bauto` install forward
and removes the stale `_bmad/bauto/` directory.

### `bmad-method-wds-expansion` is deprecated and hidden from the picker

Not merely "not mature", which is what the previous audit said.
`bmad-modules.yaml` gives it `deprecated: true` plus
`deprecation-message: "Whiteport Design Studio is no longer receiving
updates. Its capabilities are being folded into BMad Method (bmm) as
enhanced UX features. Your existing install is kept as-is."` The header
comment of the same file defines the mechanism: "when true, the module is
hidden from the installer picker UNLESS it is already installed (so
existing users can still see/manage it, but new users are not offered
it)."

The repo itself is not archived and does ship a marketplace manifest; the
entry also carries `plugin_name: bmad-wds`, because its manifest declares
the plugin under that name rather than the module code. Its capabilities
are folding into `bmm`, so integrating it would duplicate a surface we
already get from core.

### Repos that vanished since the 2026-07-04 audit

`gh api repos/bmad-code-org/<name>` returns 404 for every one of these,
which the previous version of this document listed as live:
`bmad-bundles`, `bmad-core-tools`, `BMAD-CORE`, `BMAD-FOUNDRY`,
`bmad-cyber-sec`, `Full-Small-App-Workflow`. They were deleted or made
private; treat every claim the old audit made about them as void.

`bmad-method-vscode` was renamed: the same query now resolves to
`bmad-code-org/bmad-method-ui` through GitHub's rename redirect.

### Upstream module layout is no longer uniform

The previous audit asserted a single `src/`-based layout for all content
modules. That is now false, and `bmad-modules.yaml`'s
`module-definition` paths are the authority:

| Module | `module-definition` | Skills live under |
|--------|---------------------|-------------------|
| BMB | `skills/module.yaml` | `skills/` at repo root |
| CIS | `src/module.yaml` | `src/skills/` |
| TEA | `src/module.yaml` | `src/{agents,workflows}/` |
| GDS | `src/module.yaml` | `src/{agents,workflows}/` |
| Loop | `src/bmad_loop/data/skills/bmad-loop-setup/assets/module.yaml` | resolved from its marketplace manifest |

Confirmed by listing `contents/src` (and `contents/skills` for BMB) on
each repo. This divergence costs this repo nothing: since the v6.5.0 move
to installer-sourced sync, the installer resolves layout and we never read
these paths. That is the main reason the installer-based pipeline is worth
its indirection.

## Deliberately not bundled

Three things are reachable and deliberately left out.

### `bmad-module-template` — vendored, never published

It is copied into `plugins/bmad/templates/module-template/` and pinned by
commit `f1440ec80b9c8b13e0779dedd47487b74d634a02`, because
`gh api repos/bmad-code-org/bmad-module-template/tags` and `/releases`
both return `0` — there is nothing else to pin to. A `bun run validate`
gate enforces that `vendored` sources pin a full 40-character SHA while
`registry` and `custom` sources pin a `v`-prefixed tag.

It is **not** a marketplace plugin because its own manifest cannot resolve.
`.claude-plugin/marketplace.json` declares:

```json
"skills": ["./skills/my-skill"]
```

and `gh api .../contents/skills` returns exactly one entry: a 0-byte
`.gitkeep`. The `my-skill` scaffold exists in no upstream ref — an early
`.gitignore` line (`.*/skills`) swallowed it. Publishing it would produce a
plugin whose `skills/` is empty, which the marketplace-integrity gate
rejects by design (every declared plugin must resolve to a directory whose
`plugin.json` name and version match the entry and whose `skills/` is
non-empty).

The template's own `.gitignore` is stored as `dot.gitignore`, so a live
nested `.gitignore` cannot exclude sibling template files from this repo.
See `plugins/bmad/templates/README.md`, which is hand-authored and is why
`wipePluginTree()` clears
`plugins/bmad/templates/module-template` specifically rather than the
whole `templates/` directory.

### `bmad-method-wds-expansion` — deprecated upstream

Hidden from the installer picker for new users, no longer receiving
updates, and folding into `bmm`. Integrating it now would import a surface
that upstream is actively retiring.

### `bmad-automator` — archived, replaced

Archived, deprecated in the installer registry, and fully replaced by
`bmad-loop`, which this bundle already ships. Nothing to gain.

## Plugin integration status

Source of truth: `scripts/lib/upstream-sources.ts`. All eight entries are
`enabled: true`.

| Source id | Repo | `kind` | Pin |
|-----------|------|--------|-----|
| `core` | `bmad-code-org/BMAD-METHOD` | `core` | v6.11.0 |
| `tea` | `bmad-code-org/bmad-method-test-architecture-enterprise` | `registry` | v1.23.3 |
| `bmb` | `bmad-code-org/bmad-builder` | `registry` | v2.2.1 |
| `cis` | `bmad-code-org/bmad-module-creative-intelligence-suite` | `registry` | v0.3.1 |
| `gds` | `bmad-code-org/bmad-module-game-dev-studio` | `registry` | v0.7.1 |
| `bmad-loop` | `bmad-code-org/bmad-loop` | `registry` | v0.11.0 |
| `manticore` | `bmad-code-org/bmad-manticore` | `custom` | v1.0.1 |
| `module-template` | `bmad-code-org/bmad-module-template` | `vendored` | `f1440ec8…` |

The core repo slug is `bmad-code-org/BMAD-METHOD`. The older
`bmadcode/BMAD-METHOD` still redirects, but the canonical org name is the
one recorded here.

Adding a module is now one registry entry and nothing else:
`scripts/list-sources.ts` emits this list as JSON and
`.github/workflows/sync-upstream.yml` builds its release-watcher job
matrix from that output, replacing what used to be six copy-pasted
per-module jobs.
