# Manual Testing Guideline

Manual tests cover what automated tests cannot — primarily plugin loading
behavior in a real Claude Code session, and the two-plugin marketplace
install path.

Verified against the tree on 2026-08-20 (plugin v6.11.0.0). The expected
outputs below were produced by running
`plugins/bmad/scripts/init.sh` in throwaway temp dirs; re-derive them
rather than trusting them if the runtime template changed.

## Setup

The marketplace publishes two plugins, so there are two things to install.
Point Claude Code at a local checkout:

```sh
cd "$(mktemp -d)" && claude --plugin-dir /absolute/path/to/bmad-plugin/plugins/bmad
```

…or exercise the real marketplace path, which is what users hit:

```text
/plugin marketplace add tgorka/bmad-plugin
/plugin install bmad@bmad-method
/plugin install bmad-manticore@bmad-method
```

The marketplace name is `bmad-method`. A marketplace install is a git clone
of the whole repo, so both `plugins/` directories land on disk even if you
only enable one plugin — which is why plugin registration below has to be
explicit.

## What to Test Manually

### 1. Skill registration — `bmad` plugin

Type `/bmad:` and verify autocomplete appears. Focus on representative
cases; if these appear, the rest will too, since they share one
registration mechanism.

- **A core skill** — `/bmad:bmad-help` — confirms core sync works
- **A BMM skill** — `/bmad:bmad-prd` — confirms the monorepo's second
  module works
- **A TEA skill** — `/bmad:bmad-teach-me-testing` — confirms external
  registry-module sync works
- **A GDS skill** — `/bmad:gds-gdd` — confirms a second prefixed module
  works
- **A v6 shim** — `/bmad:bmad-create-prd` — confirms deprecated ids still
  resolve (see step 4)

Every id above exists in `plugins/bmad/skills/`. When editing this list,
check the candidate first: `ls plugins/bmad/skills | grep <name>`.
`bmad-index-docs`, `bmad-shard-doc`,
`bmad-check-implementation-readiness` and `bmad-agent-tech-writer` were
all removed upstream in v6.11 and are no longer valid examples.

### 2. Skill registration — `bmad-manticore` plugin

With the second plugin enabled, type `/bmad-manticore:` and verify the
`mc-*` skills appear — `mc-agent` and `mc-setup` are the two to check,
because `/bmad:init` keys sibling registration off their presence in your
own skill list.

Expect **15** skills, not 16. `mc-audio` is declared upstream but its
frontmatter is invalid YAML at the pinned tag v1.0.1, so the installer
drops it. Its help row still exists, so `mc-audio` will show up in
`/bmad:bmad-help` while having no skill behind it. That is a known,
documented upstream defect — see
[docs/bmad-ecosystem.md](bmad-ecosystem.md).

### 3. Project initialization — plain

Run `/bmad:init` in an empty temp dir.

Expected: `_bmad/` (the four config layers, `custom/`, `scripts/`,
`render/`, per-module `<code>/config.yaml`, `_config/` catalogs),
`_bmad-output/{planning,implementation}-artifacts/`, `docs/`, and
`skills/{planning,implementation,test}-artifacts/` are created — a summary
line reading `Done: 37 created, 0 already present.`

Then check the placeholder substitution actually happened:

- `project_name` in `_bmad/config.toml` matches the directory name
- `user_name` in `_bmad/config.user.toml` matches `git config user.name`
- `installDate` in `_bmad/_config/manifest.yaml` is a real timestamp

No file anywhere under `_bmad/` should still contain `__BMAD_`.

Re-run `/bmad:init`. Expected: `Done: 0 created, 0 refreshed, 37 already
current.` followed by `Repo was already initialized — nothing to do.`

Then test the two halves of the refresh contract:

- Edit `_bmad/custom/config.toml` and re-run. Your edit must survive —
  `custom/` is the user-owned layer and is never touched.
- Overwrite `_bmad/scripts/memlog.py` with `# stale` and re-run. It must
  be reported as `~ … (refreshed)` and restored. Installer-managed files
  are brought up to the shipped template; that is how a repo initialized
  under an older plugin version gets current shared scripts and a current
  help catalog.

### 3b. Upgrading a repo initialized by an older plugin

Worth doing once per release, because it is the case the refresh exists
for. Check out the previous tag's plugin, initialize a temp repo with it,
then run the current `/bmad:init` over the top. Expect the old
`user_name = "Dev"` leak to disappear, `_bmad/scripts/render_skill.py`
and `_bmad/render/` to appear, and no help row naming `bmad-index-docs`,
`bmad-shard-doc` or `bmad-check-implementation-readiness` to remain.

### 4. Merged help catalog

Run `/bmad:bmad-help` and verify it reads
`_bmad/_config/bmad-help.csv` and presents the module map.

The v6.5.0 expectation is now **inverted**: the catalog *does* offer the v6
deprecation shims (`bmad-create-prd`, `bmad-create-architecture`,
`bmad-quick-dev`, `bmad-sprint-status`, …). They are no longer pruned,
because external module repos still invoke those ids — upstream's
`v6-shims/README.md` says removal rides the v7 cut, never a 6.x minor. A
catalog with no deprecated rows is now the failure, not the pass.

Spot-check that Phase 4 is one chain, not the old fan-out. In
`bmad-help.csv`, the `bmad-build` row (display name `Build`, menu code
`BD`, described as the "Official Phase 4 implementation loop") carries
`preceded-by: bmad-sprint-planning` and `followed-by: bmad-code-review`,
and the `bmad-code-review` row carries `preceded-by: bmad-build`. Both sit
in the `ship` phase. `/bmad:bmad-help` should present that ordering.

### 5. Project initialization — with a sibling plugin

In a fresh temp dir, run `/bmad:init --with-plugin bmad-manticore`.

Expected, on top of the plain run:

- `_bmad/manticore/config.yaml` and `_bmad/manticore/module-help.csv`
  created
- a line reading `+ 16 help rows merged from sibling plugins`
- summary `Done: 38 created, 1 refreshed, 0 already current.`
- `grep -c '^BMad Manticore,' _bmad/_config/bmad-help.csv` → `16`
- **no `mc-audio` row.** Upstream v1.0.1 declares that skill but its
  frontmatter is invalid YAML, so the installer refuses to install it and
  the capture drops the row — a row for a missing skill would make
  `bmad-help` route into nothing
- the merged rows are intact: no row glued onto the tail of an existing
  one (the installer writes `bmad-help.csv` without a trailing newline, so
  a naive append corrupts the last existing row)

Then verify `/bmad:bmad-help` shows the Manticore rows alongside the BMad
ones — the merge is the whole point of the flag.

Re-run the same command. Expected `Done: 0 created, 0 refreshed, 38
already current.` and the Manticore row count still `16`, not `32`. The
catalog is reassembled each run from the pristine template plus the
registered siblings' current rows, so re-registering is always safe and a
sibling point release cannot leave a stale row behind.

Also check the negative paths:

- **Opt-in, never inferred.** Run plain `/bmad:init` in a fresh temp dir
  with the whole repo on disk. `_bmad/manticore/` must **not** appear and
  no help rows must be merged. Presence of `plugins/bmad-manticore/` on
  disk proves nothing about whether the plugin is enabled.
- **Unknown plugin fails loudly.** `--with-plugin nope` must exit non-zero
  with `error: no runtime template for plugin 'nope' at …/plugins/nope/runtime/_bmad`.

Finally, confirm the follow-up instruction is relayed: Manticore's stage
skills stay inert until `mc-setup` writes `[modules.manticore]` into
`_bmad/custom/config.toml`.

### 6. The `uv`-missing warning path

`bmad-build` and `bmad-build-auto` are the only two skills with a hard
prerequisite: they run
`uv run --no-cache {project-root}/_bmad/scripts/render_skill.py` and HALT
without `uv` plus Python >= 3.11. Everything else degrades gracefully, so
`/bmad:init` warns and must **not** fail.

Most dev boxes have `uv` installed, so force the path with a stripped
`PATH`:

```sh
env PATH=/usr/bin:/bin bash /path/to/plugins/bmad/scripts/init.sh --dry-run
```

Expected: the normal summary, then a warning block opening with
``warning: `uv` is not on PATH.`` and naming `bmad-build` /
`bmad-build-auto`, `render_skill.py`, Python >= 3.11 and the install
one-liners — and **exit status 0**. A non-zero exit here is a regression.

In a real session, verify Claude relays that warning rather than
swallowing it, and that a non-build skill (e.g. `/bmad:bmad-forge-idea`)
still runs on the same box.

### 7. Skill execution

Run `/bmad:bmad-forge-idea` and verify it starts the
one-question-at-a-time interrogation — a cheap check that a skill's body,
not just its frontmatter, arrived intact.

## What NOT to test manually

- Exhaustive skill listing — the skill surface is gated in both directions
  against the installer's `_config/skill-manifest.csv`
- Skill counts, version consistency, marketplace integrity (every declared
  plugin resolves to a non-empty `skills/` with a matching `plugin.json`,
  and every `plugins/<dir>` is published), templatization, runtime-template
  asset list — all covered by `bun run validate` and `bun run test:unit`
- Init idempotency at file level — covered by `bun test`; step 3 above is
  only a sanity re-run
- Upstream sync integrity — covered by the validation checks
