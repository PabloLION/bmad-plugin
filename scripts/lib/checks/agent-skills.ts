/**
 * Agent–skill cross-reference check: every workflow referenced in an upstream
 * agent's menu must have a corresponding plugin skill directory.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, UPSTREAM, WORKFLOW_WORKAROUNDS } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';

const AGENT_YAML_EXT = '.agent.yaml';

/** Extract workflow leaf names from an agent YAML's menu entries. */
function extractWorkflowNames(yaml: string): string[] {
  const names: string[] = [];
  // Match exec: or workflow: lines containing a workflow path
  const pattern =
    /(?:exec|workflow):\s*"[^"]*\/([^/]+)\/workflow\.(?:md|yaml)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(yaml)) !== null) {
    names.push(match[1] as string);
  }
  // Deduplicate (e.g. PM has 3 menu items pointing to create-prd)
  return [...new Set(names)];
}

/** Resolve an agent entry to its name and YAML path, or null if not an agent. */
async function resolveAgentEntry(
  agentsDir: string,
  entry: { name: string; isDirectory(): boolean },
): Promise<{ agentName: string; yamlPath: string } | null> {
  if (entry.isDirectory()) {
    const inner = await readdir(join(agentsDir, entry.name));
    const yamlFile = inner.find((f) => f.endsWith(AGENT_YAML_EXT));
    if (!yamlFile) {
      return null;
    }
    return {
      agentName: entry.name,
      yamlPath: join(agentsDir, entry.name, yamlFile),
    };
  }
  if (entry.name.endsWith(AGENT_YAML_EXT)) {
    return {
      agentName: entry.name.replace(AGENT_YAML_EXT, ''),
      yamlPath: join(agentsDir, entry.name),
    };
  }
  return null;
}

/** Check workflow references for a single agent against plugin skill dirs. */
function checkAgentWorkflows(
  agentName: string,
  workflows: string[],
  skillDirs: Set<string>,
): void {
  for (const wf of workflows) {
    const skillName = WORKFLOW_WORKAROUNDS[wf] ?? wf;
    if (skillDirs.has(skillName)) {
      if (WORKFLOW_WORKAROUNDS[wf]) {
        warn(
          `${agentName} → ${skillName} (workaround — upstream "${wf}" ≠ plugin "${skillName}")`,
        );
      } else {
        pass(`${agentName} → ${skillName}`);
      }
    } else {
      fail(
        `${agentName} references workflow "${wf}" but no skill directory "${skillName}" exists`,
      );
    }
  }
}

export async function checkAgentSkills(): Promise<void> {
  section('Agent → Skill Cross-Reference');

  const agentsDir = join(UPSTREAM, 'src/bmm/agents');
  const entries = await readdir(agentsDir, { withFileTypes: true });

  const skillEntries = await readdir(join(PLUGIN, 'skills'), {
    withFileTypes: true,
  });
  const skillDirs = new Set(
    skillEntries.filter((e) => e.isDirectory()).map((e) => e.name),
  );

  for (const entry of entries) {
    const resolved = await resolveAgentEntry(agentsDir, entry);
    if (!resolved) {
      continue;
    }

    const yaml = await readFile(resolved.yamlPath, 'utf-8');
    const workflows = extractWorkflowNames(yaml);

    if (workflows.length === 0) {
      pass(`${resolved.agentName}: no workflow references (OK)`);
      continue;
    }

    checkAgentWorkflows(resolved.agentName, workflows, skillDirs);
  }
}
