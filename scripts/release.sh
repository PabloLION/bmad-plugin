#!/usr/bin/env bash
# Release workflow: bump version on dev, create PR to main, merge, tag, release.
# main is protected — direct push is not allowed, so we use a PR-based flow.
#
# Usage: ./scripts/release.sh [new-version]
#
# If new-version is provided, bumps version files on dev first.
# If omitted, releases the current version from dev as-is.
#
# Example: ./scripts/release.sh 6.0.0-Beta.7.0
# Example: ./scripts/release.sh              # release current version

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_VERSION="$(cat "$ROOT/.plugin-version" | tr -d 'v \n')"

# Ensure we start on dev
if [[ "$CURRENT_BRANCH" != "dev" ]]; then
  echo "Error: must be on dev branch (currently on $CURRENT_BRANCH)" >&2
  exit 1
fi

# Ensure working tree is clean (except beads which we'll sync)
if [[ -n "$(git diff --name-only -- ':!.beads')" ]] || [[ -n "$(git diff --cached --name-only -- ':!.beads')" ]]; then
  echo "Error: uncommitted changes on dev (excluding .beads/). Commit or stash first." >&2
  git status -s
  exit 1
fi

# --- Step 1: Bump version (optional) ---

if [[ $# -ge 1 ]]; then
  NEW_VERSION="$1"

  if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
    echo "Already at version $NEW_VERSION, skipping bump"
  else
    echo "Bumping $CURRENT_VERSION → $NEW_VERSION"

    echo "v${NEW_VERSION}" > "$ROOT/.plugin-version"
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/plugins/bmad/.claude-plugin/plugin.json"
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/.claude-plugin/marketplace.json"

    bun run update-readme

    git add .plugin-version package.json plugins/bmad/.claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
    git commit -m "chore: bump version to $NEW_VERSION"
    git push

    CURRENT_VERSION="$NEW_VERSION"
  fi
else
  echo "Releasing current version: $CURRENT_VERSION"
fi

TAG="v${CURRENT_VERSION}"

# Check tag doesn't already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists" >&2
  exit 1
fi

# --- Step 2: Sync beads ---

if command -v bd >/dev/null 2>&1 && [[ -d "$ROOT/.beads" ]]; then
  echo "Syncing beads..."
  bd sync
  if [[ -n "$(git diff --name-only .beads/)" ]]; then
    git add .beads/
    git commit -m "chore: sync beads before release"
    git push
  fi
fi

# --- Step 3: Create release branch and PR ---

RELEASE_BRANCH="release/$TAG"
echo "Creating release branch: $RELEASE_BRANCH"

git checkout -b "$RELEASE_BRANCH" dev
git push -u origin "$RELEASE_BRANCH"

echo "Creating PR to main..."
PR_URL=$(gh pr create --base main --title "release: $TAG" --body "## Release $TAG

Merge dev into main for release.

Version: $CURRENT_VERSION
Tag: $TAG")

echo "PR created: $PR_URL"
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')

# --- Step 4: Wait for CI ---

echo "Waiting for CI checks..."
if ! gh pr checks "$PR_NUMBER" --watch --interval 10; then
  echo "Error: CI checks failed. Fix issues and re-run." >&2
  echo "PR: $PR_URL" >&2
  git checkout dev
  exit 1
fi

# --- Step 5: Merge PR ---

echo "Merging PR..."
gh pr merge "$PR_NUMBER" --merge

# --- Step 6: Tag and release ---

echo "Tagging main..."
git fetch origin main
git tag "$TAG" origin/main
git push origin "$TAG"

echo "Creating GitHub release..."
gh release create "$TAG" --title "$TAG" --generate-notes

# --- Step 7: Return to dev ---

git checkout dev
git pull

echo "Released $TAG"
echo "PR: $PR_URL"
