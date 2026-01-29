/**
 * SKILL.md frontmatter name ↔ directory name consistency check.
 *
 * Each skill directory should have a SKILL.md with `name: bmad-<dir-name>`.
 *
 * Why `bmad-` prefix: workaround for anthropics/claude-code#17271.
 * Plugin skills have `isHidden: true` hardcoded, ignoring `user-invocable`
 * frontmatter. To make skills visible in `/` autocomplete, skill directories
 * are listed in plugin.json `commands` array, and each SKILL.md `name` field
 * uses a `bmad-` prefix to avoid conflicts with built-in commands (e.g.,
 * `init`, `status`). See docs/workarounds.md for full details.
 *
 * When #17271 is fixed, the `bmad-` prefix can be removed and this check
 * should be updated to expect `name: <dir-name>` without prefix.
 */

import { exists, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PLUGIN } from "../config.ts";
import { fail, pass } from "../output.ts";

/** Extract `name:` value from YAML frontmatter. */
function extractFrontmatterName(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const nameMatch = match[1]!.match(/^name:\s*(.+)$/m);
  return nameMatch ? nameMatch[1]!.trim() : null;
}

export async function checkNaming(): Promise<void> {
  console.log("\n== SKILL.md Name ↔ Directory Consistency ==");

  const skillsDir = join(PLUGIN, "skills");
  const entries = await readdir(skillsDir, { withFileTypes: true });
  let checked = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;

    const skillMd = join(skillsDir, entry.name, "SKILL.md");
    if (!(await exists(skillMd))) continue;

    const content = await Bun.file(skillMd).text();
    const frontmatterName = extractFrontmatterName(content);
    const expectedName = `bmad-${entry.name}`;

    if (!frontmatterName) {
      fail(`${entry.name}/SKILL.md — missing name in frontmatter`);
    } else if (frontmatterName !== expectedName) {
      fail(
        `${entry.name}/SKILL.md — name "${frontmatterName}" should be "${expectedName}"`,
      );
    } else {
      checked++;
    }
  }

  pass(`${checked} skills checked, all names match directories`);
}
