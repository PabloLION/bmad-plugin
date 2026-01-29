/**
 * Configuration constants for upstream validation.
 */

import { join } from 'node:path';

export const ROOT = join(import.meta.dir, '../..');
export const UPSTREAM = join(ROOT, '.upstream/BMAD-METHOD');
export const PLUGIN = join(ROOT, 'plugins/bmad');
export const PLUGIN_JSON_PATH = join(PLUGIN, '.claude-plugin/plugin.json');

/**
 * Agent name workarounds: upstream name → plugin name.
 * Each should be eliminated by renaming plugin files to match upstream.
 */
export const AGENT_WORKAROUNDS: Record<string, string> = {};

/**
 * Workflow name workarounds: upstream name → plugin skill name.
 * Each should be eliminated by renaming plugin directories to match upstream.
 */
export const WORKFLOW_WORKAROUNDS: Record<string, string> = {};

/** Plugin-only agents with no upstream counterpart */
export const PLUGIN_ONLY_AGENTS = new Set(['bmad-master']);

/** Plugin-only skills with no upstream counterpart */
export const PLUGIN_ONLY_SKILLS = new Set([
  'help',
  'init',
  'status',
  'brainstorming',
]);

/** Upstream subdirectories that are not workflow leaves */
export const SKIP_DIRS = new Set(['_shared', 'templates', 'workflows']);

/**
 * Shared file distribution: upstream _shared/ path → plugin skills that need copies.
 * Sync script copies _shared/ files to plugin _shared/, then distributes to each skill's data/.
 */
export const SHARED_FILE_TARGETS: Record<string, string[]> = {
  'excalidraw-diagrams': [
    'create-dataflow',
    'create-diagram',
    'create-flowchart',
    'create-wireframe',
  ],
};

/** Plugin-only data files with no upstream counterpart */
export const PLUGIN_ONLY_DATA = new Set(['quick-dev/data/project-levels.yaml']);

/** Files that are structurally different between upstream and plugin */
export const SKIP_CONTENT_FILES = new Set([
  'workflow.md',
  'workflow.yaml',
  'SKILL.md',
]);
