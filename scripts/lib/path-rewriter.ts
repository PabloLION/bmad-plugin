/**
 * Rewrites upstream {project-root}/_bmad/ paths in synced content files
 * to plugin-relative ${CLAUDE_PLUGIN_ROOT}/ paths.
 *
 * Used by sync-upstream-content.ts during file copy to transform paths
 * so plugin skill files reference correct locations at runtime.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN, ROOT } from './config.ts';
import type { UpstreamSource } from './upstream-sources.ts';
import { getEnabledSources } from './upstream-sources.ts';

/**
 * Module alias config: how each _bmad/<alias>/ maps to upstream structure.
 *
 * - categorized: workflow dirs are nested under category dirs (bmm, gds)
 * - flat: workflow dirs are directly under the workflows root (tea, bmb, cis)
 * - pathPrefix: path segments between the module root and workflow dirs
 */
interface ModuleConfig {
  sourceId: string;
  pathPrefix: string;
  categorized: boolean;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  bmm: { sourceId: 'core', pathPrefix: 'workflows', categorized: true },
  core: { sourceId: 'core', pathPrefix: '', categorized: false },
  tea: {
    sourceId: 'tea',
    pathPrefix: 'workflows/testarch',
    categorized: false,
  },
  bmb: { sourceId: 'bmb', pathPrefix: 'workflows', categorized: false },
  cis: { sourceId: 'cis', pathPrefix: 'workflows', categorized: false },
  gds: { sourceId: 'gds', pathPrefix: 'workflows', categorized: true },
};

/** Map of (moduleAlias, upstreamWorkflowName) → pluginSkillName */
export type WorkflowMap = Map<string, Map<string, string>>;

/**
 * Scans all upstream sources and builds a mapping table from
 * (moduleAlias, workflowName) → pluginSkillName.
 *
 * Must cover ALL sources regardless of --source filter, because
 * cross-module references are common (e.g., GDS skill → core workflow).
 */
export async function buildWorkflowMap(): Promise<WorkflowMap> {
  const map: WorkflowMap = new Map();
  const sources = getEnabledSources();

  // Build from upstream source configs
  for (const source of sources) {
    await addSourceWorkflows(map, source);
  }

  // Add core special entries (tasks are handled separately by the rewriter)
  await addCoreSpecialWorkflows(map);

  return map;
}

/** Add workflow mappings for a single upstream source. */
async function addSourceWorkflows(
  map: WorkflowMap,
  source: UpstreamSource,
): Promise<void> {
  const upstreamRoot = join(ROOT, '.upstream', source.localPath);
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  if (!(await exists(workflowsRoot))) return;

  // Determine module alias for this source
  const alias = getModuleAlias(source);
  if (!map.has(alias)) map.set(alias, new Map());
  const moduleMap = map.get(alias)!;

  const workarounds = source.workflowWorkarounds ?? {};
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();

  if (source.flatWorkflows) {
    // Flat: workflow dirs directly under contentRoot
    const entries = await readdir(workflowsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
      if (skipWorkflows.has(entry.name)) continue;
      const skillName = workarounds[entry.name] ?? entry.name;
      moduleMap.set(entry.name, skillName);
    }
  } else {
    // Categorized: category/workflow structure
    const categories = await readdir(workflowsRoot, { withFileTypes: true });
    for (const cat of categories) {
      if (!cat.isDirectory()) continue;

      const catDir = join(workflowsRoot, cat.name);

      // Check for leaf workflow at category level
      const hasWorkflowFile =
        (await exists(join(catDir, 'workflow.yaml'))) ||
        (await exists(join(catDir, 'workflow.md')));
      if (hasWorkflowFile) {
        if (!skipWorkflows.has(cat.name)) {
          const skillName = workarounds[cat.name] ?? cat.name;
          moduleMap.set(cat.name, skillName);
        }
        continue;
      }

      // Iterate sub-workflows
      const subs = await readdir(catDir, { withFileTypes: true });
      for (const sub of subs) {
        if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
        if (skipWorkflows.has(sub.name)) continue;
        const skillName = workarounds[sub.name] ?? sub.name;
        moduleMap.set(sub.name, skillName);
      }
    }
  }
}

/** Get the module alias used in _bmad/ paths for a source. */
function getModuleAlias(source: UpstreamSource): string {
  // Core source uses 'bmm' alias (its contentRoot is bmm/workflows)
  if (source.id === 'core') return 'bmm';
  return source.id;
}

/** Add core special workflows (advanced-elicitation, party-mode, brainstorming). */
async function addCoreSpecialWorkflows(map: WorkflowMap): Promise<void> {
  const coreWorkflowsDir = join(
    ROOT,
    '.upstream/BMAD-METHOD/src/core/workflows',
  );
  if (!(await exists(coreWorkflowsDir))) return;

  if (!map.has('core')) map.set('core', new Map());
  const coreMap = map.get('core')!;

  const entries = await readdir(coreWorkflowsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    coreMap.set(entry.name, entry.name);
  }
}

/** Text file extensions that should have path rewrites applied. */
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.xml',
  '.yaml',
  '.yml',
  '.csv',
  '.txt',
  '.json',
]);

/** Check if a file should have path rewrites applied. */
export function isTextFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return TEXT_EXTENSIONS.has(ext);
}

export interface RewriteResult {
  content: string;
  changeCount: number;
  warnings: string[];
}

/**
 * Rewrites all {project-root}/_bmad/ paths in the given content.
 *
 * Returns the rewritten content, change count, and any warnings
 * for paths that couldn't be resolved.
 */
export function rewriteFileContent(
  content: string,
  map: WorkflowMap,
): RewriteResult {
  let changeCount = 0;
  const warnings: string[] = [];

  // Main regex: captures module alias and the rest of the path
  // Terminates at whitespace, quotes, angle brackets, curly braces, backticks, or parens
  const pattern = /\{project-root\}\/_bmad\/([a-z]+)\/((?:[^\s'"<>{}()`])+)/g;

  const rewritten = content.replace(pattern, (fullMatch, alias, rest) => {
    const result = rewriteSinglePath(alias as string, rest as string, map);
    if (result.warning) {
      warnings.push(result.warning);
    }
    if (result.changed) {
      changeCount++;
      return result.replacement;
    }
    return fullMatch;
  });

  return { content: rewritten, changeCount, warnings };
}

interface SingleRewriteResult {
  replacement: string;
  changed: boolean;
  warning?: string;
}

/** Dispatch a single path to the appropriate category handler. */
function rewriteSinglePath(
  alias: string,
  rest: string,
  map: WorkflowMap,
): SingleRewriteResult {
  // Skip deferred categories
  if (alias === '_memory' || rest.startsWith('_memory/')) {
    return { replacement: '', changed: false };
  }
  if (alias === '_config' || rest.startsWith('_config/')) {
    return { replacement: '', changed: false };
  }

  // Handle top-level _bmad/_memory/ and _bmad/_config/ (alias starts with _)
  // These are caught by the regex as alias="_memory" or alias="_config"
  // but the regex requires [a-z]+ so they won't match. Handle the case
  // where they appear as part of a module path instead.

  // Task paths: <alias>/tasks/<file>
  if (rest.startsWith('tasks/')) {
    return rewriteTaskPath(alias, rest);
  }

  // Config paths: config.yaml
  if (rest === 'config.yaml' || rest.endsWith('/config.yaml')) {
    return rewriteConfigPath();
  }

  // Knowledge/index paths
  if (rest.endsWith('.csv') && !rest.startsWith('workflows/')) {
    return rewriteIndexPath(alias, rest);
  }

  // Workflow paths: <alias>/workflows/...
  if (rest.startsWith('workflows/')) {
    return rewriteWorkflowPath(alias, rest.slice('workflows/'.length), map);
  }

  // Core special: core/tasks/ or core/workflows/
  // (alias is 'core' and rest doesn't start with workflows/)
  if (alias === 'core') {
    // core/workflows/<workflow>/... — check without 'workflows/' prefix in MODULE_CONFIGS
    return rewriteWorkflowPath('core', rest, map);
  }

  // Unrecognized pattern
  return {
    replacement: '',
    changed: false,
    warning: `Unrecognized path: _bmad/${alias}/${rest}`,
  };
}

/** Rewrite a workflow path to ${CLAUDE_PLUGIN_ROOT}/skills/<name>/... */
function rewriteWorkflowPath(
  alias: string,
  pathAfterWorkflows: string,
  map: WorkflowMap,
): SingleRewriteResult {
  const moduleMap = map.get(alias);
  if (!moduleMap) {
    return {
      replacement: '',
      changed: false,
      warning: `Unknown module alias: ${alias}`,
    };
  }

  const config = MODULE_CONFIGS[alias];
  const segments = pathAfterWorkflows.split('/');

  // For flat sources with extra prefix (tea has testarch/)
  let startIdx = 0;
  if (config && config.pathPrefix.includes('/')) {
    // tea: pathPrefix is 'workflows/testarch', skip 'testarch' segment
    const prefixParts = config.pathPrefix.split('/');
    const extraPrefix = prefixParts.slice(1).join('/');
    if (pathAfterWorkflows.startsWith(`${extraPrefix}/`)) {
      startIdx = extraPrefix.split('/').length;
    }
  }

  // Try to find workflow name in segments
  let workflowName: string | undefined;
  let restStartIdx: number | undefined;

  // Try first available segment as workflow name
  const seg0 = segments[startIdx] as string | undefined;
  const seg1 = segments[startIdx + 1] as string | undefined;

  if (seg0 && moduleMap.has(seg0)) {
    workflowName = seg0;
    restStartIdx = startIdx + 1;
  }
  // Try second segment (category/workflow for categorized sources)
  else if (seg1 && moduleMap.has(seg1)) {
    workflowName = seg1;
    restStartIdx = startIdx + 2;
  }

  if (!workflowName || restStartIdx === undefined) {
    return {
      replacement: '',
      changed: false,
      warning: `Cannot resolve workflow in: _bmad/${alias}/workflows/${pathAfterWorkflows}`,
    };
  }

  const skillName = moduleMap.get(workflowName)!;
  let restPath = segments.slice(restStartIdx).join('/');

  // Special case: workflow.yaml or workflow.md → SKILL.md
  if (restPath === 'workflow.yaml' || restPath === 'workflow.md') {
    restPath = 'SKILL.md';
  }

  const pluginPath = restPath
    ? `\${CLAUDE_PLUGIN_ROOT}/skills/${skillName}/${restPath}`
    : `\${CLAUDE_PLUGIN_ROOT}/skills/${skillName}`;

  return { replacement: pluginPath, changed: true };
}

/** Rewrite a task path to ${CLAUDE_PLUGIN_ROOT}/_shared/tasks/<file> */
function rewriteTaskPath(_alias: string, rest: string): SingleRewriteResult {
  // rest is "tasks/<file>" — extract the file part
  const file = rest.slice('tasks/'.length);
  return {
    replacement: `\${CLAUDE_PLUGIN_ROOT}/_shared/tasks/${file}`,
    changed: true,
  };
}

/** Rewrite a config.yaml path to .claude/bmad.local.md */
function rewriteConfigPath(): SingleRewriteResult {
  return {
    replacement: '.claude/bmad.local.md',
    changed: true,
  };
}

/** Rewrite a knowledge/index path to ${CLAUDE_PLUGIN_ROOT}/_shared/<file> */
function rewriteIndexPath(alias: string, rest: string): SingleRewriteResult {
  // Extract just the filename from paths like testarch/tea-index.csv
  const fileName = rest.split('/').pop()!;
  return {
    replacement: `\${CLAUDE_PLUGIN_ROOT}/_shared/${fileName}`,
    changed: true,
  };
}
