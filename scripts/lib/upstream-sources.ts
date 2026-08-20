/**
 * Multi-upstream source registry — version tracking only.
 *
 * Pre-v6.5.0+ this file held a large `UpstreamSource` interface with
 * dozens of fields (`contentRoot`, `agentsRoot`, `flatWorkflows`,
 * `skipWorkflows`, `skipDirs`, `skipContentFiles`, `agentRefMappings`,
 * `pluginOnlySkills`, `pluginOnlyAgents`, `sharedFileTargets`,
 * `pluginOnlyData`, …) that were all consumed by the multi-source sync
 * pipeline. After the migration to installer-based sync (sync-from-
 * installer.ts), the installer is the source of truth — those fields
 * have no consumers.
 *
 * What remains is a flat module list with the GitHub repo handle
 * (for release tracking via the sync-upstream.yml GitHub Action) and
 * version helpers that read/write `.upstream-versions/<id>.json`.
 */

import { join } from 'node:path';
import { ROOT } from './config.ts';

export interface UpstreamSource {
  /** Unique identifier; also the `.upstream-versions/<id>.json` stem. */
  id: string;
  /** GitHub org/repo (used by sync-upstream.yml release watcher). */
  repo: string;
  /** Short label used in the README table and badge names. */
  label: string;
  /** Whether this source is active */
  enabled: boolean;
  /**
   * How the content reaches the plugin:
   *  - `core`     the installer itself (`npx bmad-method@<tag>`)
   *  - `registry` an official module in upstream's `bmad-modules.yaml`
   *  - `custom`   a real BMad module absent from that registry, cloned at
   *               a pinned tag and installed via `--custom-source`
   *  - `vendored` not installed at all; copied in as a plugin asset
   */
  kind: 'core' | 'registry' | 'custom' | 'vendored';
}

export const UPSTREAM_SOURCES: UpstreamSource[] = [
  {
    id: 'core',
    repo: 'bmad-code-org/BMAD-METHOD',
    label: 'BMAD Method',
    enabled: true,
    kind: 'core',
  },
  {
    id: 'tea',
    repo: 'bmad-code-org/bmad-method-test-architecture-enterprise',
    label: 'TEA',
    enabled: true,
    kind: 'registry',
  },
  {
    id: 'bmb',
    repo: 'bmad-code-org/bmad-builder',
    label: 'BMB',
    enabled: true,
    kind: 'registry',
  },
  {
    id: 'cis',
    repo: 'bmad-code-org/bmad-module-creative-intelligence-suite',
    label: 'CIS',
    enabled: true,
    kind: 'registry',
  },
  {
    id: 'gds',
    repo: 'bmad-code-org/bmad-module-game-dev-studio',
    label: 'GDS',
    enabled: true,
    kind: 'registry',
  },
  // Registry module as of core v6.11.0 (`bmad-modules.yaml`,
  // `code: bmad-loop`). Before that it needed a bespoke git clone; the id
  // matches the installer manifest name so version bumps resolve.
  {
    id: 'bmad-loop',
    repo: 'bmad-code-org/bmad-loop',
    label: 'Loop',
    enabled: true,
    kind: 'registry',
  },
  // Not in upstream's registry: installed from a pinned local clone via
  // the installer's `--custom-source` flag, shipped as its own plugin.
  {
    id: 'manticore',
    repo: 'bmad-code-org/bmad-manticore',
    label: 'Manticore',
    enabled: true,
    kind: 'custom',
  },
  // The module-authoring scaffold. Vendored into
  // `plugins/bmad/templates/module-template/`, never published as a
  // marketplace plugin — its own manifest points at a `skills/my-skill`
  // directory that upstream never committed. Pinned by commit because the
  // repo has no tags and no releases.
  {
    id: 'module-template',
    repo: 'bmad-code-org/bmad-module-template',
    label: 'Module template',
    enabled: true,
    kind: 'vendored',
  },
];

/** The module-authoring scaffold vendored as a plugin asset. */
export const MODULE_TEMPLATE_SOURCE = getSourceOrThrow('module-template');

// --- Version file helpers ---

const VERSIONS_DIR = join(ROOT, '.upstream-versions');

export interface VersionInfo {
  version: string;
  syncedAt: string; // YYYY-MM-DD
}

/** Path to a source's version file: .upstream-versions/<id>.json */
export function versionFilePath(id: string): string {
  return join(VERSIONS_DIR, `${id}.json`);
}

/** Read version info for a source. */
export async function readVersionInfo(id: string): Promise<VersionInfo> {
  return Bun.file(versionFilePath(id)).json();
}

/** Read just the version string for a source. */
export async function readVersion(id: string): Promise<string> {
  const info = await readVersionInfo(id);
  return info.version;
}

/** Write version info for a source, updating syncedAt to today. */
export async function writeVersionInfo(
  id: string,
  version: string,
): Promise<void> {
  const syncedAt = new Date().toISOString().slice(0, 10);
  const info: VersionInfo = { version, syncedAt };
  await Bun.write(versionFilePath(id), `${JSON.stringify(info, null, 2)}\n`);
}

/** Get all enabled upstream sources */
export function getEnabledSources(): UpstreamSource[] {
  return UPSTREAM_SOURCES.filter((s) => s.enabled);
}

/** Get a source by ID, or throw if the id is not registered. */
export function getSourceOrThrow(id: string): UpstreamSource {
  const source = UPSTREAM_SOURCES.find((s) => s.id === id);
  if (!source) throw new Error(`Upstream source '${id}' not found`);
  return source;
}
