#!/usr/bin/env bash
# Bump plugin version, commit, tag, and create a GitHub release.
# Usage: ./scripts/bump-version.sh <new-version>
# Example: ./scripts/bump-version.sh 6.0.0-Beta.4.1

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <new-version>" >&2
  exit 1
fi

NEW_VERSION="$1"
TAG="v${NEW_VERSION}"
ROOT="$(git rev-parse --show-toplevel)"
OLD_VERSION="$(cat "$ROOT/.plugin-version" | tr -d 'v \n')"

if [[ "$OLD_VERSION" == "$NEW_VERSION" ]]; then
  echo "Already at version $NEW_VERSION" >&2
  exit 0
fi

echo "Bumping $OLD_VERSION → $NEW_VERSION"

# 1. Update version in all files
echo "v${NEW_VERSION}" > "$ROOT/.plugin-version"
sed -i '' "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
sed -i '' "s/\"version\": \"$OLD_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/plugins/bmad/.claude-plugin/plugin.json"
sed -i '' "s/$OLD_VERSION/$NEW_VERSION/g" "$ROOT/README.md"

echo "Updated files:"
git diff --name-only

# 2. Commit and tag
git add .plugin-version package.json plugins/bmad/.claude-plugin/plugin.json README.md
git commit -m "chore: bump version to $NEW_VERSION"
git tag "$TAG"

# 3. Push and create GitHub release
git push && git push origin "$TAG"
gh release create "$TAG" --title "$TAG" --generate-notes

echo "Released $TAG"
