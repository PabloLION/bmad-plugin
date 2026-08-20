---
description: Initialize this repo for BMad — create _bmad/ config, shared scripts, and output folders that skills expect
allowed-tools: Bash
---

Initialize the current working repository for the BMad plugin.

The plugin's skill files are immutable, but every BMad skill resolves
per-project files from `{project-root}/_bmad/` (module config, shared
scripts such as `memlog.py`, `resolve_config.py` and `render_skill.py`,
help catalogs) and writes artifacts to configured output folders. Those
files must exist inside the working repo.

Steps:

1. Decide whether any sibling BMad plugin from this marketplace is
   active. You can tell from your own skill list: if `mc-*` skills such
   as `mc-agent` or `mc-setup` are available to you, the
   **bmad-manticore** plugin is installed. A marketplace install clones
   the whole repo, so the presence of a `plugins/bmad-manticore/`
   directory proves nothing — only your loaded skills do.

2. Run the initializer via the Bash tool, adding one `--with-plugin` for
   each active sibling plugin. It is idempotent, and it upgrades as well
   as seeds: `_bmad/custom/**` is never touched, everything else is
   refreshed when it differs from the shipped template.

   ```sh
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/init.sh"
   # …or, with BMad Manticore installed:
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/init.sh" --with-plugin bmad-manticore
   ```

3. Report the three counts the script prints: created, refreshed, and
   already current (`+` marks a new file, `~` a refreshed one). A
   refresh means an installer-managed file was brought up to the
   plugin's current template — say so plainly if the repo was on an
   older plugin version. If the script says "Repo was already
   initialized", relay that nothing changed.

4. If the script warned that `uv` is missing, relay it: BMAD v6.11
   renders `bmad-build` and `bmad-build-auto` through
   `_bmad/scripts/render_skill.py` and those two skills **halt** without
   `uv` plus Python ≥3.11. The rest of the surface still works.

5. Suggest reviewing `_bmad/config.toml` (installer-managed team answers)
   and `_bmad/custom/` (durable overrides that survive re-initialization)
   — and committing `_bmad/` to version control so the team shares one
   configuration.

6. If `bmad-manticore` was registered, point the user at `mc-setup`: its
   stage skills stay inert until it writes `[modules.manticore]` into
   `_bmad/custom/config.toml`.
