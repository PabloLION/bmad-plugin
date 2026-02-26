/**
 * Three-set skill coverage check across all upstream sources:
 * - Upstream workflow names (from all enabled sources)
 * - Plugin skill directories
 * - Plugin.json manifest commands
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, PLUGIN_JSON_PATH, ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import { getEnabledSources } from '../upstream-sources.ts';
import { getWorkflowEntries } from '../workflow-iterator.ts';

export interface SkillSets {
  upstream: Set<string>;
  directories: Set<string>;
  manifest: Set<string>;
}

/** Collect upstream workflow names from all enabled sources. */
async function getUpstreamWorkflows(): Promise<Set<string>> {
  const names = new Set<string>();

  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const entries = await getWorkflowEntries(source, upstreamRoot);
    for (const entry of entries) {
      names.add(entry.skillName);
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

/** Build inverse workaround map: mapped name → original name (for display only). */
function getInverseWorkarounds(): Record<string, string> {
  const inverse: Record<string, string> = {};
  for (const source of getEnabledSources()) {
    for (const [original, mapped] of Object.entries(
      source.workflowWorkarounds ?? {},
    )) {
      inverse[mapped] = original;
    }
  }
  return inverse;
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

/** Check upstream workflows have corresponding plugin directories.
 * Names in `upstream` are already mapped via per-source workarounds.
 * Use inverse map for display only. */
function checkUpstreamToDirs(
  upstream: Set<string>,
  directories: Set<string>,
  inverse: Record<string, string>,
): void {
  section('Skills: Upstream → Plugin Directories');
  for (const name of sorted(upstream)) {
    if (directories.has(name)) {
      if (inverse[name]) {
        warn(`${inverse[name]} → ${name} (workaround)`);
      } else {
        pass(name);
      }
    } else {
      fail(`Missing directory: skills/${name}`);
    }
  }
}

/** Check upstream workflows are listed in plugin.json manifest.
 * Names in `upstream` are already mapped. */
function checkUpstreamToManifest(
  upstream: Set<string>,
  manifest: Set<string>,
): void {
  section('Skills: Upstream → Manifest');
  for (const name of sorted(upstream)) {
    if (manifest.has(name)) {
      pass(`${name} in plugin.json`);
    } else {
      fail(`Missing in plugin.json: ${name}`);
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

/** Check for plugin-only skills not present upstream.
 * Names in `upstream` are already mapped — direct comparison. */
function checkPluginOnlySkills(
  upstream: Set<string>,
  directories: Set<string>,
  pluginOnly: Set<string>,
): void {
  section('Plugin-Only Skills');
  for (const dir of sorted(directories)) {
    if (upstream.has(dir)) continue;

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
  const inverse = getInverseWorkarounds();
  const pluginOnly = getAllPluginOnlySkills();

  checkUpstreamToDirs(upstream, directories, inverse);
  checkUpstreamToManifest(upstream, manifest);
  checkDirsManifestAlignment(directories, manifest);
  checkPluginOnlySkills(upstream, directories, pluginOnly);

  return { upstream, directories, manifest };
}
