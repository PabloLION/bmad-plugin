# Contributing

Thank you for your interest in contributing to the BMAD Plugin for Claude Code.

## Branching Model

This project uses **Git Flow** (not GitHub Flow). The key difference:
PRs merge to `dev`, not `main`.

```text
feature-branch → PR → dev → (accumulate) → main → tag release
```

### Branches

| Branch | Purpose |
|---|---|
| `main` | Latest release. What users install from the Claude Code marketplace. |
| `dev` | Development. Where feature PRs merge. |
| `feature/*` | Individual features or fixes. Branch from `dev`. |

### Rules

- **Never push directly to `main`** — always merge from `dev`
- **PR target is `dev`** — not `main`
- **`main` = release** — the Claude Code marketplace reads the default branch,
  so every commit on `main` is immediately available to users
- **Tag releases on `main`** — after merging `dev` → `main`

### Why not GitHub Flow?

The Claude Code plugin marketplace installs from the default branch (`main`)
with no option to specify a different branch. This means `main` must always be
in a releasable state. We use `dev` as a buffer to accumulate and test features
before promoting them to `main`.

## Development Setup

```sh
# Clone and install
git clone https://github.com/PabloLION/bmad-plugin.git
cd bmad-plugin
bun install

# Switch to dev branch
git checkout dev

# Run tests (requires Claude CLI and API access)
bun test
```

## Making Changes

1. Create a feature branch from `dev`:

   ```sh
   git checkout dev
   git pull
   git checkout -b feature/my-change
   ```

2. Make your changes

3. Run tests:

   ```sh
   bun test
   ```

4. Commit using [conventional commits](https://www.conventionalcommits.org/):

   ```text
   feat: add new skill for sprint review
   fix: correct agent prompt for quinn
   docs: update changelog
   ```

5. Open a PR targeting `dev`

## Upstream Sync

This plugin tracks [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
as its upstream. The version is recorded in `.upstream-version-core`. A GitHub Action
checks weekly for new upstream releases and opens an issue when one is found.

## Releasing

Releases are handled by maintainers using:

```sh
./scripts/release.sh <new-version>
```

This bumps the version in all files, commits, tags, pushes, and creates a
GitHub release.
