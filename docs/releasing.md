# Release Process

`main` is protected — direct push is not allowed — so releasing goes through a
PR from `dev` to `main`. [`scripts/release.sh`](../scripts/release.sh) drives
it in two phases so a slow or failing CI run does not lose the work already
done.

## Usage

```sh
./scripts/release.sh                # release the current .plugin-version
./scripts/release.sh 6.11.0.1       # bump to this version first, then release
./scripts/release.sh --after-ci     # finish a release whose Phase 1 stopped
```

## Pre-release Checklist

The script's own preconditions, in the order it checks them:

- [ ] **On the `dev` branch.** Any other branch is a hard error. (Not `main`.)
- [ ] **Working tree clean, excluding `.beads/`** — both unstaged and staged.
      `.beads/` is exempt because the script syncs and commits it itself.
- [ ] **The tag `v<version>` does not already exist.**

Worth doing before you start, because the release PR's CI runs exactly these:

- [ ] `bun run typecheck && bun run lint`
- [ ] `bun run validate && bun run test:unit`

## Phase 1 — prepare

1. **Bump (only when a version argument is given).** Rewrites
   `.plugin-version`, `package.json`,
   `plugins/bmad/.claude-plugin/plugin.json` and
   `.claude-plugin/marketplace.json`; runs `bun run update-readme`; commits
   `chore: bump version to <version>` and pushes to `dev`. Passing the version
   already in `.plugin-version` skips the bump. **See the known limitation
   below — this step does not work on GNU sed.**
2. **Sync beads.** If `bd` is on `PATH` and `.beads/` exists, runs `bd sync`
   and commits `chore: sync beads before release` when it produced changes.
3. **Release branch and PR.** Creates `release/v<version>` from `dev`, pushes
   it, and opens a PR against `main` titled `release: v<version>`.
4. **Save recovery state.** Writes `.release-state` (gitignored) with
   `RELEASE_PR_NUMBER`, `RELEASE_TAG`, `RELEASE_VERSION`, `RELEASE_BRANCH`.
5. **Wait for CI.** Polls `gh pr checks --watch` up to 4 times with a 15s
   delay. If checks report a failure it stops immediately, returns to `dev`,
   and tells you to run `--after-ci` once fixed. If checks never register
   within 60s it does the same rather than merging blind.

If CI passes inside Phase 1 the script continues straight into Phase 2 in the
same run.

## Phase 2 — finish (`--after-ci`)

Reads `.release-state` (and errors if it is absent), re-verifies CI with
`gh pr checks --watch`, then:

1. Merges the release PR (`gh pr merge --merge`).
2. Tags `origin/main` with `v<version>` and pushes the tag.
3. Creates the GitHub release with `--generate-notes`.
4. Returns to `dev` and pulls.
5. Removes `.release-state`.
6. Triggers `sync-upstream.yml` so the release watcher re-checks every
   upstream against the freshly pinned versions.

Fixes for a failing release PR go on the `release/v<version>` branch; then
re-run `./scripts/release.sh --after-ci`.

## Known limitation: the bump step is BSD-sed only

`scripts/release.sh` lines **95, 96 and 97** use the BSD form of in-place
editing:

```sh
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
```

BSD/macOS `sed` requires an explicit (possibly empty) backup suffix as a
separate argument. GNU `sed` (Linux) takes the suffix only when attached
(`-i.bak`), so it reads `''` as the script and the real `s/…/…/` expression as
a **filename**. Verified against GNU sed 4.9:

```
sed: can't read s/"version": "6.11.0.0"/"version": "6.11.0.1"/: No such file or directory
exit 2
```

The script runs under `set -euo pipefail`, so it aborts at line 95 — *after*
line 94 has already rewritten `.plugin-version`. The result is a partial bump:
`.plugin-version` moved, the three JSON files did not, nothing was committed,
and the working tree is now dirty, which also trips the clean-tree
precondition on the next attempt.

The script is not fixed here (this is a documentation change). Until it is,
release from Linux **without** the version argument:

1. Set the version yourself — `bun run sync` writes all four anchors from the
   core release it installs, or edit the four files by hand and run
   `bun run update-readme`.
2. Commit and push to `dev`.
3. `./scripts/release.sh` with no argument, which skips step 1 entirely.

Everything after the bump (beads sync, branch, PR, CI wait, merge, tag,
release) is portable.

## Version Format

`<upstream-version>.X` (e.g. `6.11.0.0`). The sibling `bmad-manticore` plugin
is on its own version line and is not touched by a plugin bump — see
[versioning.md](versioning.md) for both rules and what `bun run validate`
enforces.

## Post-release Verification

- [ ] Release appears on
      [GitHub releases](https://github.com/tgorka/bmad-plugin/releases)
- [ ] Tag exists: `git tag -l | grep <version>`
- [ ] `.release-state` is gone (its presence means Phase 2 never completed)
- [ ] `dev` is checked out and up to date with `main`'s merge
