/**
 * Syncs supporting files from upstream BMAD-METHOD to plugin skills.
 *
 * Copies: step files, instructions, templates, checklists
 * Skips: workflow.md, workflow.yaml (plugin uses SKILL.md instead)
 *
 * Run: bun scripts/sync-upstream-content.ts
 */

import { readdir, exists, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  ROOT,
  UPSTREAM,
  PLUGIN,
  WORKFLOW_WORKAROUNDS,
  SKIP_DIRS,
  SKIP_CONTENT_FILES,
  SHARED_FILE_TARGETS,
} from "./lib/config.ts";

const DRY_RUN = process.argv.includes("--dry-run");

async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(join(dir, entry.name));
      results.push(...subFiles.map((f) => `${entry.name}/${f}`));
    } else {
      results.push(entry.name);
    }
  }
  return results;
}

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
}

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
          label: skillName,
        });
      }
    }
  }

  return pairs;
}

async function syncPair(pair: WorkflowSkillPair): Promise<number> {
  const upstreamFiles = await listFilesRecursive(pair.upstreamDir);
  let count = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split("/").pop()!;

    // Skip workflow definition files (plugin uses SKILL.md instead)
    if (SKIP_CONTENT_FILES.has(fileName)) continue;

    const srcPath = join(pair.upstreamDir, relPath);
    const destPath = join(pair.pluginDir, relPath);

    if (DRY_RUN) {
      console.log(`  [dry-run] ${relPath}`);
    } else {
      // Ensure parent directory exists
      const destDir = dirname(destPath);
      await Bun.$`mkdir -p ${destDir}`.quiet();

      // Copy file
      await cp(srcPath, destPath, { force: true });
    }
    count++;
  }

  return count;
}

console.log(DRY_RUN ? "Dry run — no files will be copied\n" : "Syncing...\n");

const pairs = await getWorkflowSkillPairs();
let totalFiles = 0;

for (const pair of pairs) {
  console.log(`Syncing: ${pair.label}`);
  const count = await syncPair(pair);
  totalFiles += count;
  if (!DRY_RUN) {
    console.log(`  ✓ ${count} files copied`);
  }
}

console.log(`\nTotal: ${totalFiles} files ${DRY_RUN ? "would be" : ""} synced.`);

// Sync _shared/ directories and distribute to target skills
const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");
let sharedCount = 0;

for (const [category, targetSkills] of Object.entries(SHARED_FILE_TARGETS)) {
  const sharedDir = join(workflowsRoot, category, "_shared");
  if (!(await exists(sharedDir))) continue;

  const sharedFiles = await listFilesRecursive(sharedDir);
  const pluginSharedDir = join(PLUGIN, "skills/_shared");

  for (const relPath of sharedFiles) {
    const srcPath = join(sharedDir, relPath);

    // Copy to plugin _shared/ (source of truth)
    const sharedDest = join(pluginSharedDir, relPath);
    if (DRY_RUN) {
      console.log(`  [dry-run] _shared/${relPath}`);
    } else {
      await Bun.$`mkdir -p ${dirname(sharedDest)}`.quiet();
      await cp(srcPath, sharedDest, { force: true });
    }
    sharedCount++;

    // Distribute to each target skill's data/
    for (const skill of targetSkills) {
      const skillDest = join(PLUGIN, "skills", skill, "data", relPath);
      if (DRY_RUN) {
        console.log(`  [dry-run] ${skill}/data/${relPath}`);
      } else {
        await Bun.$`mkdir -p ${dirname(skillDest)}`.quiet();
        await cp(srcPath, skillDest, { force: true });
      }
      sharedCount++;
    }
  }

  console.log(
    `Shared: ${category}/_shared/ → _shared/ + ${targetSkills.length} skills`,
  );
}

if (sharedCount > 0) {
  console.log(`Shared files: ${sharedCount} copies synced.`);
}

// Update version file
if (!DRY_RUN) {
  const pkgJson = await Bun.file(join(UPSTREAM, "package.json")).json();
  const newVersion = `v${pkgJson.version}`;
  await Bun.write(join(ROOT, ".upstream-version"), newVersion + "\n");
  console.log(`\nUpdated .upstream-version to ${newVersion}`);

  // Update README badge
  await Bun.$`bun scripts/update-readme-version.ts`.quiet();
  console.log("Updated README version badge");
}
