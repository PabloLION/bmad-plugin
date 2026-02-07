/**
 * Generates plugin SKILL.md files from upstream workflow.yaml definitions.
 *
 * For each enabled upstream source, reads workflow directories from contentRoot
 * and creates corresponding SKILL.md files in plugins/bmad/skills/<name>/.
 *
 * Run: bun scripts/generate-skills.ts [--source <id>] [--dry-run]
 */

import { exists, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { PLUGIN, ROOT } from './lib/config.ts';
import type { UpstreamSource } from './lib/upstream-sources.ts';
import { getEnabledSources, getSource } from './lib/upstream-sources.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_FILTER = (() => {
  const idx = process.argv.indexOf('--source');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

const SKILLS_DIR = join(PLUGIN, 'skills');

interface WorkflowYaml {
  name: string;
  description: string;
  author?: string;
}

interface WorkflowInfo {
  dirName: string;
  skillName: string;
  yaml: WorkflowYaml;
  hasSubWorkflows: boolean;
  subWorkflows?: Array<{ trigger: string; file: string; description: string }>;
}

/** Find the agent that references a given workflow and return its details. */
async function findAgentForWorkflow(
  source: UpstreamSource,
  workflowName: string,
): Promise<
  { agentName: string; characterName: string; module: string } | undefined
> {
  const agentsDir = join(
    ROOT,
    '.upstream',
    source.localPath,
    source.agentsRoot,
  );
  if (!(await exists(agentsDir))) return undefined;

  const entries = await readdir(agentsDir, { withFileTypes: true });

  for (const entry of entries) {
    let yamlPath: string;
    if (entry.isFile() && entry.name.endsWith('.agent.yaml')) {
      yamlPath = join(agentsDir, entry.name);
    } else if (entry.isDirectory()) {
      const subEntries = await readdir(join(agentsDir, entry.name));
      const yamlFile = subEntries.find((f) => f.endsWith('.agent.yaml'));
      if (!yamlFile) continue;
      yamlPath = join(agentsDir, entry.name, yamlFile);
    } else {
      continue;
    }

    const content = await Bun.file(yamlPath).text();
    const parsed = parseYaml(content);
    const menu = parsed?.agent?.menu ?? [];

    for (const item of menu) {
      const raw = item.workflow ?? item.exec ?? '';
      if (raw.includes(`/${workflowName}/`)) {
        return {
          agentName: parsed.agent.metadata.title,
          characterName: parsed.agent.metadata.name,
          module: source.id.toUpperCase(),
        };
      }
    }
  }

  return undefined;
}

/** Detect if a workflow directory has sub-workflow files (workflow-*.md). */
async function detectSubWorkflows(
  workflowDir: string,
): Promise<Array<{ trigger: string; file: string; description: string }>> {
  const entries = await readdir(workflowDir);
  const subWorkflows: Array<{
    trigger: string;
    file: string;
    description: string;
  }> = [];

  for (const entry of entries) {
    if (entry.startsWith('workflow-') && entry.endsWith('.md')) {
      const name = entry.replace(/^workflow-/, '').replace(/\.md$/, '');
      subWorkflows.push({
        trigger: name.slice(0, 2).toUpperCase(),
        file: `./${entry}`,
        description: name.replace(/-/g, ' '),
      });
    }
  }

  return subWorkflows;
}

/** Generate SKILL.md content. */
function generateSkillMd(
  info: WorkflowInfo,
  agentInfo?: {
    agentName: string;
    characterName: string;
    module: string;
  },
): string {
  const lines: string[] = [
    '---',
    'description:',
    ...info.yaml.description
      .match(/.{1,76}/g)!
      .map((line, i) => (i === 0 ? `  ${line}` : `  ${line}`)),
    'user-invocable: true',
    'disable-model-invocation: true',
    '---',
    '',
    `# ${info.yaml.name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')} Workflow`,
    '',
  ];

  // Goal line
  const goalDesc = info.yaml.description.split('.')[0];
  lines.push(`**Goal:** ${goalDesc}.`);

  // Agent line
  if (agentInfo) {
    lines.push(
      ``,
      `**Agent:** ${agentInfo.agentName} (${agentInfo.characterName}) **Module:** ${agentInfo.module}`,
    );
  }

  lines.push('', '---', '', '## Execution', '');

  if (
    info.hasSubWorkflows &&
    info.subWorkflows &&
    info.subWorkflows.length > 0
  ) {
    lines.push('Select a sub-workflow based on user intent:', '');
    lines.push(
      '| Trigger | Sub-workflow | Description |',
      '| ------- | ------------ | ----------- |',
    );
    for (const sub of info.subWorkflows) {
      lines.push(`| ${sub.trigger} | \`${sub.file}\` | ${sub.description} |`);
    }
    lines.push('', 'Read and follow the selected sub-workflow file.');
  } else {
    lines.push('Read and follow: `./instructions.md`');
  }

  // Check for validation artifacts
  lines.push(
    '',
    '## Validation',
    '',
    'After completion, verify against: `./checklist.md`',
  );

  return `${lines.join('\n')}\n`;
}

/** Get workflow directories for a flat source. */
async function getWorkflowDirs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowInfo[]> {
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return [];

  const entries = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const pluginOnlySkills = source.pluginOnlySkills ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};
  const results: WorkflowInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    if (skipWorkflows.has(entry.name)) continue;

    const skillName = workarounds[entry.name] ?? entry.name;
    if (pluginOnlySkills.has(skillName)) continue;

    const workflowDir = join(workflowsRoot, entry.name);
    const yamlPath = join(workflowDir, 'workflow.yaml');

    if (!(await exists(yamlPath))) {
      console.log(`  ⚠ skip: ${entry.name} (no workflow.yaml)`);
      continue;
    }

    const content = await Bun.file(yamlPath).text();
    const yaml = parseYaml(content) as WorkflowYaml;
    const subWorkflows = await detectSubWorkflows(workflowDir);

    results.push({
      dirName: entry.name,
      skillName,
      yaml,
      hasSubWorkflows: subWorkflows.length > 0,
      subWorkflows,
    });
  }

  return results;
}

/** Process a single upstream source. */
async function processSource(source: UpstreamSource): Promise<number> {
  const upstreamRoot = join(ROOT, '.upstream', source.localPath);

  if (!(await exists(join(upstreamRoot, '.git')))) {
    console.log(`⚠ Skipping ${source.id}: repo not cloned`);
    return 0;
  }

  const workflows = await getWorkflowDirs(source, upstreamRoot);
  let count = 0;

  for (const info of workflows) {
    const skillDir = join(SKILLS_DIR, info.skillName);
    const skillPath = join(skillDir, 'SKILL.md');

    const agentInfo = await findAgentForWorkflow(source, info.dirName);
    const md = generateSkillMd(info, agentInfo);

    if (DRY_RUN) {
      console.log(`  [dry-run] would write: skills/${info.skillName}/SKILL.md`);
    } else {
      if (!(await exists(skillDir))) {
        await mkdir(skillDir, { recursive: true });
      }
      await Bun.write(skillPath, md);
      console.log(`  ✓ skills/${info.skillName}/SKILL.md`);
    }
    count++;
  }

  return count;
}

// === Main ===

const sources = SOURCE_FILTER
  ? ([getSource(SOURCE_FILTER)].filter(Boolean) as UpstreamSource[])
  : getEnabledSources().filter((s) => s.id !== 'core');

if (sources.length === 0) {
  console.error(
    `No matching source found${SOURCE_FILTER ? ` for "${SOURCE_FILTER}"` : ''}`,
  );
  process.exit(1);
}

console.log(
  DRY_RUN
    ? 'Dry run — no files will be written\n'
    : 'Generating skill files...\n',
);

let total = 0;
for (const source of sources) {
  console.log(
    `[${source.id}] Processing workflows from ${source.contentRoot}/`,
  );
  const count = await processSource(source);
  total += count;
  console.log(`[${source.id}] ${count} skills generated\n`);
}

console.log(
  `Total: ${total} skill files ${DRY_RUN ? 'would be' : ''} generated.`,
);
