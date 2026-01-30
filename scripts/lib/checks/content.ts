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
import { getEnabledSources } from '../upstream-sources.ts';

const DOCUMENT_PROJECT = 'document-project';

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
  /** Source this pair belongs to (for config lookups) */
  source: UpstreamSource;
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

/** Get pairs for a categorized source (core pattern). */
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

    if (cat.name === DOCUMENT_PROJECT && !skipWorkflows.has(DOCUMENT_PROJECT)) {
      const skillPath = join(PLUGIN, 'skills', DOCUMENT_PROJECT);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name),
          pluginDir: skillPath,
          label: `[${source.id}] ${DOCUMENT_PROJECT}`,
          source,
        });
      }
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });
    for (const sub of subs) {
      if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
      if (skipWorkflows.has(sub.name)) continue;
      const skillName = workarounds[sub.name] ?? sub.name;
      const skillPath = join(PLUGIN, 'skills', skillName);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name, sub.name),
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
  skipContentFiles: Set<string>,
): Promise<{ checked: number; drifted: number }> {
  let checked = 0;
  let drifted = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (skipContentFiles.has(fileName)) continue;

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
  const skipContentFiles = source.skipContentFiles ?? new Set();
  const pluginOnlyData = source.pluginOnlyData ?? new Set();
  const sharedTargets = source.sharedFileTargets ?? {};

  for (const relPath of pluginFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;
    if (skipContentFiles.has(fileName)) continue;
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
    const skipContentFiles = source.skipContentFiles ?? new Set();
    const upstreamFiles = await listFilesRecursive(upstreamDir);
    const pluginFiles = await listFilesRecursive(pluginDir);
    const pluginFileSet = new Set(pluginFiles);

    const { checked, drifted } = await compareUpstreamFiles(
      upstreamDir,
      pluginDir,
      label,
      upstreamFiles,
      pluginFileSet,
      skipContentFiles,
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
