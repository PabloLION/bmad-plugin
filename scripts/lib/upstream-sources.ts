/**
 * Multi-upstream source configuration.
 *
 * Each UpstreamSource defines an external repo that contributes content
 * to the flat plugin output. The sync and validation scripts iterate
 * over enabled sources.
 */

export interface UpstreamSource {
  /** Unique identifier: "core", "tea", etc. */
  id: string;
  /** GitHub org/repo (for cloning and release checks) */
  repo: string;
  /** Path relative to .upstream/ */
  localPath: string;
  /** Version tracking file at repo root (e.g. ".upstream-version") */
  versionFile: string;
  /** Whether this source is active */
  enabled: boolean;
  /** Path inside cloned repo to the workflows root */
  contentRoot: string;
  /** Path inside cloned repo to the agents directory */
  agentsRoot: string;
  /**
   * Whether contentRoot contains workflow dirs directly (true)
   * or has a category layer in between (false).
   * Core = false (src/bmm/workflows/<category>/<workflow>/)
   * TEA  = true  (src/workflows/testarch/<workflow>/)
   */
  flatWorkflows: boolean;

  // Source-specific overrides (inherit from core defaults if not set)
  /** Workflow names owned by another source (skip from this source's coverage) */
  skipWorkflows?: Set<string>;
  skipDirs?: Set<string>;
  skipContentFiles?: Set<string>;
  workflowWorkarounds?: Record<string, string>;
  pluginOnlySkills?: Set<string>;
  pluginOnlyAgents?: Set<string>;
  sharedFileTargets?: Record<string, string[]>;
  pluginOnlyData?: Set<string>;
}

export const UPSTREAM_SOURCES: UpstreamSource[] = [
  {
    id: 'core',
    repo: 'bmadcode/BMAD-METHOD',
    localPath: 'BMAD-METHOD',
    versionFile: '.upstream-version',
    enabled: true,
    contentRoot: 'src/bmm/workflows',
    agentsRoot: 'src/bmm/agents',
    flatWorkflows: false,
    // automate is owned by TEA module, not core
    skipWorkflows: new Set(['automate']),
    skipDirs: new Set(['_shared', 'templates', 'workflows']),
    skipContentFiles: new Set(['workflow.md', 'workflow.yaml', 'SKILL.md']),
    workflowWorkarounds: {},
    pluginOnlySkills: new Set(['help', 'init', 'status', 'brainstorming']),
    pluginOnlyAgents: new Set(['bmad-master', 'tech-writer']),
    sharedFileTargets: {
      'excalidraw-diagrams': [
        'create-dataflow',
        'create-diagram',
        'create-flowchart',
        'create-wireframe',
      ],
    },
    pluginOnlyData: new Set(['quick-dev/data/project-levels.yaml']),
  },
  {
    id: 'tea',
    repo: 'bmad-code-org/bmad-method-test-architecture-enterprise',
    localPath: 'bmad-tea',
    versionFile: '.upstream-version-tea',
    enabled: true,
    contentRoot: 'src/workflows/testarch',
    agentsRoot: 'src/agents',
    flatWorkflows: true,
    skipDirs: new Set(['_shared', 'templates']),
    skipContentFiles: new Set([
      'workflow.md',
      'workflow.yaml',
      'SKILL.md',
      // TEA validation reports are generated artifacts, not synced content
      'validation-report-20260127-095021.md',
      'validation-report-20260127-102401.md',
      'workflow-plan.md',
      'workflow-plan-teach-me-testing.md',
    ]),
    workflowWorkarounds: {},
    pluginOnlySkills: new Set(),
    pluginOnlyAgents: new Set(),
    sharedFileTargets: {},
    pluginOnlyData: new Set(),
  },
];

/** Get all enabled upstream sources */
export function getEnabledSources(): UpstreamSource[] {
  return UPSTREAM_SOURCES.filter((s) => s.enabled);
}

/** Get a source by ID */
export function getSource(id: string): UpstreamSource | undefined {
  return UPSTREAM_SOURCES.find((s) => s.id === id);
}

/** Get the core source (always present) */
export function getCoreSource(): UpstreamSource {
  const core = getSource('core');
  if (!core) throw new Error('Core upstream source not found');
  return core;
}
