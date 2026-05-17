# BMAD Ecosystem

> Inventory of all repositories in the `bmad-code-org` GitHub organization,
> classified by role. Last audited: 2026-05-10.

## Content Modules

Repos that contain agents and workflows to sync into the plugin. Each module
follows a standard layout under `src/`.

Counts below reflect **plugin output** at v6.6.0.0 (post-sync, post-prefix-rename
— some upstream skills get `bmad-` / `gds-` prefixes when synced).

| Module | Code | Repo | Plugin Agents | Plugin Skills | Tracked Version |
|--------|------|------|---------------|---------------|-----------------|
| BMM (core method) | `bmm` | `BMAD-METHOD` | 10 | 40 | v6.6.0 |
| Core (shared) | `core` | `BMAD-METHOD` (same monorepo) | included above | included above | v6.6.0 |
| TEA | `tea` | `bmad-method-test-architecture-enterprise` | 1 | 10 | v1.17.0 |
| BMB | `bmb` | `bmad-builder` | 3 | 4 | v1.7.0 |
| CIS | `cis` | `bmad-module-creative-intelligence-suite` | 0 | 10 | v0.2.0 |
| GDS | `gds` | `bmad-module-game-dev-studio` | 7 | 29 | v0.4.0 |
| Plugin-only | — | (this repo) | 1 (Quinn) | — | — |
| **Total** | | | **22** | **93** | |

WDS (`bmad-method-wds-expansion`) is intentionally not integrated — see
[Not Ready](#not-ready).

### Notes

- **BMM + Core** live in the same monorepo (`BMAD-METHOD`). Our plugin config
  treats them as a single `core` source. BMM workflows live under
  `src/bmm-skills/`; the smaller core skill set (`bmad-help`,
  `bmad-customize`, `bmad-brainstorming`, …) lives under `src/core-skills/`
  and is synced via `syncCoreExtras()`.
- **TEA** as of v1.15.1+ ships its agent natively as `SKILL.md` (instead of
  YAML), so no agent-ref mapping is needed for it.
- **GDS v0.4.0** has fully adopted the `bmad-` prefix and `customize.toml`
  authoring pattern.
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

| Module | Source ID | Status | Notes |
|--------|-----------|--------|-------|
| BMM + Core | `core` | Configured | v6.6.0 |
| TEA | `tea` | Configured | v1.17.0 — agent ships as SKILL.md |
| BMB | `bmb` | Configured | v1.7.0 |
| CIS | `cis` | Configured | v0.2.0 |
| GDS | `gds` | Configured | v0.4.0 — uses `gds-` prefix and `customize.toml` |
| WDS | — | Not planned | Not mature enough |
