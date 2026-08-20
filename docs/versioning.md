# Versioning Strategy

## Plugin Version

The `bmad` plugin version is **anchored to the core BMAD-METHOD upstream
version**.

Format `<upstream-version>.X` where:

- `<upstream-version>` is the core BMAD-METHOD release verbatim (e.g. `6.11.0`)
- `.X` is a plugin patch counter, reset to 0 on each new upstream release
  (e.g. `6.11.0.0`), incremented on additional plugin releases within the same
  upstream version

The string lives in four places, all rewritten together — `.plugin-version`,
`package.json`, `plugins/bmad/.claude-plugin/plugin.json` and the `bmad` entry
in `.claude-plugin/marketplace.json`. `bun run sync` sets them from the core
release it installed (`bumpVersionAnchors()`); `./scripts/release.sh <version>`
sets them for a manual bump.

`bun run validate` enforces that `.plugin-version` starts with the pinned core
version followed by `.`, and that the remainder is a non-negative integer.

## The Second Plugin's Independent Version Line

`.claude-plugin/marketplace.json` publishes two plugins:

| Plugin | Source | Version | Anchored to |
|---|---|---|---|
| `bmad` | `./plugins/bmad` | `6.11.0.0` | core BMAD-METHOD release + patch counter |
| `bmad-manticore` | `./plugins/bmad-manticore` | `1.0.1` | the upstream module version |

`bmad-manticore` is **not** on the plugin version line. Its
`plugins/bmad-manticore/.claude-plugin/plugin.json` and its marketplace entry
both read `1.0.1`, mirroring the module tag pinned in
`.upstream-versions/manticore.json` (`v1.0.1`). A user installing that plugin
is installing BMad Manticore, so the version they see is Manticore's, not this
repo's.

What is machine-enforced and what is not:

- **Enforced.** `bun run validate` requires every marketplace entry's
  `version` to equal the `version` in the plugin directory's
  `.claude-plugin/plugin.json` (and the `name` likewise), that the directory
  has a non-empty `skills/`, and that no `plugins/<dir>` is unpublished. So
  the two `1.0.1` values cannot drift apart.
- **Convention, not enforced.** Nothing compares `1.0.1` against
  `.upstream-versions/manticore.json`. Keeping them equal is a manual step of
  the manticore bump: raise the tag, run the sync, then edit both `1.0.1`
  strings.

A plugin-version bump does not disturb it. `updateJsonVersionFiles()` in
`scripts/lib/bump-utils.ts` does a single-occurrence `String.replace` of
`"version": "<current-plugin-version>"`, and `release.sh` matches the same
literal with `sed`, so the `1.0.1` line is never a candidate.

## Module Version Tracking

Each source's pinned version is tracked in `.upstream-versions/<id>.json`,
containing `{ "version": "<tag-or-sha>", "syncedAt": "<YYYY-MM-DD>" }`. The
registry that defines the set is
[`scripts/lib/upstream-sources.ts`](../scripts/lib/upstream-sources.ts).

| File | Module | Repo | `kind` | Pinned |
|---|---|---|---|---|
| `core.json` | BMAD Method (core + bmm) | `bmad-code-org/BMAD-METHOD` | `core` | `v6.11.0` |
| `tea.json` | TEA (Test Architect Enterprise) | `bmad-code-org/bmad-method-test-architecture-enterprise` | `registry` | `v1.23.3` |
| `bmb.json` | BMB (BMad Builder) | `bmad-code-org/bmad-builder` | `registry` | `v2.2.1` |
| `cis.json` | CIS (Creative Intelligence Suite) | `bmad-code-org/bmad-module-creative-intelligence-suite` | `registry` | `v0.3.1` |
| `gds.json` | GDS (Game Dev Studio) | `bmad-code-org/bmad-module-game-dev-studio` | `registry` | `v0.7.1` |
| `bmad-loop.json` | BMad Loop | `bmad-code-org/bmad-loop` | `registry` | `v0.11.0` |
| `manticore.json` | BMad Manticore | `bmad-code-org/bmad-manticore` | `custom` | `v1.0.1` |
| `module-template.json` | Module template | `bmad-code-org/bmad-module-template` | `vendored` | `f1440ec80b9c8b13e0779dedd47487b74d634a02` |

`bmm` has no file of its own: it ships inside core and carries the core
version, so `bumpModuleVersions()` skips it.

`.upstream-versions/loop.json` was renamed `bmad-loop.json` in v6.11.0.0. The
id must match the module name in the installer's `_bmad/_config/manifest.yaml`
or the version bump cannot resolve it.

See [`docs/bmad-ecosystem.md`](bmad-ecosystem.md) for the full module
inventory and [`docs/module-integration.md`](module-integration.md) for the
per-`kind` procedure.

### The `kind` field

`kind` records how content reaches the plugin, and it is the only thing that
changes the pin format:

| `kind` | Delivery | Pin format |
|---|---|---|
| `core` | the installer itself (`npx bmad-method@<tag>`) | `v`-prefixed release tag |
| `registry` | official module in upstream's `bmad-modules.yaml`, passed to `--modules` | `v`-prefixed release tag |
| `custom` | real BMad module absent from that registry, cloned at a tag and installed via `--custom-source` | `v`-prefixed release tag |
| `vendored` | not installed; copied in as a plugin asset | full 40-char commit SHA |

`bun run validate` enforces exactly that split
(`scripts/lib/checks/version.ts`): a `vendored` source must match
`/^[0-9a-f]{40}$/` and every other source must match `/^v\d/`. A `vendored`
source is pinned by commit because the module-template repo has no tags and no
releases; anything shorter — a branch name, an abbreviated SHA — would let the
vendored bundle mutate underneath a fixed plugin version.

`kind` also drives two automations: `scripts/list-sources.ts` excludes
`vendored` sources from the CI release-watcher matrix (nothing to compare
against), and `scripts/update-readme-version.ts` renders a `vendored` version
as its first 8 characters in the README table and badge.

### Who writes these files

`bun run sync` writes all of them and they should never be hand-edited after
the first one:

- `core` — from the resolved `--tag` (default: the current `core.json`).
- `registry` — read out of the installer's own
  `_bmad/_config/manifest.yaml` after the install, which is the only record of
  what the installer actually resolved. Per-module
  `_bmad/<mod>/config.yaml` files carry an *installer* version in their
  `# Version:` header, not the module's.
- `custom` — from the tag the clone step checked out
  (`--<id>-tag` or the existing file). A new custom source needs its file
  created by hand first, because the clone reads it before anything writes it.
- `vendored` — read, never written; the pin is a deliberate human choice.

Registry modules cannot be pinned independently: the installer resolves them
from the pinned core release. Moving one means moving `--tag` for core.

## Release Cadence

There is no fixed publish day. What the repo actually does:

- **Weekly watch.** `.github/workflows/sync-upstream.yml` runs on
  `cron: "0 0 * * 1"` (Monday 00:00 UTC) and on manual dispatch. For each
  enabled non-`vendored` source it compares the pinned version against
  `repos/<repo>/releases/latest` and opens one tracking issue per drifted
  source, with the sync command for that `kind`.
- **Manual release.** Releases are cut by hand with
  `./scripts/release.sh` (see [`docs/releasing.md`](releasing.md)). Neither
  the script nor any workflow schedules one, and `release.sh` also runs
  `gh workflow run sync-upstream.yml` after a successful release, so a fresh
  watch happens on release rather than on a calendar slot.

Batching still applies as a working practice — a plugin release bundles
whatever upstreams moved since the last one — but it is a judgement call each
time, not an automated cadence.

## Rationale

- Core-anchored versioning keeps the `bmad` plugin version meaningful: users
  know which BMAD-METHOD generation they are on without reading a changelog.
- A sibling plugin wrapping a single upstream module reports that module's
  version instead, because that is the number its user is choosing.
- Per-source version files let `validate` and the release watcher work without
  cloning any upstream. The cost is that they are derived state which must be
  regenerated by the sync rather than edited.
