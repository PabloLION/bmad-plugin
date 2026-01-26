# Workarounds and Technical Debt

Track temporary fixes that should be removed when upstream issues are resolved.

## Active Workarounds

### 1. Skills in Commands Array (isHidden Bug)

**Issue:**
[anthropics/claude-code#17271](https://github.com/anthropics/claude-code/issues/17271)

**Problem:** Plugin skills have `isHidden: true` hardcoded, ignoring
`user-invocable` frontmatter. Skills don't appear in `/` autocomplete menu even
with `user-invocable: true`.

**Workaround Applied:** Added skill directories to `commands` array in
`.claude-plugin/plugin.json`:

```json
"commands": [
  "./skills/help/",
  "./skills/init/",
  "./skills/status/",
  "./skills/product-brief/",
  "./skills/prd/",
  "./skills/dev-story/"
]
```

**Side Effect:** Commands appear without plugin prefix (`/help` instead of
`/bmad:help`).

**When to Remove:** When issue #17271 is closed and plugin skills respect
`user-invocable: true`.

**Removal Steps:**

1. Remove the `commands` array from `.claude-plugin/plugin.json`
2. Verify skills appear in autocomplete with proper `/bmad:` prefix
3. Test all skills still work
4. Delete this workaround entry

**Date Applied:** 2026-01-26

---

## Monitoring

### Manual Check

```bash
# Check issue status
gh issue view 17271 --repo anthropics/claude-code --json state,title
```

### Subscribe to Issue

Go to [issue #17271](https://github.com/anthropics/claude-code/issues/17271) and
click "Subscribe" to get notifications.

### Periodic Review

Check this document monthly or when updating Claude Code to a new version.

---

## Resolved Workarounds

(Move entries here after removing workarounds)

None yet.
