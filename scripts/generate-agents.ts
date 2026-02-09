/**
 * Generates plugin agent .md files from upstream .agent.yaml definitions.
 *
 * For each enabled upstream source, reads agent YAML files from agentsRoot
 * and creates corresponding agent markdown files in plugins/bmad/agents/.
 *
 * Run: bun scripts/generate-agents.ts [--source <id>] [--dry-run]
 */

import { exists, readdir } from 'node:fs/promises';
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

const AGENTS_DIR = join(PLUGIN, 'agents');

interface AgentYaml {
  agent: {
    metadata: {
      id: string;
      name: string;
      title: string;
      icon: string;
      module: string;
      hasSidecar?: boolean;
    };
    persona: {
      role: string;
      identity: string;
      communication_style: string;
      principles: string[] | string;
    };
    critical_actions?: string[];
    menu?: Array<{
      trigger: string;
      workflow?: string;
      exec?: string;
      description: string;
    }>;
  };
}

/** Derive the agent slug from the YAML filename. */
function agentSlug(yamlPath: string): string {
  return yamlPath.replace(/\.agent\.yaml$/, '');
}

/** Map a menu item's workflow field to a plugin skill name. */
function extractSkillName(
  menuItem: { workflow?: string; exec?: string },
  source: UpstreamSource,
): string | undefined {
  const raw = menuItem.workflow ?? menuItem.exec;
  if (!raw || raw === 'todo') return undefined;

  // Extract the workflow dir name from upstream paths like:
  // {project-root}/_bmad/cis/workflows/problem-solving/workflow.yaml
  // {project-root}/_bmad/core/workflows/brainstorming/workflow.md
  const match = raw.match(/workflows\/([^/]+)\//);
  if (!match) return undefined;

  const workflowName = match[1]!;
  const workarounds = source.workflowWorkarounds ?? {};
  return workarounds[workflowName] ?? workflowName;
}

/** Build the Available Workflows table from agent menu. */
function buildWorkflowTable(
  agent: AgentYaml['agent'],
  source: UpstreamSource,
): string {
  const menu = agent.menu ?? [];
  if (menu.length === 0) return '';

  const rows: string[] = [];
  for (const item of menu) {
    // Parse trigger: "BS or fuzzy match on brainstorm" → "BS"
    const trigger = item.trigger.split(/\s+or\s+/)[0]!.trim();
    const skillName = extractSkillName(item, source);
    // Strip the trigger prefix from description: "[BS] Guide me..." → "Guide me..."
    const desc = item.description.replace(/^\[\w+\]\s*/, '');
    const workflow = skillName ?? '(planned)';

    rows.push(
      `| ${trigger.padEnd(7)} | ${workflow.padEnd(22)} | ${desc.padEnd(58)} |`,
    );
  }

  return [
    '## Available Workflows',
    '',
    `| Trigger | Workflow${' '.repeat(16)}| Description${' '.repeat(48)}|`,
    `| ------- | ${'-'.repeat(22)} | ${'-'.repeat(58)} |`,
    ...rows,
  ].join('\n');
}

/** Format principles as a markdown list. Handles both array and multiline
 * string formats (upstream uses both until PR #1593 normalizes them). */
function formatPrinciples(principles: string[] | string): string {
  if (Array.isArray(principles)) {
    return principles.map((p) => `- ${p}`).join('\n');
  }
  // Multiline YAML string — already has "- " prefixed lines
  return principles.trim();
}

/** Activation section injected into every agent. Instructs agent to read
 * project settings from .claude/bmad.local.md at activation time. */
const ACTIVATION_SECTION = `## Activation

Before responding, read project settings from \`.claude/bmad.local.md\` (YAML frontmatter).
If the file is missing, use defaults: user_name="User", English, output to \`_bmad-output/\`.

Use settings throughout this session:
- Address user by \`user_name\`, communicate in \`communication_language\`
- Write documents in \`document_output_language\`
- Save planning artifacts to \`planning_artifacts\`, implementation artifacts to \`implementation_artifacts\`
- Save long-term knowledge to \`project_knowledge\``;

/** Generate the agent .md content. */
function generateAgentMd(
  slug: string,
  agent: AgentYaml['agent'],
  source: UpstreamSource,
): string {
  const moduleUpper = source.id.toUpperCase();
  const { metadata, persona, critical_actions } = agent;

  const descriptionLine = `${metadata.title}. ${persona.role}. ${moduleUpper} Module agent.`;

  const sections: string[] = [
    // Frontmatter
    '---',
    `name: ${slug}`,
    'description:',
    ...descriptionLine
      .match(/.{1,76}/g)!
      .map((line, i) => (i === 0 ? `  ${line}` : `  ${line}`)),
    'tools:',
    '  - Read',
    '  - Glob',
    '  - Grep',
    '  - Write',
    '  - Edit',
    '  - Task',
    'model: sonnet',
    '---',
    '',
    `# ${metadata.title} - ${metadata.name} (${slug})`,
    '',
    `**Icon:** ${metadata.icon} **Module:** ${moduleUpper}`,
    '',
    ACTIVATION_SECTION,
    '',
    '## Role',
    '',
    persona.role,
    '',
    '## Identity',
    '',
    persona.identity,
    '',
    '## Communication Style',
    '',
    persona.communication_style,
    '',
    '## Principles',
    '',
    formatPrinciples(persona.principles),
  ];

  if (critical_actions && critical_actions.length > 0) {
    sections.push('', '## Critical Actions', '');
    for (const action of critical_actions) {
      sections.push(`- ${action}`);
    }
  }

  const workflowTable = buildWorkflowTable(agent, source);
  if (workflowTable) {
    sections.push('', workflowTable);
  }

  return `${sections.join('\n')}\n`;
}

/** Find all .agent.yaml files under an agents directory (handles nested dirs). */
async function findAgentYamls(
  dir: string,
): Promise<Array<{ path: string; slug: string }>> {
  const results: Array<{ path: string; slug: string }> = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.agent.yaml')) {
      results.push({
        path: join(dir, entry.name),
        slug: agentSlug(entry.name),
      });
    } else if (entry.isDirectory()) {
      // Look for .agent.yaml inside the subdirectory
      const subEntries = await readdir(join(dir, entry.name));
      const yamlFile = subEntries.find((f) => f.endsWith('.agent.yaml'));
      if (yamlFile) {
        results.push({
          path: join(dir, entry.name, yamlFile),
          slug: agentSlug(yamlFile),
        });
      }
    }
  }

  return results;
}

/** Process a single upstream source. */
async function processSource(source: UpstreamSource): Promise<number> {
  const upstreamRoot = join(ROOT, '.upstream', source.localPath);
  const agentsDir = join(upstreamRoot, source.agentsRoot);

  if (!(await exists(agentsDir))) {
    console.log(
      `⚠ Skipping ${source.id}: agents dir not found at ${agentsDir}`,
    );
    return 0;
  }

  const pluginOnlyAgents = source.pluginOnlyAgents ?? new Set();
  const agentFiles = await findAgentYamls(agentsDir);
  let count = 0;

  for (const { path, slug } of agentFiles) {
    if (pluginOnlyAgents.has(slug)) {
      console.log(`  skip: ${slug} (plugin-only, owned by another source)`);
      continue;
    }

    const content = await Bun.file(path).text();
    const parsed = parseYaml(content) as AgentYaml;

    if (!parsed?.agent?.metadata) {
      console.log(`  ⚠ skip: ${slug} (invalid YAML structure)`);
      continue;
    }

    const md = generateAgentMd(slug, parsed.agent, source);
    const outPath = join(AGENTS_DIR, `${slug}.md`);

    if (DRY_RUN) {
      console.log(`  [dry-run] would write: agents/${slug}.md`);
    } else {
      await Bun.write(outPath, md);
      console.log(`  ✓ agents/${slug}.md`);
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
    : 'Generating agent files...\n',
);

let total = 0;
for (const source of sources) {
  console.log(`[${source.id}] Processing agents from ${source.agentsRoot}/`);
  const count = await processSource(source);
  total += count;
  console.log(`[${source.id}] ${count} agents generated\n`);
}

console.log(
  `Total: ${total} agent files ${DRY_RUN ? 'would be' : ''} generated.`,
);
