/**
 * Content consistency check: compare shared files between upstream and plugin.
 */

import { exists, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  PLUGIN,
  PLUGIN_ONLY_DATA,
  SHARED_FILE_TARGETS,
  SKIP_CONTENT_FILES,
  SKIP_DIRS,
  UPSTREAM,
  WORKFLOW_WORKAROUNDS,
} from "../config.ts";
import { listFilesRecursive, normalize } from "../fs-utils.ts";
import { fail, pass, RED, RESET, warn } from "../output.ts";

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

      const upstreamContent = await Bun.file(join(upstreamDir, relPath)).text();
      const pluginContent = await Bun.file(join(pluginDir, relPath)).text();

      if (normalize(upstreamContent) === normalize(pluginContent)) {
        checkedCount++;
      } else {
        fail(`Content drift: ${label}/${relPath}`);
        driftCount++;
      }
    }

    // Check for extra files in plugin that don't exist upstream
    const skillName = pluginDir.split("/").pop()!;
    for (const relPath of pluginFiles) {
      const fileName = relPath.split("/").pop()!;
      if (SKIP_CONTENT_FILES.has(fileName)) continue;
      if (upstreamFiles.includes(relPath)) continue;

      // Check if this is a known plugin-only data file
      const qualifiedPath = `${skillName}/${relPath}`;
      if (PLUGIN_ONLY_DATA.has(qualifiedPath)) {
        pass(`${qualifiedPath} (plugin-only data, expected)`);
        continue;
      }

      // Check if this is a shared-distributed file (copied from _shared/)
      const isSharedCopy = Object.values(SHARED_FILE_TARGETS).some(
        (targets) => targets.includes(skillName) && relPath.startsWith("data/"),
      );
      if (isSharedCopy) continue; // validated separately in shared check

      warn(
        `Content: ${label}/${relPath} — extra file in plugin (not in upstream)`,
      );
    }
  }

  if (driftCount === 0) {
    pass(`Content: ${checkedCount} files checked, all match`);
  } else {
    console.log(
      `${RED}  ${driftCount} file(s) drifted out of ${checkedCount + driftCount} checked${RESET}`,
    );
  }

  // Validate shared files: _shared/ source → skill data/ copies
  console.log("\n== Shared File Consistency (_shared/ → skill copies) ==");
  const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");

  for (const [category, targets] of Object.entries(SHARED_FILE_TARGETS)) {
    const upstreamShared = join(workflowsRoot, category, "_shared");
    const pluginShared = join(PLUGIN, "skills/_shared");

    if (!(await exists(upstreamShared))) {
      fail(`Upstream _shared/ missing: ${category}/_shared/`);
      continue;
    }

    const sharedFiles = await listFilesRecursive(upstreamShared);

    for (const relPath of sharedFiles) {
      const upstreamContent = await Bun.file(
        join(upstreamShared, relPath),
      ).text();

      // Check plugin _shared/ copy
      const sharedPath = join(pluginShared, relPath);
      if (!(await exists(sharedPath))) {
        fail(`Missing: _shared/${relPath}`);
      } else {
        const sharedContent = await Bun.file(sharedPath).text();
        if (normalize(upstreamContent) !== normalize(sharedContent)) {
          fail(`Drift: _shared/${relPath} vs upstream`);
        }
      }

      // Check each skill's data/ copy
      for (const skill of targets) {
        const skillCopy = join(PLUGIN, "skills", skill, "data", relPath);
        if (!(await exists(skillCopy))) {
          fail(`Missing: ${skill}/data/${relPath}`);
        } else {
          const copyContent = await Bun.file(skillCopy).text();
          if (normalize(upstreamContent) !== normalize(copyContent)) {
            fail(`Drift: ${skill}/data/${relPath} vs upstream`);
          }
        }
      }
    }

    pass(
      `_shared/${category}: upstream ↔ _shared/ ↔ ${targets.length} skill copies`,
    );
  }
}
