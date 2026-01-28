/**
 * Workflow → Skill coverage check.
 */

import { readdir, exists } from "node:fs/promises";
import { join } from "node:path";
import {
  UPSTREAM,
  PLUGIN,
  WORKFLOW_WORKAROUNDS,
  PLUGIN_ONLY_SKILLS,
  SKIP_DIRS,
} from "../config.ts";
import { pass, fail, warn } from "../output.ts";

/** Returns set of skill names that were matched to upstream workflows. */
export async function checkWorkflows(): Promise<Set<string>> {
  console.log("\n== Workflow → Skill Coverage (upstream → plugin) ==");

  const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");
  const categories = await readdir(workflowsRoot, { withFileTypes: true });
  const coveredSkills = new Set<string>();

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    // document-project is a leaf workflow (files + subdirs, not sub-workflows)
    if (cat.name === "document-project") {
      const skillPath = join(PLUGIN, "skills", "document-project");
      if (await exists(skillPath)) {
        pass("Workflow: document-project");
        coveredSkills.add("document-project");
      } else {
        fail("Skill missing: document-project");
      }
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });

    for (const sub of subs) {
      if (!sub.isDirectory()) continue;
      if (SKIP_DIRS.has(sub.name)) continue;

      const workaround = WORKFLOW_WORKAROUNDS[sub.name];
      const skillName = workaround ?? sub.name;
      const skillPath = join(PLUGIN, "skills", skillName);

      if (await exists(skillPath)) {
        if (workaround) {
          warn(
            `Workflow: ${cat.name}/${sub.name} → ${workaround} (workaround — should rename to ${sub.name})`,
          );
        } else {
          pass(`Workflow: ${cat.name}/${sub.name} → skill: ${skillName}`);
        }
        coveredSkills.add(skillName);
      } else {
        fail(
          `Skill missing: ${skillName} (from workflow ${cat.name}/${sub.name})`,
        );
      }
    }
  }

  // Check for plugin skills with no upstream counterpart
  console.log("\n== Plugin-Only Skills ==");
  const pluginSkills = await readdir(join(PLUGIN, "skills"), {
    withFileTypes: true,
  });

  for (const entry of pluginSkills) {
    if (!entry.isDirectory()) continue;
    if (coveredSkills.has(entry.name)) continue;

    if (PLUGIN_ONLY_SKILLS.has(entry.name)) {
      pass(
        `Plugin-only skill: ${entry.name} (no upstream counterpart — expected)`,
      );
    } else {
      warn(
        `Plugin-only skill: ${entry.name} (no upstream counterpart — investigate)`,
      );
    }
  }

  return coveredSkills;
}
