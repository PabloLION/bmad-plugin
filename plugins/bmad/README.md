# BMAD Method Plugin for Claude Code

Breakthrough Method for Agile AI-Driven Development — a Claude Code
plugin providing 110 skills (17 agent personas among them, shipped as
skills) across seven upstream modules: core, BMM (the method itself),
GDS (game dev studio), TEA (test architecture), CIS (creative
intelligence), BMB (builder), and BMad Loop (unattended dev-loop
orchestration).

The skill tree is the output of the official
`npx bmad-method install --tools claude-code` installer, copied 1:1 and
regenerated from scratch on every sync. There is no merge or rewrite
layer. As of core v6.11.0 that includes upstream's v6 deprecation shims:
external module repos still invoke those skill IDs, and upstream removes
them at the v7 cut, never in a 6.x minor.

## Requirements

`uv` with Python ≥ 3.11. Upstream v6.11 turned `bmad-build` and
`bmad-build-auto` into loaders that run
`uv run _bmad/scripts/render_skill.py` and **halt** without it. Every
other skill degrades gracefully; `/bmad:init` warns if `uv` is missing.

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Installation

### From marketplace

```sh
claude plugin marketplace add tgorka/bmad-plugin
claude plugin install bmad@bmad-method
```

### From local directory

```sh
claude --plugin-dir /path/to/bmad-plugin/plugins/bmad
```

## Initialize your project

Skills resolve per-project files from `{project-root}/_bmad/` (module
config, shared scripts such as `memlog.py`, `resolve_config.py` and
`render_skill.py`, help catalogs) and write artifacts to configured
output folders. Provision them once per repo:

```sh
/bmad:init
```

Idempotent, and it upgrades as well as seeds: `_bmad/custom/**` is
yours and is never touched; every other file is installer-managed and is
refreshed when it differs from the shipped template, which is how a repo
initialized under an older plugin version picks up new shared scripts
and a current help catalog. The template lives in `runtime/_bmad/` and
the initializer in `scripts/init.sh`; the project name comes from the
directory and the user name from `git config user.name` (both reduced to
characters that are safe inside TOML and YAML).

If you also installed **bmad-manticore** from the same marketplace,
`/bmad:init` registers it (`init.sh --with-plugin bmad-manticore`), which
materializes `_bmad/manticore/` and merges its rows into
`_bmad/_config/bmad-help.csv`. Registration is opt-in because a
marketplace install clones the whole repo — a sibling's files are on disk
whether or not you enabled that plugin.

## Getting started

```sh
/bmad:bmad-help            # skill catalog + module map
/bmad:bmad-forge-idea      # sharpen a half-formed idea
/bmad:bmad-product-brief   # draft a product brief
/bmad:bmad-prd             # create / update / validate a PRD
/bmad:bmad-architecture    # architecture spine
/bmad:bmad-sprint-planning # readiness gate, plan, status
/bmad:bmad-build           # implement a story (needs uv)
/bmad:bmad-code-review     # parallel review layers
/bmad:bmad-customize       # per-skill TOML overrides
/bmad:bmad-loop-setup      # install the bmad-loop orchestrator tool
```

Agent personas are skills too — e.g. `/bmad:bmad-agent-pm` (John, PM),
`/bmad:bmad-tea` (Murat, Test Architect), `/bmad:gds-agent-game-designer`
(Samus Shepard).

## Contents

| Path | What it is |
|---|---|
| `skills/` | The installer's `.claude/skills` output, 1:1. Never hand-edited. |
| `runtime/_bmad/` | The `_bmad/` tree the installer writes, templatized. Materialized by `/bmad:init`. |
| `commands/init.md` | The `/bmad:init` command. |
| `scripts/init.sh` | The initializer it runs. |
| `templates/module-template/` | Upstream's module-authoring scaffold, vendored. Not a plugin — see `templates/README.md`. |

## Upstream

Derived from
[bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD).
See that repository and <http://docs.bmad-method.org> for full
methodology documentation.
