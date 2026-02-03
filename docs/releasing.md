# Release Process

Steps to publish a new plugin version.

## Pre-release Checklist

- [ ] All changes committed and pushed
- [ ] PR merged to main (use `--merge`, not `--squash`)
- [ ] Tests pass (`bun run validate`)

## Version Update

Update version in three places:

1. `plugins/bmad/.claude-plugin/plugin.json` — `version` field
2. `.claude-plugin/marketplace.json` — `plugins[0].version` field
3. `README.md` — version line in `<!-- upstream-version-start -->` block

Version format: `<upstream-version>.X` (e.g., `6.0.0-Beta.4.4`)

See [versioning.md](versioning.md) for the full strategy.

## Create Tag and Release

```sh
# Ensure you're on main with latest changes
git checkout main && git pull

# Create and push tag
git tag v6.0.0-Beta.4.X
git push origin v6.0.0-Beta.4.X

# Create GitHub release
gh release create v6.0.0-Beta.4.X --title "v6.0.0-Beta.4.X" --notes "release notes here"
```

## Release Notes Template

```markdown
## What's Changed

### Breaking Changes

- (if any)

### Features

- (new features)

### Fixes

- (bug fixes)

### Docs

- (documentation changes)

**Full Changelog**: https://github.com/PabloLION/bmad-plugin/compare/vPREVIOUS...vNEW
```

## Post-release

- [ ] Verify release appears on GitHub releases page
- [ ] Verify tag exists: `git tag -l | grep <version>`
- [ ] Test installation from marketplace in a fresh session
