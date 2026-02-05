# BMAD Ecosystem

> Inventory of all repositories in the `bmad-code-org` GitHub organization,
> classified by role. Last audited: 2026-02-05.

## Content Modules

Repos that contain agents and workflows to sync into the plugin. Each module
follows a standard layout under `src/`.

| Module | Code | Repo | Agents | Workflows | Version | Release |
|--------|------|------|--------|-----------|---------|---------|
| BMM (core method) | `bmm` | `BMAD-METHOD` | 8 | 8 | 6.0.0-Beta.6 | v6.0.0-Beta.6 |
| Core (shared) | `core` | `BMAD-METHOD` | 1 | 3 | same repo | same repo |
| TEA | `tea` | `bmad-method-test-architecture-enterprise` | 1 | 9 | 0.1.1-beta.3 | none |
| CIS | `cis` | `bmad-module-creative-intelligence-suite` | 6 | 4 | 0.1.3 | v0.1.4 |
| GDS | `gds` | `bmad-module-game-dev-studio` | 7 | 7 | 0.1.4 | v0.1.5 |
| BMB | `bmb` | `bmad-builder` | 3 | 3 | 0.1.4 | v0.1.5 |
| WDS | `wds` | `bmad-method-wds-expansion` | 4 | 16+ | 0.1.0 | none |

### Notes

- **BMM + Core** live in the same monorepo (`BMAD-METHOD`). Our plugin config
  treats them as a single `core` source but only syncs `src/bmm/`. The `core`
  module (bmad-master, brainstorming, etc.) is partially handled as plugin-only
  content.
- **TEA** has no GitHub release yet. We track version from `package.json`.
- **WDS** still has a placeholder package name (`bmad-module-name`) and no
  release. Not ready for integration.

### Standard module layout

All content modules follow this structure:

```text
src/
  module.yaml            # Module metadata (code, name, dependencies)
  module-help.csv        # Help index
  _module-installer/     # installer.js
  agents/                # *.agent.yaml files
  workflows/             # Categorized subdirectories
  teams/                 # Team definitions (yaml + default-party.csv)
  [domain-specific]/     # Optional: testarch/, gametest/, data/, etc.
```

### Workflow organization

All modules use categorized workflows (subdirectories under a parent):

| Pattern | Used by | Example |
|---------|---------|---------|
| Numbered phases | BMM, GDS | `1-analysis/`, `2-design/` |
| Named categories | CIS, BMB | `design-thinking/`, `problem-solving/` |
| Single domain parent | TEA | `testarch/atdd/`, `testarch/ci/` |

## Infrastructure Repos

Repos that support the ecosystem but don't contain syncable content.

| Repo | Purpose | Status |
|------|---------|--------|
| `bmad-bundles` | Web distribution of compiled XML agents | Active |
| `bmad-module-template` | Scaffold for creating new modules | Active |
| `bmad-utility-skills` | Claude Code plugin for BMAD maintainers (triage, changelog, release) | Active |
| `bmad-plugins-marketplace` | Claude Code plugin marketplace registry | Active |
| `bmad-method-vscode` | VS Code extension | Early development |
| `bmad-core-tools` | Module management tooling | Empty placeholder |
| `BMAD-CORE` | Planned core extraction | Empty placeholder |
| `BMAD-FOUNDRY` | Community module hub | Empty placeholder |

### Marketplace vs Plugin distinction

- **`bmad-plugins-marketplace`** is a registry (catalog of available plugins).
  Currently lists only `bmad-utility-skills`.
- **Our repo (`PabloLION/bmad-plugin`)** is the actual content plugin that
  bundles agents and skills from upstream modules. These serve different roles.

## Reference / Legacy

| Repo | Purpose |
|------|---------|
| `Full-Small-App-Workflow` | Legacy snapshot of BMAD-METHOD (alpha.23). Contains TEA inline before extraction. Same `bmad-method` package name. Do NOT sync. |

## Not Ready

| Repo | Reason |
|------|--------|
| `bmad-cyber-sec` | Created from template, still has placeholder values. No agents or workflows. |
| `bmad-method-wds-expansion` | Placeholder package name, no release. Large module (16+ workflows) but not mature. |

## Plugin Integration Status

Which modules are configured in our plugin (`scripts/lib/upstream-sources.ts`):

| Module | Source ID | Status | Tracking issue |
|--------|-----------|--------|----------------|
| BMM + Core | `core` | Configured | — |
| TEA | `tea` | Configured | — |
| CIS | — | Blocked | bmp-dyp |
| GDS | — | Blocked | bmp-mqf |
| BMB | — | Blocked | bmp-333|
| WDS | — | Not planned | Not mature enough |
