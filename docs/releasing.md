# Release Process

## Quick Release

```sh
./scripts/release.sh <new-version>
# Example: ./scripts/release.sh 6.0.0-Beta.4.5
```

The script handles:

- Version bump in `.plugin-version`, `package.json`, `plugin.json`, `marketplace.json`
- README version line update via `bun run update-readme`
- Git commit and tag
- Push and GitHub release creation

## Pre-release Checklist

- [ ] All changes committed and pushed
- [ ] On `main` branch with latest changes
- [ ] Tests pass (`bun run validate`)

## Version Format

`<upstream-version>.X` (e.g., `6.0.0-Beta.4.4`)

See [versioning.md](versioning.md) for the full strategy.

## Post-release Verification

- [ ] Release appears on [GitHub releases](https://github.com/PabloLION/bmad-plugin/releases)
- [ ] Tag exists: `git tag -l | grep <version>`
