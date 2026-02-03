# Workarounds and Technical Debt

Track temporary fixes that should be removed when upstream issues are resolved.

## Active Workarounds

None currently.

### Tested Alternative: Remove `name` Field (does NOT work)

**Date Tested:** 2026-01-30

A simpler workaround was
[suggested](https://github.com/anthropics/claude-code/issues/17271#issuecomment-3823235496)
upstream: remove the `name` field from SKILL.md frontmatter entirely instead of
using the `commands` array.

**Result:** Does not work on macOS CLI with `--plugin-dir`. Skills load and can
be invoked directly, but do **not** appear in `/` autocomplete. The `commands`
array + `name` prefix approach remains the only working workaround.

---

## Monitoring

### Periodic Review

Check this document monthly or when updating Claude Code to a new version.

---

## Resolved Workarounds

### 1. Skills in Commands Array (isHidden Bug)

**Issue:**
[anthropics/claude-code#17271](https://github.com/anthropics/claude-code/issues/17271)

**Problem:** Plugin skills had `isHidden: true` hardcoded, ignoring
`user-invocable` frontmatter. Skills didn't appear in `/` autocomplete menu.

**Workaround Applied (2026-01-26):**

1. Added skill directories to `commands` array in `plugin.json`
2. Prefixed `name` field in SKILL.md frontmatter with `bmad-`

**Resolution (2026-02-03):**

Fixed in Claude Code v2.1.29. Removed all workarounds:

1. Removed `name: bmad-*` from all 34 SKILL.md frontmatters
2. Removed `commands` array from `plugin.json`

Skills now appear in `/bmad:` autocomplete natively with proper namespace format.

**Verification:** Tested on macOS with `--plugin-dir`. All skills appear in
autocomplete without any workaround.
