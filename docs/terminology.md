# Terminology

Common terms used in this repository. Contributors should use these
consistently in code, documentation, and issue descriptions.

Verified against the tree on 2026-08-20 (plugin v6.11.0.0): the vocabulary
below names files that `plugins/bmad/scripts/init.sh` actually creates from
`plugins/bmad/runtime/_bmad/`, plus the layers
`plugins/bmad/runtime/_bmad/scripts/config_utils.py` actually reads. For
the decisions behind the v6.11 shape, see
[docs/plan-6.11-rebuild.md](plan-6.11-rebuild.md).

## Vocabulary

| Term | Path | Written by | Scope |
|---|---|---|---|
| Runtime template | `plugins/bmad/runtime/_bmad/` | `bun run sync` | Ships with the plugin (read-only) |
| Project runtime | `_bmad/` | `/bmad:init` | Per-project |
| Base central config | `_bmad/config.toml` | Installer / `/bmad:init` | Per-project, team |
| Personal central config | `_bmad/config.user.toml` | Installer / `/bmad:init` | Per-project, per-user |
| Team override | `_bmad/custom/config.toml` | Hand-edited | Per-project, committed |
| Personal override | `_bmad/custom/config.user.toml` | Hand-edited | Per-project, gitignored |
| Skill override | `_bmad/custom/<skill>.toml`, `_bmad/custom/<skill>.user.toml` | Hand-edited or `bmad-customize` | Per-project, per-skill |
| Module config | `_bmad/<code>/config.yaml` | Installer / `/bmad:init` | Per-project, per-module |
| Catalogs | `_bmad/_config/` | Installer / `/bmad:init` | Per-project |
| Shared scripts | `_bmad/scripts/` | Installer / `/bmad:init` | Per-project |
| Render cache | `_bmad/render/` | `render_skill.py` at runtime | Per-project, gitignored |
| Output folder | `_bmad-output/` | Skills at runtime | Per-project |
| Memlog | `{workspace}/.memlog.md` | `_bmad/scripts/memlog.py` | Per-run |
| Plugin root | `${CLAUDE_PLUGIN_ROOT}` | Claude Code | Per-installation |

### Runtime template vs project runtime

`plugins/bmad/runtime/_bmad/` is the **runtime template**: the whole
`_bmad/` tree the installer produced, captured verbatim and templatized.
It is plugin content and immutable at runtime.

`_bmad/` in the user's repo is the **project runtime**. `/bmad:init`
(`plugins/bmad/scripts/init.sh`) materializes the template into it file by
file: a bare repo gets 37 files and directories, and a re-run reports
`Done: 0 created, 0 refreshed, 37 already current.`

The two halves of the refresh contract are worth naming, because they
decide what a plugin update can and cannot change in your repo:

- **User-owned** — `_bmad/custom/**`. Never read back, never rewritten.
  This is where durable overrides belong.
- **Installer-managed** — everything else. Upstream's own header on
  `config.toml` says "Regenerated on every install — treat as read-only",
  and init honours that: a file whose content differs from the shipped
  template is refreshed and reported with `~`. Without this a repo
  initialized under an older plugin could never be upgraded.

The install date already recorded in a file is reused when it is
refreshed, so a re-run reports content changes rather than clock ticks.

Nested `.gitignore` files are stored in the template as `dot.gitignore` and
restored to their real name on copy. A live nested `.gitignore` inside the
template would exclude sibling template files from this repo, so a
`bun run validate` gate forbids one.

### Templatization placeholders

Three placeholders in the template are substituted at init time:

| Placeholder | Filled from |
|---|---|
| `__BMAD_PROJECT_NAME__` | the target directory name |
| `__BMAD_USER_NAME__` | `git config user.name` |
| `__BMAD_INSTALL_DATE__` | init time |

A gate forbids any vendored file containing `.upstream-install` or a
`user_name` other than the placeholder — the v6.10 tree had shipped a real
user name (`Dev`) baked into the template.

### Layered central config

v6.11 replaced the single config file with four TOML layers. Later layers
deep-merge over earlier ones; keyed array entries merge by key:

```text
_bmad/config.toml               base, installer-managed
_bmad/config.user.toml          personal install answers, installer-managed
_bmad/custom/config.toml        team overrides, committed
_bmad/custom/config.user.toml   personal overrides, gitignored
```

**Where this precedence is verifiable.** The chain is in
`load_central_config()` in `plugins/bmad/runtime/_bmad/scripts/config_utils.py`,
which passes exactly those four paths to `merge_layers()` in that order —
that function is the authority. `_bmad/config.toml`'s own header comment
confirms the *intent* of the last two ("To pin a value regardless of
install answers, or to add custom agents / override descriptors, use:
`_bmad/custom/config.toml` (team, committed) / `_bmad/custom/config.user.toml`
(personal, gitignored). Those files are never touched by the installer.")
but it does not name `_bmad/config.user.toml` as a layer at all.
`resolve_config.py`'s docstring corroborates the count independently —
"Resolve BMad's four central TOML layers to JSON". Read
`config_utils.py`, not the header, when the exact order matters.

Both installer-managed layers carry "Regenerated on every install — treat
as read-only" in their headers. `_bmad/config.toml` holds team-scoped
answers (`[core] project_name`, `output_folder`, the `[modules.*]` tables,
and the `[agents.*]` persona roster); `_bmad/config.user.toml` holds
answers scoped to one person (`[core] user_name`,
`communication_language`, `[modules.bmm] user_skill_level`).

`_bmad/custom/.gitignore` contains exactly `*.user.toml`, which is what
makes the personal override layer local-only while the team layer commits.

### Skill override

A separate, narrower chain for one skill's own settings, in
`load_customization()` in the same file:

```text
<skill>/customize.toml            shipped with the skill (required)
_bmad/custom/<skill>.toml         team override
_bmad/custom/<skill>.user.toml    personal override
```

90 of the 110 skills ship a `customize.toml`
(`ls plugins/bmad/skills/*/customize.toml | wc -l`). The `bmad-customize`
skill authors the override files.

### Module config

`_bmad/<code>/config.yaml` — a per-module YAML config the installer writes
alongside `_bmad/<code>/module-help.csv`. The `bmad` plugin ships seven
(`core`, `bmm`, `bmb`, `cis`, `gds`, `tea`, `bmad-loop`);
`/bmad:init --with-plugin bmad-manticore` adds `_bmad/manticore/`.

These are the installer's own per-module surface and duplicate some values
from the central TOML config. Prefer the TOML layers when writing new
tooling; treat the YAML as installer output.

### Catalogs

`_bmad/_config/` holds the installer's generated indexes:

| File | Contents |
|---|---|
| `manifest.yaml` | Installation version and one entry per installed module (version, source, channel, resolved SHA) |
| `skill-manifest.csv` | One row per installed skill: canonical id, name, description, module, path |
| `bmad-help.csv` | The aggregate help catalog `/bmad:bmad-help` reads |
| `files-manifest.csv` | The installer's file inventory |

`bmad-help.csv` is the merge target for sibling plugins:
`/bmad:init --with-plugin <name>` appends that plugin's
`_bmad/<code>/module-help.csv` rows into it, row-level and idempotent
(a row already present is never duplicated).

### Shared scripts

`_bmad/scripts/` — Python helpers skills invoke by path, run through
`uv run`:

| Script | Role |
|---|---|
| `config_utils.py` | Layer loading and structural merge; imported by the others |
| `resolve_config.py` | Resolve the four central layers to JSON, or extract one dotted key |
| `resolve_customization.py` | Resolve a skill's default, team, and user customization layers |
| `render_skill.py` | Render a skill's Markdown sources into an immutable snapshot under `_bmad/render/` |
| `memlog.py` | Append-only run memory |

**`uv` plus Python >= 3.11 is a hard prerequisite for exactly two skills.**
`bmad-build` and `bmad-build-auto` carry no workflow logic of their own:
they run `uv run --no-cache {project-root}/_bmad/scripts/render_skill.py`
and HALT if `uv` is unavailable. Everything else degrades gracefully by
reading its own config directly, so `/bmad:init` warns about a missing `uv`
and never fails on it.

### Render cache

`_bmad/render/` — immutable, content-addressed snapshots of rendered
skills, produced by `render_skill.py`. The path shape is
`_bmad/render/<skill>/<project-slug>-<root-hash>/<generation-hash>`, where
the generation hash covers the project root, the renderer's own SHA-256,
the resolved config values and the source hashes — so a config or source
change lands in a new directory rather than mutating one. Fully local: its
`.gitignore` is `*` plus `!.gitignore`, so nothing in it is ever committed.

### Output folder

Where BMAD workflows write generated artifacts. `_bmad-output` in the
project root, set by `[core] output_folder` in `_bmad/config.toml`; the
`[modules.bmm]` tables point `planning_artifacts` and
`implementation_artifacts` at `{project-root}/_bmad-output/…`.

`/bmad:init` creates `_bmad-output/planning-artifacts`,
`_bmad-output/implementation-artifacts`, and `docs/`. It also creates
`skills/planning-artifacts`, `skills/implementation-artifacts` and
`skills/test-artifacts`, because `bmb` builds into `skills/` and `gds` and
`tea` hang their artifact folders off the same directory — an upstream
module default, reproduced so an initialized repo matches a real
`npx bmad-method install`.

Change the location by editing `output_folder` in a `custom/` layer, not in
`_bmad/config.toml` (which the next install regenerates).

### Memlog

`{workspace}/.memlog.md` — an append-only, chronological record of
everything that mattered in one run of a skill: decisions, changes,
overrides, assumptions, events, one entry per line at the end. It persists
across sessions so a fresh session can resume from it, and downstream
artifacts (a brief, a PRD, a report) are derived from it rather than being
it.

All writes go through `_bmad/scripts/memlog.py` (`init`, `append`, `set`) —
never by hand. The script is append-only by design: there is no edit or
delete subcommand, and history is never rewritten. Callers address it with
`--workspace DIR` (the memlog is always `{workspace}/.memlog.md`) or
`--path FILE`.

### Plugin root

`${CLAUDE_PLUGIN_ROOT}` — the installed plugin directory, set by Claude
Code. Used to reach plugin-shipped files whose location depends on install
scope, e.g. `bash "${CLAUDE_PLUGIN_ROOT}/scripts/init.sh"`.

## Install Scope

The plugin install scope is controlled by the user, not the plugin. A
plugin can be installed globally (user scope), per-project, or locally. We
cannot assume or control which scope the user chooses — which is why
plugin-shipped paths go through `${CLAUDE_PLUGIN_ROOT}` and per-project
state goes under `_bmad/`.
