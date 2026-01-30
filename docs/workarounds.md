# Workarounds and Technical Debt

Track temporary fixes that should be removed when upstream issues are resolved.

## Active Workarounds

### 1. Skills in Commands Array (isHidden Bug)

**Issue:**
[anthropics/claude-code#17271](https://github.com/anthropics/claude-code/issues/17271)

**Problem:** Plugin skills have `isHidden: true` hardcoded, ignoring
`user-invocable` frontmatter. Skills don't appear in `/` autocomplete menu even
with `user-invocable: true`.

**Workaround Applied:** Two changes required:

1. In `plugin.json`, use `skills` as a string path (not array) and add skill
   directories to `commands` array with trailing slashes:

```json
{
  "skills": "./skills/",
  "commands": ["./skills/help/", "./skills/init/", "./skills/prd/"]
}
```

1. In each `SKILL.md` frontmatter, add a `bmad-` prefix to the `name` field:

```yaml
name: bmad-prd
```

**Result:** Skills appear as `/bmad-prd` in autocomplete (~250 tokens overhead).

**Key details:**

- Commands array must use **directory paths** with trailing `/`, not file paths
- File paths (e.g., `./skills/prd/SKILL.md`) do not work
- The `name` prefix prevents conflicts with built-in commands (e.g., `init`,
  `status`)

**When to Remove:** When issue #17271 is closed and plugin skills respect
`user-invocable: true`.

**Removal Steps:**

1. Remove the `commands` array from `plugin.json`
2. Change `skills` back to array format if needed
3. Remove `bmad-` prefix from `name` fields in SKILL.md frontmatter
4. Verify skills appear in autocomplete with proper `/bmad:` prefix
5. Test all skills still work
6. Delete this workaround entry

**Date Applied:** 2026-01-26

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
