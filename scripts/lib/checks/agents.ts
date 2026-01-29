/**
 * Agent coverage check: upstream agents ↔ plugin agent .md files.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AGENT_WORKAROUNDS,
  PLUGIN,
  PLUGIN_ONLY_AGENTS,
  UPSTREAM,
} from '../config.ts';
import { fail, pass, warn } from '../output.ts';

export async function checkAgents(): Promise<void> {
  console.log('\n== Agent Coverage (upstream → plugin) ==');

  const upstreamDir = join(UPSTREAM, 'src/bmm/agents');
  const entries = await readdir(upstreamDir, { withFileTypes: true });

  const upstreamNames: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      upstreamNames.push(entry.name);
    } else if (entry.name.endsWith('.agent.yaml')) {
      upstreamNames.push(entry.name.replace('.agent.yaml', ''));
    }
  }

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

  // Check for plugin agents with no upstream counterpart
  console.log('\n== Plugin-Only Agents ==');
  const pluginAgents = await readdir(join(PLUGIN, 'agents'));
  const coveredNames = new Set(
    upstreamNames.map((n) => AGENT_WORKAROUNDS[n] ?? n),
  );

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
