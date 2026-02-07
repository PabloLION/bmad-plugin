/**
 * Content consistency check: compare shared files between upstream sources
 * and plugin, across all enabled sources.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, ROOT } from '../config.ts';
import { listFilesRecursive, normalize } from '../fs-utils.ts';
import { fail, pass, RED, RESET, section, warn } from '../output.ts';
import type { UpstreamSource } from '../upstream-sources.ts';
import {
  getEnabledSources,
  shouldSkipContentFile,
} from '../upstream-sources.ts';

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
  /** Source this pair belongs to (for config lookups) */
  source: UpstreamSource;
}

/** Check if a directory is a leaf workflow (has workflow.yaml or workflow.md). */
async function isLeafWorkflow(dir: string): Promise<boolean> {
  if (await exists(join(dir, 'workflow.yaml'))) return true;
  if (await exists(join(dir, 'workflow.md'))) return true;
  return false;
}

/** Get pairs for a flat source. */
async function getFlatPairs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return pairs;

  const entries = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const entry of entries) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    if (skipWorkflows.has(entry.name)) continue;
    const skillName = workarounds[entry.name] ?? entry.name;
    const skillPath = join(PLUGIN, 'skills', skillName);
    if (await exists(skillPath)) {
      pairs.push({
        upstreamDir: join(workflowsRoot, entry.name),
        pluginDir: skillPath,
        label: `[${source.id}] ${skillName}`,
        source,
      });
    }
  }
  return pairs;
}

/** Get pairs for a categorized source (category → workflow structure). */
async function getCategorizedPairs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return pairs;

  const categories = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    const catDir = join(workflowsRoot, cat.name);

    // Leaf workflow at top level (has workflow.yaml or workflow.md)
    if (await isLeafWorkflow(catDir)) {
      if (skipWorkflows.has(cat.name)) continue;
      const skillName = workarounds[cat.name] ?? cat.name;
      const skillPath = join(PLUGIN, 'skills', skillName);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: catDir,
          pluginDir: skillPath,
          label: `[${source.id}] ${skillName}`,
          source,
        });
      }
      continue;
    }

    // Category directory — iterate sub-workflows
    const subs = await readdir(catDir, { withFileTypes: true });
    for (const sub of subs) {
      if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
      if (skipWorkflows.has(sub.name)) continue;
      const skillName = workarounds[sub.name] ?? sub.name;
      const skillPath = join(PLUGIN, 'skills', skillName);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(catDir, sub.name),
          pluginDir: skillPath,
          label: `[${source.id}] ${cat.name}/${sub.name}`,
          source,
        });
      }
    }
  }
  return pairs;
}

/** Get all workflow→skill pairs across all enabled sources. */
async function getAllPairs(): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const sourcePairs = source.flatWorkflows
      ? await getFlatPairs(source, upstreamRoot)
      : await getCategorizedPairs(source, upstreamRoot);
    pairs.push(...sourcePairs);
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
  source: UpstreamSource,
): Promise<{ checked: number; drifted: number }> {
  let checked = 0;
  let drifted = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (shouldSkipContentFile(source, fileName)) continue;

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
  source: UpstreamSource,
): void {
  const pluginOnlyData = source.pluginOnlyData ?? new Set();
  const sharedTargets = source.sharedFileTargets ?? {};

  for (const relPath of pluginFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (shouldSkipContentFile(source, fileName)) continue;
    if (upstreamFiles.includes(relPath)) continue;

    const qualifiedPath = `${skillName}/${relPath}`;
    if (pluginOnlyData.has(qualifiedPath)) {
      pass(`${qualifiedPath} (plugin-only data, expected)`);
      continue;
    }

    const isSharedCopy = Object.values(sharedTargets).some(
      (targets) => targets.includes(skillName) && relPath.startsWith('data/'),
    );
    if (isSharedCopy) continue;

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

/** Validate shared files for all sources that define shared targets. */
async function validateSharedFiles(): Promise<void> {
  section('Shared File Consistency (_shared/ → skill copies)');
  const pluginShared = join(PLUGIN, '_shared');

  for (const source of getEnabledSources()) {
    const sharedTargets = source.sharedFileTargets ?? {};
    if (Object.keys(sharedTargets).length === 0) continue;

    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const workflowsRoot = join(upstreamRoot, source.contentRoot);

    for (const [category, targets] of Object.entries(sharedTargets)) {
      const upstreamShared = join(workflowsRoot, category, '_shared');

      if (!(await exists(upstreamShared))) {
        fail(`[${source.id}] Upstream _shared/ missing: ${category}/_shared/`);
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
        `[${source.id}] _shared/${category}: upstream ↔ _shared/ ↔ ${targets.length} skill copies`,
      );
    }
  }
}

export async function checkContent(): Promise<void> {
  section('Content Consistency (upstream ↔ plugin files)');

  const pairs = await getAllPairs();
  let checkedCount = 0;
  let driftCount = 0;

  for (const { upstreamDir, pluginDir, label, source } of pairs) {
    const upstreamFiles = await listFilesRecursive(upstreamDir);
    const pluginFiles = await listFilesRecursive(pluginDir);
    const pluginFileSet = new Set(pluginFiles);

    const { checked, drifted } = await compareUpstreamFiles(
      upstreamDir,
      pluginDir,
      label,
      upstreamFiles,
      pluginFileSet,
      source,
    );
    checkedCount += checked;
    driftCount += drifted;

    const skillName = pluginDir.split('/').at(-1) ?? pluginDir;
    checkExtraPluginFiles(label, skillName, pluginFiles, upstreamFiles, source);
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
