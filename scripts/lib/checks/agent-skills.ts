/**
 * Agent–skill cross-reference check: every workflow referenced in an upstream
 * agent's menu must have a corresponding plugin skill directory.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, UPSTREAM, WORKFLOW_WORKAROUNDS } from '../config.ts';
import { fail, pass, warn } from '../output.ts';

/** Extract workflow leaf names from an agent YAML's menu entries. */
function extractWorkflowNames(yaml: string): string[] {
  const names: string[] = [];
  // Match exec: or workflow: lines containing a workflow path
  const pattern =
    /(?:exec|workflow):\s*"[^"]*\/([^/]+)\/workflow\.(?:md|yaml)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(yaml)) !== null) {
    names.push(match[1]!);
  }
  // Deduplicate (e.g. PM has 3 menu items pointing to create-prd)
  return [...new Set(names)];
}

export async function checkAgentSkills(): Promise<void> {
  console.log('\n== Agent → Skill Cross-Reference ==');

  const agentsDir = join(UPSTREAM, 'src/bmm/agents');
  const entries = await readdir(agentsDir, { withFileTypes: true });

  // Collect skill directories that exist in plugin
  const skillDirs = new Set(
    (await readdir(join(PLUGIN, 'skills'), { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

  for (const entry of entries) {
    let agentName: string;
    let yamlPath: string;

    if (entry.isDirectory()) {
      agentName = entry.name;
      // tech-writer directory — look for agent YAML inside
      const inner = await readdir(join(agentsDir, entry.name));
      const yamlFile = inner.find((f) => f.endsWith('.agent.yaml'));
      if (!yamlFile) continue;
      yamlPath = join(agentsDir, entry.name, yamlFile);
    } else if (entry.name.endsWith('.agent.yaml')) {
      agentName = entry.name.replace('.agent.yaml', '');
      yamlPath = join(agentsDir, entry.name);
    } else {
      continue;
    }

    const yaml = await readFile(yamlPath, 'utf-8');
    const workflows = extractWorkflowNames(yaml);

    if (workflows.length === 0) {
      pass(`${agentName}: no workflow references (OK)`);
      continue;
    }

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
}
