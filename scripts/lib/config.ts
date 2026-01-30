/**
 * Configuration constants for upstream validation.
 *
 * Values are sourced from the core entry in upstream-sources.ts.
 * These exports are kept for backward compatibility with existing checks.
 */

import { join } from 'node:path';
import { getCoreSource } from './upstream-sources.ts';

export const ROOT = join(import.meta.dir, '../..');
export const UPSTREAM = join(ROOT, '.upstream/BMAD-METHOD');
export const PLUGIN = join(ROOT, 'plugins/bmad');
export const PLUGIN_JSON_PATH = join(PLUGIN, '.claude-plugin/plugin.json');

const core = getCoreSource();

/**
 * Agent name workarounds: upstream name → plugin name.
 * Each should be eliminated by renaming plugin files to match upstream.
 */
export const AGENT_WORKAROUNDS: Record<string, string> = {};

/**
 * Workflow name workarounds: upstream name → plugin skill name.
 * Each should be eliminated by renaming plugin directories to match upstream.
 */
export const WORKFLOW_WORKAROUNDS: Record<string, string> =
  core.workflowWorkarounds ?? {};

/** Plugin-only agents with no upstream counterpart */
export const PLUGIN_ONLY_AGENTS = core.pluginOnlyAgents ?? new Set<string>();

/** Plugin-only skills with no upstream counterpart */
export const PLUGIN_ONLY_SKILLS = core.pluginOnlySkills ?? new Set<string>();

/** Upstream subdirectories that are not workflow leaves */
export const SKIP_DIRS = core.skipDirs ?? new Set<string>();

/**
 * Shared file distribution: upstream _shared/ path → plugin skills that need copies.
 */
export const SHARED_FILE_TARGETS: Record<string, string[]> =
  core.sharedFileTargets ?? {};

/** Plugin-only data files with no upstream counterpart */
export const PLUGIN_ONLY_DATA = core.pluginOnlyData ?? new Set<string>();

/** Files that are structurally different between upstream and plugin */
export const SKIP_CONTENT_FILES = core.skipContentFiles ?? new Set<string>();
