/**
 * Agent coverage check: upstream agents ↔ plugin agent .md files,
 * across all enabled upstream sources.
 */

import type { Dirent } from 'node:fs';
import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import { getEnabledSources } from '../upstream-sources.ts';

/** Collect upstream agent names from directory entries. */
function collectUpstreamNames(entries: Dirent[]): string[] {
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      names.push(entry.name);
    } else if (entry.name.endsWith('.agent.yaml')) {
      names.push(entry.name.replace('.agent.yaml', ''));
    }
  }
  return names;
}

/** Check for plugin agents with no upstream counterpart. */
async function checkPluginOnlyAgents(
  coveredNames: Set<string>,
  allPluginOnly: Set<string>,
): Promise<void> {
  section('Plugin-Only Agents');
  const pluginAgents = await readdir(join(PLUGIN, 'agents'));

  for (const file of pluginAgents) {
    if (!file.endsWith('.md')) continue;
    const name = file.replace('.md', '');
    if (coveredNames.has(name)) continue;

    if (allPluginOnly.has(name)) {
      pass(`Plugin-only agent: ${name} (no upstream counterpart — expected)`);
    } else {
      warn(
        `Plugin-only agent: ${name} (no upstream counterpart — investigate)`,
      );
    }
  }
}

export async function checkAgents(): Promise<void> {
  section('Agent Coverage (upstream → plugin)');

  const coveredNames = new Set<string>();
  const allPluginOnly = new Set<string>();

  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const agentsDir = join(upstreamRoot, source.agentsRoot);

    if (!(await exists(agentsDir))) continue;

    const entries = await readdir(agentsDir, { withFileTypes: true });
    const upstreamNames = collectUpstreamNames(entries);

    for (const upstream of upstreamNames) {
      const pluginPath = join(PLUGIN, 'agents', `${upstream}.md`);

      if (await exists(pluginPath)) {
        pass(`[${source.id}] Agent: ${upstream}`);
      } else {
        fail(
          `[${source.id}] Agent missing: expected ${upstream}.md for upstream ${upstream}`,
        );
      }
      coveredNames.add(upstream);
    }

    for (const name of source.pluginOnlyAgents ?? []) {
      allPluginOnly.add(name);
    }
  }

  await checkPluginOnlyAgents(coveredNames, allPluginOnly);
}
