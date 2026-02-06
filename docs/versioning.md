# Versioning Strategy

## Plugin Version

The plugin version is **anchored to the core BMAD-METHOD upstream version**.

Current format: `<upstream-version>.X` where:

- `<upstream-version>` is the core BMAD-METHOD release verbatim (e.g., `6.0.0-Beta.4`)
- `.X` is a plugin patch counter, reset to 1 on each new upstream release, incremented
  on additional plugin releases within the same upstream version

The plugin version lives in `plugins/bmad/.claude-plugin/plugin.json`.

## Module Version Tracking

Each upstream module's version is tracked in a separate file at the repo root:

| File | Module | Repo |
|---|---|---|
| `.upstream-version-core` | BMAD-METHOD (core) | `BMAD-METHOD` |
| `.upstream-version-tea` | TEA (Test Architect Enterprise) | `bmad-method-test-architecture-enterprise` |

Planned (pending bmp-h6k):

| File | Module | Repo |
|---|---|---|
| `.upstream-version-cis` | CIS (Creative Intelligence Suite) | `bmad-module-creative-intelligence-suite` |
| `.upstream-version-gds` | GDS (Game Dev Studio) | `bmad-module-game-dev-studio` |
| `.upstream-version-bmb` | BMB (BMad Builder) | `bmad-builder` |

All version files follow the pattern `.upstream-version-<module-id>`.
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
- Per-module version files allow validation without re-cloning upstreams
