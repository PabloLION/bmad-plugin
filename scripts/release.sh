#!/usr/bin/env bash
# Release workflow: bump version on dev, create PR to main, merge, tag, release.
# main is protected — direct push is not allowed, so we use a PR-based flow.
#
# Usage:
#   ./scripts/release.sh                  # release current version (full run)
#   ./scripts/release.sh 6.0.0-Beta.8.0  # bump version first, then release
#   ./scripts/release.sh --after-ci       # finish release after CI passes
#
# The script has two phases:
#   Phase 1 (prepare): bump → beads sync → release branch → PR → wait for CI
#   Phase 2 (finish):  merge PR → tag → GitHub release → return to dev
#
# If CI fails or is slow to register, Phase 1 saves state to .release-state
# and exits. Fix the issue, then run --after-ci to complete Phase 2.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
STATE_FILE="$ROOT/.release-state"

# ── Phase 2: --after-ci ─────────────────────────────────────────────────────

if [[ "${1:-}" == "--after-ci" ]]; then
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "Error: no .release-state file found. Run a full release first." >&2
    exit 1
  fi

  # shellcheck source=/dev/null
  source "$STATE_FILE"

  echo "Resuming release: $RELEASE_TAG (PR #$RELEASE_PR_NUMBER)"

  # Verify CI has passed
  echo "Checking CI status..."
  if ! gh pr checks "$RELEASE_PR_NUMBER" --watch --interval 10; then
    echo "Error: CI checks still failing on PR #$RELEASE_PR_NUMBER" >&2
    exit 1
  fi

  echo "Merging PR #$RELEASE_PR_NUMBER..."
  gh pr merge "$RELEASE_PR_NUMBER" --merge

  echo "Tagging main..."
  git fetch origin main
  git tag "$RELEASE_TAG" origin/main
  git push origin "$RELEASE_TAG"

  echo "Creating GitHub release..."
  gh release create "$RELEASE_TAG" --title "$RELEASE_TAG" --generate-notes

  git checkout dev
  git pull

  rm -f "$STATE_FILE"

  echo "Triggering post-release workflows..."
  gh workflow run sync-upstream.yml 2>/dev/null || echo "⚠ Could not trigger sync-upstream workflow"

  echo ""
  echo "Released $RELEASE_TAG"
  exit 0
fi

# ── Phase 1: prepare ────────────────────────────────────────────────────────

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_VERSION="$(tr -d 'v \n' < "$ROOT/.plugin-version")"

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
PR_URL=$(gh pr create --base main --title "release: $TAG" --body "$(cat <<EOF
## Release $TAG

Merge dev into main for release.

Version: $CURRENT_VERSION
Tag: $TAG
EOF
)")

echo "PR created: $PR_URL"
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')

# --- Step 4: Save state for --after-ci recovery ---

cat > "$STATE_FILE" <<EOF
RELEASE_PR_NUMBER=$PR_NUMBER
RELEASE_TAG=$TAG
RELEASE_VERSION=$CURRENT_VERSION
RELEASE_BRANCH=$RELEASE_BRANCH
EOF

# --- Step 5: Wait for CI (with retry for check registration) ---

echo "Waiting for CI checks to register..."

MAX_RETRIES=4
RETRY_DELAY=15
CI_PASSED=false

for attempt in $(seq 1 $MAX_RETRIES); do
  sleep $RETRY_DELAY
  echo "Checking CI status (attempt $attempt/$MAX_RETRIES)..."

  if gh pr checks "$PR_NUMBER" --watch --interval 10 2>/dev/null; then
    CI_PASSED=true
    break
  fi

  # If checks reported but failed, don't retry
  CHECK_OUTPUT=$(gh pr checks "$PR_NUMBER" 2>&1 || true)
  if echo "$CHECK_OUTPUT" | grep -q "fail"; then
    echo "Error: CI checks failed." >&2
    echo "Fix the issue, push to the release branch, then run:" >&2
    echo "  ./scripts/release.sh --after-ci" >&2
    echo "PR: $PR_URL" >&2
    git checkout dev
    exit 1
  fi

  echo "No checks reported yet, retrying in ${RETRY_DELAY}s..."
done

if [[ "$CI_PASSED" != "true" ]]; then
  echo "CI checks did not appear after $((MAX_RETRIES * RETRY_DELAY))s." >&2
  echo "Check the PR manually, then run:" >&2
  echo "  ./scripts/release.sh --after-ci" >&2
  echo "PR: $PR_URL" >&2
  git checkout dev
  exit 1
fi

# ── Phase 2: finish (inline — CI passed) ────────────────────────────────────

echo "CI passed. Finishing release..."

echo "Merging PR #$PR_NUMBER..."
gh pr merge "$PR_NUMBER" --merge

echo "Tagging main..."
git fetch origin main
git tag "$TAG" origin/main
git push origin "$TAG"

echo "Creating GitHub release..."
gh release create "$TAG" --title "$TAG" --generate-notes

git checkout dev
git pull

rm -f "$STATE_FILE"

echo "Triggering post-release workflows..."
gh workflow run sync-upstream.yml 2>/dev/null || echo "⚠ Could not trigger sync-upstream workflow"

echo ""
echo "Released $TAG"
echo "PR: $PR_URL"
