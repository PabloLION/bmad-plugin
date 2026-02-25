/**
 * Shared workflow iteration logic used by sync, generate, and validation scripts.
 *
 * Provides a single iterator that handles flat and categorized upstream source
 * layouts, applying skip filters and workaround mappings consistently.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN } from './config.ts';
import type { UpstreamSource } from './upstream-sources.ts';

export interface WorkflowEntry {
  /** Original upstream directory name */
  dirName: string;
  /** Plugin skill name (after workaround mapping) */
  skillName: string;
  /** Full path to the upstream workflow directory */
  upstreamDir: string;
  /** Full path to the plugin skill directory */
  pluginSkillDir: string;
}

/** Check if a directory is a leaf workflow (has workflow.yaml or workflow.md). */
export async function isLeafWorkflow(dir: string): Promise<boolean> {
  if (await exists(join(dir, 'workflow.yaml'))) return true;
  if (await exists(join(dir, 'workflow.md'))) return true;
  return false;
}

/** Get workflow entries for a flat source (workflow dirs directly under contentRoot). */
async function getFlatEntries(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowEntry[]> {
  const entries: WorkflowEntry[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return entries;

  const dirEntries = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const entry of dirEntries) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    if (skipWorkflows.has(entry.name)) continue;

    const skillName = workarounds[entry.name] ?? entry.name;
    entries.push({
      dirName: entry.name,
      skillName,
      upstreamDir: join(workflowsRoot, entry.name),
      pluginSkillDir: join(PLUGIN, 'skills', skillName),
    });
  }
  return entries;
}

/** Get workflow entries for a categorized source (category → workflow structure). */
async function getCategorizedEntries(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowEntry[]> {
  const entries: WorkflowEntry[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return entries;

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
      entries.push({
        dirName: cat.name,
        skillName,
        upstreamDir: catDir,
        pluginSkillDir: join(PLUGIN, 'skills', skillName),
      });
      continue;
    }

    // Category directory — iterate sub-workflows
    const subs = await readdir(catDir, { withFileTypes: true });
    for (const sub of subs) {
      if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
      if (skipWorkflows.has(sub.name)) continue;

      const skillName = workarounds[sub.name] ?? sub.name;
      entries.push({
        dirName: sub.name,
        skillName,
        upstreamDir: join(catDir, sub.name),
        pluginSkillDir: join(PLUGIN, 'skills', skillName),
      });
    }
  }
  return entries;
}

/**
 * Get all workflow entries for a source, handling flat vs categorized layouts.
 *
 * Returns entries for every non-skipped workflow. Consumers should apply
 * additional filters (e.g., pluginOnlySkills, exists checks) as needed.
 */
export async function getWorkflowEntries(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowEntry[]> {
  if (source.flatWorkflows) {
    return getFlatEntries(source, upstreamRoot);
  }
  return getCategorizedEntries(source, upstreamRoot);
}
