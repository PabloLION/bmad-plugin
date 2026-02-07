/**
 * Three-set skill coverage check across all upstream sources:
 * - Upstream workflow names (from all enabled sources)
 * - Plugin skill directories
 * - Plugin.json manifest commands
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, PLUGIN_JSON_PATH, ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import type { UpstreamSource } from '../upstream-sources.ts';
import { getEnabledSources } from '../upstream-sources.ts';

export interface SkillSets {
  upstream: Set<string>;
  directories: Set<string>;
  manifest: Set<string>;
}

const DOCUMENT_PROJECT = 'document-project';

/** Collect workflow names from a flat source. */
async function getFlatWorkflowNames(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<string[]> {
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return [];

  const entries = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  return entries
    .filter(
      (e) =>
        e.isDirectory() && !skipDirs.has(e.name) && !skipWorkflows.has(e.name),
    )
    .map((e) => workarounds[e.name] ?? e.name);
}

/** Collect workflow names from a categorized source (core pattern). */
async function getCategorizedWorkflowNames(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<string[]> {
  const names: string[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return [];

  const categories = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    if (cat.name === DOCUMENT_PROJECT) {
      if (!skipWorkflows.has(DOCUMENT_PROJECT)) names.push(DOCUMENT_PROJECT);
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });
    for (const sub of subs) {
      if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
      if (skipWorkflows.has(sub.name)) continue;
      names.push(workarounds[sub.name] ?? sub.name);
    }
  }

  return names;
}

/** Collect upstream workflow names from all enabled sources. */
async function getUpstreamWorkflows(): Promise<Set<string>> {
  const names = new Set<string>();

  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const sourceNames = source.flatWorkflows
      ? await getFlatWorkflowNames(source, upstreamRoot)
      : await getCategorizedWorkflowNames(source, upstreamRoot);

    for (const name of sourceNames) {
      names.add(name);
    }
  }

  return names;
}

/** Collect all plugin-only skills across all sources. */
function getAllPluginOnlySkills(): Set<string> {
  const all = new Set<string>();
  for (const source of getEnabledSources()) {
    for (const skill of source.pluginOnlySkills ?? []) {
      all.add(skill);
    }
  }
  return all;
}

/** Collect all workflow workarounds across all sources. */
function getAllWorkarounds(): Record<string, string> {
  const all: Record<string, string> = {};
  for (const source of getEnabledSources()) {
    Object.assign(all, source.workflowWorkarounds ?? {});
  }
  return all;
}

/** Collect plugin skill directory names. */
async function getPluginDirectories(): Promise<Set<string>> {
  const entries = await readdir(join(PLUGIN, 'skills'), {
    withFileTypes: true,
  });
  return new Set(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
      .map((e) => e.name),
  );
}

/** Collect plugin.json manifest command names.
 * Supports both explicit "commands" array and "skills" auto-discovery. */
async function getManifestCommands(): Promise<Set<string>> {
  const pluginJson = await Bun.file(PLUGIN_JSON_PATH).json();

  // Explicit commands array (legacy format)
  if (Array.isArray(pluginJson.commands)) {
    return new Set(
      (pluginJson.commands as string[]).map((c: string) =>
        c.replace('./skills/', '').replace(/\/$/, ''),
      ),
    );
  }

  // Auto-discovery via "skills" path — all skill dirs are commands
  if (pluginJson.skills) {
    return getPluginDirectories();
  }

  return new Set<string>();
}

/** Sort a set's values alphabetically. */
function sorted(set: Set<string>): string[] {
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Check upstream workflows have corresponding plugin directories. */
function checkUpstreamToDirs(
  upstream: Set<string>,
  directories: Set<string>,
  workarounds: Record<string, string>,
): void {
  section('Skills: Upstream → Plugin Directories');
  for (const name of sorted(upstream)) {
    const pluginName = workarounds[name] ?? name;
    if (pluginName === name && directories.has(pluginName)) {
      pass(name);
    } else if (directories.has(pluginName)) {
      warn(`${name} → ${pluginName} (workaround — rename dir to ${name})`);
    } else {
      fail(`Missing directory: skills/${pluginName} (upstream: ${name})`);
    }
  }
}

/** Check upstream workflows are listed in plugin.json manifest. */
function checkUpstreamToManifest(
  upstream: Set<string>,
  manifest: Set<string>,
  workarounds: Record<string, string>,
): void {
  section('Skills: Upstream → Manifest');
  for (const name of sorted(upstream)) {
    const pluginName = workarounds[name] ?? name;
    if (manifest.has(pluginName)) {
      pass(`${pluginName} in plugin.json`);
    } else {
      fail(`Missing in plugin.json: ${pluginName} (upstream: ${name})`);
    }
  }
}

/** Bidirectional check between directories and manifest. */
function checkDirsManifestAlignment(
  directories: Set<string>,
  manifest: Set<string>,
): void {
  section('Skills: Directories ↔ Manifest');
  for (const dir of sorted(directories)) {
    if (!manifest.has(dir)) {
      fail(`Directory "${dir}" not in plugin.json commands`);
    }
  }
  for (const cmd of sorted(manifest)) {
    if (!directories.has(cmd)) {
      fail(`plugin.json command "${cmd}" has no directory`);
    }
  }
  pass('Directories ↔ Manifest aligned');
}

/** Check for plugin-only skills not present upstream. */
function checkPluginOnlySkills(
  upstream: Set<string>,
  directories: Set<string>,
  workarounds: Record<string, string>,
  pluginOnly: Set<string>,
): void {
  section('Plugin-Only Skills');
  const upstreamMapped = new Set([...upstream].map((n) => workarounds[n] ?? n));
  for (const dir of sorted(directories)) {
    if (upstreamMapped.has(dir)) continue;

    if (pluginOnly.has(dir)) {
      pass(`${dir} (plugin-only, expected)`);
    } else {
      warn(`${dir} (plugin-only, investigate — not in upstream)`);
    }
  }
}

export async function checkWorkflows(): Promise<SkillSets> {
  const upstream = await getUpstreamWorkflows();
  const directories = await getPluginDirectories();
  const manifest = await getManifestCommands();
  const workarounds = getAllWorkarounds();
  const pluginOnly = getAllPluginOnlySkills();

  checkUpstreamToDirs(upstream, directories, workarounds);
  checkUpstreamToManifest(upstream, manifest, workarounds);
  checkDirsManifestAlignment(directories, manifest);
  checkPluginOnlySkills(upstream, directories, workarounds, pluginOnly);

  return { upstream, directories, manifest };
}
