/**
 * Content consistency check: compare shared files between upstream and plugin.
 */

import { readdir, exists } from "node:fs/promises";
import { join } from "node:path";
import {
  UPSTREAM,
  PLUGIN,
  WORKFLOW_WORKAROUNDS,
  SKIP_DIRS,
  SKIP_CONTENT_FILES,
} from "../config.ts";
import { pass, fail, warn, RED, RESET } from "../output.ts";
import { normalize, listFilesRecursive } from "../fs-utils.ts";

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
}

/** Build map of upstream workflow dir → plugin skill dir for matched pairs. */
async function getWorkflowSkillPairs(): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");
  const categories = await readdir(workflowsRoot, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    if (cat.name === "document-project") {
      const skillPath = join(PLUGIN, "skills", "document-project");
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name),
          pluginDir: skillPath,
          label: "document-project",
        });
      }
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });

    for (const sub of subs) {
      if (!sub.isDirectory()) continue;
      if (SKIP_DIRS.has(sub.name)) continue;

      const skillName = WORKFLOW_WORKAROUNDS[sub.name] ?? sub.name;
      const skillPath = join(PLUGIN, "skills", skillName);

      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name, sub.name),
          pluginDir: skillPath,
          label: `${cat.name}/${sub.name}`,
        });
      }
    }
  }

  return pairs;
}

export async function checkContent(): Promise<void> {
  console.log("\n== Content Consistency (upstream ↔ plugin files) ==");

  const pairs = await getWorkflowSkillPairs();
  let checkedCount = 0;
  let driftCount = 0;

  for (const { upstreamDir, pluginDir, label } of pairs) {
    const upstreamFiles = await listFilesRecursive(upstreamDir);
    const pluginFiles = await listFilesRecursive(pluginDir);
    const pluginFileSet = new Set(pluginFiles);

    // Compare files that exist in upstream (skip structurally different ones)
    for (const relPath of upstreamFiles) {
      const fileName = relPath.split("/").pop()!;
      if (SKIP_CONTENT_FILES.has(fileName)) continue;

      if (!pluginFileSet.has(relPath)) {
        fail(`Content: ${label}/${relPath} — file missing in plugin`);
        driftCount++;
        continue;
      }

      const upstreamContent = await Bun.file(
        join(upstreamDir, relPath),
      ).text();
      const pluginContent = await Bun.file(join(pluginDir, relPath)).text();

      if (normalize(upstreamContent) === normalize(pluginContent)) {
        checkedCount++;
      } else {
        fail(`Content drift: ${label}/${relPath}`);
        driftCount++;
      }
    }

    // Check for extra files in plugin that don't exist upstream
    for (const relPath of pluginFiles) {
      const fileName = relPath.split("/").pop()!;
      if (SKIP_CONTENT_FILES.has(fileName)) continue;
      if (!upstreamFiles.includes(relPath)) {
        warn(
          `Content: ${label}/${relPath} — extra file in plugin (not in upstream)`,
        );
      }
    }
  }

  if (driftCount === 0) {
    pass(`Content: ${checkedCount} files checked, all match`);
  } else {
    console.log(
      `${RED}  ${driftCount} file(s) drifted out of ${checkedCount + driftCount} checked${RESET}`,
    );
  }
}
