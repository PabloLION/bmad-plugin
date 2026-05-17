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
  /** Unique identifier: "core", "tea", "bmb", "cis", "gds" */
  id: string;
  /** GitHub org/repo (used by sync-upstream.yml release watcher) */
  repo: string;
  /** Whether this source is active */
  enabled: boolean;
}

export const UPSTREAM_SOURCES: UpstreamSource[] = [
  { id: 'core', repo: 'bmadcode/BMAD-METHOD', enabled: true },
  {
    id: 'tea',
    repo: 'bmad-code-org/bmad-method-test-architecture-enterprise',
    enabled: true,
  },
  { id: 'bmb', repo: 'bmad-code-org/bmad-builder', enabled: true },
  {
    id: 'cis',
    repo: 'bmad-code-org/bmad-module-creative-intelligence-suite',
    enabled: true,
  },
  {
    id: 'gds',
    repo: 'bmad-code-org/bmad-module-game-dev-studio',
    enabled: true,
  },
];

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
