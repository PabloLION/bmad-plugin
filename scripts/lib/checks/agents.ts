/**
 * Agent coverage check: upstream agents ↔ plugin agent .md files.
 */

import { exists, readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_WORKAROUNDS,
  PLUGIN,
  PLUGIN_ONLY_AGENTS,
  UPSTREAM,
} from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';

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
): Promise<void> {
  section('Plugin-Only Agents');
  const pluginAgents = await readdir(join(PLUGIN, 'agents'));

  for (const file of pluginAgents) {
    if (!file.endsWith('.md')) {
      continue;
    }
    const name = file.replace('.md', '');
    if (coveredNames.has(name)) {
      continue;
    }

    if (PLUGIN_ONLY_AGENTS.has(name)) {
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

  const upstreamDir = join(UPSTREAM, 'src/bmm/agents');
  const entries = await readdir(upstreamDir, { withFileTypes: true });
  const upstreamNames = collectUpstreamNames(entries);

  for (const upstream of upstreamNames) {
    const workaround = AGENT_WORKAROUNDS[upstream];
    const pluginName = workaround ?? upstream;
    const pluginPath = join(PLUGIN, 'agents', `${pluginName}.md`);

    if (await exists(pluginPath)) {
      if (workaround) {
        warn(
          `Agent: ${upstream} → ${workaround} (workaround — should rename to ${upstream}.md)`,
        );
      } else {
        pass(`Agent: ${upstream}`);
      }
    } else {
      fail(`Agent missing: expected ${pluginName}.md for upstream ${upstream}`);
    }
  }

  const coveredNames = new Set(
    upstreamNames.map((n) => AGENT_WORKAROUNDS[n] ?? n),
  );
  await checkPluginOnlyAgents(coveredNames);
}
