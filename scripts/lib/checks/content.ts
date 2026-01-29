/**
 * Content consistency check: compare shared files between upstream and plugin.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  PLUGIN,
  PLUGIN_ONLY_DATA,
  SHARED_FILE_TARGETS,
  SKIP_CONTENT_FILES,
  SKIP_DIRS,
  UPSTREAM,
  WORKFLOW_WORKAROUNDS,
} from '../config.ts';
import { listFilesRecursive, normalize } from '../fs-utils.ts';
import { fail, pass, RED, RESET, warn } from '../output.ts';

const DOCUMENT_PROJECT = 'document-project';

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
}

/** Process a single category's sub-workflows into pairs. */
async function processCategorySubWorkflows(
  workflowsRoot: string,
  catName: string,
  pairs: WorkflowSkillPair[],
): Promise<void> {
  const subs = await readdir(join(workflowsRoot, catName), {
    withFileTypes: true,
  });

  for (const sub of subs) {
    if (!sub.isDirectory() || SKIP_DIRS.has(sub.name)) {
      continue;
    }

    const skillName = WORKFLOW_WORKAROUNDS[sub.name] ?? sub.name;
    const skillPath = join(PLUGIN, 'skills', skillName);

    if (await exists(skillPath)) {
      pairs.push({
        upstreamDir: join(workflowsRoot, catName, sub.name),
        pluginDir: skillPath,
        label: `${catName}/${sub.name}`,
      });
    }
  }
}

/** Build map of upstream workflow dir → plugin skill dir for matched pairs. */
async function getWorkflowSkillPairs(): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(UPSTREAM, 'src/bmm/workflows');
  const categories = await readdir(workflowsRoot, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) {
      continue;
    }

    if (cat.name === DOCUMENT_PROJECT) {
      const skillPath = join(PLUGIN, 'skills', DOCUMENT_PROJECT);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name),
          pluginDir: skillPath,
          label: DOCUMENT_PROJECT,
        });
      }
      continue;
    }

    await processCategorySubWorkflows(workflowsRoot, cat.name, pairs);
  }

  return pairs;
}

/** Compare upstream files against plugin files for a single pair. */
async function compareUpstreamFiles(
  upstreamDir: string,
  pluginDir: string,
  label: string,
  upstreamFiles: string[],
  pluginFileSet: Set<string>,
): Promise<{ checked: number; drifted: number }> {
  let checked = 0;
  let drifted = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (SKIP_CONTENT_FILES.has(fileName)) {
      continue;
    }

    if (!pluginFileSet.has(relPath)) {
      fail(`Content: ${label}/${relPath} — file missing in plugin`);
      drifted++;
      continue;
    }

    const upstreamContent = await Bun.file(join(upstreamDir, relPath)).text();
    const pluginContent = await Bun.file(join(pluginDir, relPath)).text();

    if (normalize(upstreamContent) === normalize(pluginContent)) {
      checked++;
    } else {
      fail(`Content drift: ${label}/${relPath}`);
      drifted++;
    }
  }

  return { checked, drifted };
}

/** Check for extra files in plugin that don't exist upstream. */
function checkExtraPluginFiles(
  label: string,
  skillName: string,
  pluginFiles: string[],
  upstreamFiles: string[],
): void {
  for (const relPath of pluginFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (SKIP_CONTENT_FILES.has(fileName)) {
      continue;
    }
    if (upstreamFiles.includes(relPath)) {
      continue;
    }

    const qualifiedPath = `${skillName}/${relPath}`;
    if (PLUGIN_ONLY_DATA.has(qualifiedPath)) {
      pass(`${qualifiedPath} (plugin-only data, expected)`);
      continue;
    }

    const isSharedCopy = Object.values(SHARED_FILE_TARGETS).some(
      (targets) => targets.includes(skillName) && relPath.startsWith('data/'),
    );
    if (isSharedCopy) {
      continue; // validated separately in shared check
    }

    warn(
      `Content: ${label}/${relPath} — extra file in plugin (not in upstream)`,
    );
  }
}

/** Check a single file copy matches upstream content. */
async function checkFileCopy(
  path: string,
  upstreamContent: string,
  label: string,
): Promise<void> {
  if (await exists(path)) {
    const content = await Bun.file(path).text();
    if (normalize(upstreamContent) !== normalize(content)) {
      fail(`Drift: ${label} vs upstream`);
    }
  } else {
    fail(`Missing: ${label}`);
  }
}

/** Validate shared files: _shared/ source → skill data/ copies. */
async function validateSharedFiles(): Promise<void> {
  console.log('\n== Shared File Consistency (_shared/ → skill copies) ==');
  const workflowsRoot = join(UPSTREAM, 'src/bmm/workflows');
  const pluginShared = join(PLUGIN, 'skills/_shared');

  for (const [category, targets] of Object.entries(SHARED_FILE_TARGETS)) {
    const upstreamShared = join(workflowsRoot, category, '_shared');

    if (!(await exists(upstreamShared))) {
      fail(`Upstream _shared/ missing: ${category}/_shared/`);
      continue;
    }

    const sharedFiles = await listFilesRecursive(upstreamShared);

    for (const relPath of sharedFiles) {
      const upstreamContent = await Bun.file(
        join(upstreamShared, relPath),
      ).text();

      await checkFileCopy(
        join(pluginShared, relPath),
        upstreamContent,
        `_shared/${relPath}`,
      );

      for (const skill of targets) {
        await checkFileCopy(
          join(PLUGIN, 'skills', skill, 'data', relPath),
          upstreamContent,
          `${skill}/data/${relPath}`,
        );
      }
    }

    pass(
      `_shared/${category}: upstream ↔ _shared/ ↔ ${targets.length} skill copies`,
    );
  }
}

export async function checkContent(): Promise<void> {
  console.log('\n== Content Consistency (upstream ↔ plugin files) ==');

  const pairs = await getWorkflowSkillPairs();
  let checkedCount = 0;
  let driftCount = 0;

  for (const { upstreamDir, pluginDir, label } of pairs) {
    const upstreamFiles = await listFilesRecursive(upstreamDir);
    const pluginFiles = await listFilesRecursive(pluginDir);
    const pluginFileSet = new Set(pluginFiles);

    const { checked, drifted } = await compareUpstreamFiles(
      upstreamDir,
      pluginDir,
      label,
      upstreamFiles,
      pluginFileSet,
    );
    checkedCount += checked;
    driftCount += drifted;

    const skillName = pluginDir.split('/').at(-1) ?? pluginDir;
    checkExtraPluginFiles(label, skillName, pluginFiles, upstreamFiles);
  }

  if (driftCount === 0) {
    pass(`Content: ${checkedCount} files checked, all match`);
  } else {
    console.log(
      `${RED}  ${driftCount} file(s) drifted out of ${checkedCount + driftCount} checked${RESET}`,
    );
  }

  await validateSharedFiles();
}
