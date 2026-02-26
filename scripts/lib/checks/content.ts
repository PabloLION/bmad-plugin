/**
 * Content consistency check: compare shared files between upstream sources
 * and plugin, across all enabled sources.
 */

import { exists } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, ROOT } from '../config.ts';
import { listFilesRecursive, normalize } from '../fs-utils.ts';
import { fail, pass, RED, RESET, section, warn } from '../output.ts';
import {
  buildWorkflowMap,
  isTextFile,
  rewriteFileContent,
  type WorkflowMap,
} from '../path-rewriter.ts';
import type { UpstreamSource } from '../upstream-sources.ts';
import {
  getEnabledSources,
  shouldSkipContentFile,
} from '../upstream-sources.ts';
import { getWorkflowEntries } from '../workflow-iterator.ts';

interface ContentPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
  source: UpstreamSource;
}

/** Get all workflow→skill pairs across all enabled sources (only existing plugin dirs). */
async function getAllPairs(): Promise<ContentPair[]> {
  const pairs: ContentPair[] = [];
  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const entries = await getWorkflowEntries(source, upstreamRoot);

    for (const entry of entries) {
      // Content check only compares existing plugin dirs
      if (await exists(entry.pluginSkillDir)) {
        pairs.push({
          upstreamDir: entry.upstreamDir,
          pluginDir: entry.pluginSkillDir,
          label: `[${source.id}] ${entry.skillName}`,
          source,
        });
      }
    }
  }
  return pairs;
}

/** Apply path rewrites to upstream content for comparison. */
function applyRewrites(
  content: string,
  filePath: string,
  map: WorkflowMap,
): string {
  if (!isTextFile(filePath)) return content;
  return rewriteFileContent(content, map).content;
}

/** Compare upstream files against plugin files for a single pair. */
async function compareUpstreamFiles(
  upstreamDir: string,
  pluginDir: string,
  label: string,
  upstreamFiles: string[],
  pluginFileSet: Set<string>,
  source: UpstreamSource,
  map: WorkflowMap,
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

    const upstreamRaw = await Bun.file(join(upstreamDir, relPath)).text();
    const upstreamContent = applyRewrites(upstreamRaw, relPath, map);
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

/** Check a single file copy matches upstream content (with rewrites applied). */
async function checkFileCopy(
  path: string,
  upstreamContent: string,
  label: string,
  map: WorkflowMap,
): Promise<void> {
  if (await exists(path)) {
    const rewritten = applyRewrites(upstreamContent, path, map);
    const content = await Bun.file(path).text();
    if (normalize(rewritten) !== normalize(content)) {
      fail(`Drift: ${label} vs upstream`);
    }
  } else {
    fail(`Missing: ${label}`);
  }
}

/** Validate shared files for all sources that define shared targets. */
async function validateSharedFiles(map: WorkflowMap): Promise<void> {
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
          map,
        );

        for (const skill of targets) {
          await checkFileCopy(
            join(PLUGIN, 'skills', skill, 'data', relPath),
            upstreamContent,
            `${skill}/data/${relPath}`,
            map,
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

  const map = await buildWorkflowMap();
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
      map,
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

  await validateSharedFiles(map);
}
