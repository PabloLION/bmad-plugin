# Versioning Strategy

## Plugin Version

The plugin version is **anchored to the core BMAD-METHOD upstream version**.

Current format: `<upstream-version>.X` where:

- `<upstream-version>` is the core BMAD-METHOD release verbatim (e.g., `6.5.0`)
- `.X` is a plugin patch counter, reset to 1 on each new upstream release, incremented
  on additional plugin releases within the same upstream version

The plugin version lives in `plugins/bmad/.claude-plugin/plugin.json`.

## Module Version Tracking

Each upstream module's version is tracked in `.upstream-versions/<id>.json`:

| File | Module | Repo |
|---|---|---|
| `.upstream-versions/core.json` | BMAD-METHOD (core) | `BMAD-METHOD` |
| `.upstream-versions/tea.json` | TEA (Test Architect Enterprise) | `bmad-method-test-architecture-enterprise` |
| `.upstream-versions/bmb.json` | BMB (BMad Builder) | `bmad-builder` |
| `.upstream-versions/cis.json` | CIS (Creative Intelligence Suite) | `bmad-module-creative-intelligence-suite` |
| `.upstream-versions/gds.json` | GDS (Game Dev Studio) | `bmad-module-game-dev-studio` |

Each file contains `{ "version": "<tag>", "syncedAt": "<YYYY-MM-DD>" }`.
See `docs/bmad-ecosystem.md` for the full module inventory.

These files are updated by `bun run sync` and checked by `bun run validate`.

## Release Schedule

Batch releases to reduce churn from multiple upstreams:

- **Weekly check**: Monitor all upstream repos for new releases
- **Wednesday**: Publish plugin update if any upstream changed

No release is made if no upstream changed since the last release.

## Rationale

- Core-anchored versioning keeps the plugin version meaningful (users know which
  BMAD-METHOD generation they're on)
- Batch releases prevent excessive churn when multiple modules update independently
- Per-module version files (in `.upstream-versions/`) allow validation without re-cloning upstreams
