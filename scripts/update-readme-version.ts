/**
 * Updates the plugin version, dependency-table, and badges in README.md.
 * Reads from .upstream-versions/<id>.json and .plugin-version, writes
 * between marker comments.
 *
 * Pre-v6.5.0+ this also pulled the upstream tag date from a local git
 * clone of each upstream repo. After the migration to installer-based
 * sync we no longer keep those clones, so the table now shows
 * Version + Last-Checked only (the upstream tag date is one click away
 * via the linked module name).
 *
 * Run: bun scripts/update-readme-version.ts
 */

import { join } from 'node:path';
import { ROOT } from './lib/config.ts';
import {
  getEnabledSources,
  readVersion,
  readVersionInfo,
  type UpstreamSource,
} from './lib/upstream-sources.ts';

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/tgorka/bmad-plugin/main';

const readmePath = join(ROOT, 'README.md');

const pluginVersion = (
  await Bun.file(join(ROOT, '.plugin-version')).text()
).trim();

const sources = getEnabledSources();
const rows: string[] = [];

/**
 * A vendored source is pinned by commit (no upstream tags exist), so the
 * table and badge show an abbreviated SHA rather than 40 hex characters.
 */
const DELIVERY: Record<UpstreamSource['kind'], string> = {
  core: 'installer',
  registry: 'installer module',
  custom: 'custom source',
  vendored: 'vendored asset',
};

function displayVersion(source: UpstreamSource, version: string): string {
  return source.kind === 'vendored' ? version.slice(0, 8) : version;
}

for (const source of sources) {
  const info = await readVersionInfo(source.id);
  rows.push(
    `| [${source.label}](https://github.com/${source.repo}) | ${displayVersion(source, info.version)} | ${DELIVERY[source.kind]} | ${info.syncedAt} |`,
  );
}

const table = [
  '| Module | Version | Delivery | Last Checked |',
  '|---|---|---|---|',
  ...rows,
].join('\n');

const replacement = [
  '<!-- upstream-version-start -->',
  `**Plugin version:** ${pluginVersion}`,
  '',
  table,
  '<!-- upstream-version-end -->',
].join('\n');

// --- Badge markdown generation ---
const badgeLines: string[] = [];
for (const source of sources) {
  const badgeFile =
    source.id === 'core'
      ? 'upstream-version.json'
      : `upstream-version-${source.id}.json`;
  const label = source.label;
  const badgeLabel =
    source.id === 'core' ? 'BMAD Method version' : `${label} Module version`;
  const badgeUrl = `https://img.shields.io/endpoint?url=${GITHUB_RAW_BASE}/.github/badges/${badgeFile}`;
  const linkUrl = `https://github.com/${source.repo}`;
  badgeLines.push(`[![${badgeLabel}](${badgeUrl})](${linkUrl})`);
}

const badgeReplacement = [
  '<!-- upstream-badges-start -->',
  ...badgeLines,
  '<!-- upstream-badges-end -->',
].join('\n');

// --- Apply replacements ---
const readme = await Bun.file(readmePath).text();
let updated = readme.replace(
  /<!-- upstream-badges-start -->[\s\S]*?<!-- upstream-badges-end -->/,
  badgeReplacement,
);
updated = updated.replace(
  /<!-- upstream-version-start -->[\s\S]*?<!-- upstream-version-end -->/,
  replacement,
);

if (updated === readme) {
  console.log('README.md already up to date or markers not found.');
} else {
  await Bun.write(readmePath, updated);
  console.log(
    `README.md updated: plugin=${pluginVersion}, ${sources.length} upstream badges and table rows`,
  );
}

const BADGES_DIR = join(ROOT, '.github', 'badges');

for (const source of sources) {
  const version = displayVersion(source, await readVersion(source.id));
  const badgeFile =
    source.id === 'core'
      ? 'upstream-version.json'
      : `upstream-version-${source.id}.json`;
  const badgePath = join(BADGES_DIR, badgeFile);
  // Generated from the registry, so a newly registered source does not
  // need a hand-authored badge file first.
  const badge = (await Bun.file(badgePath).exists())
    ? await Bun.file(badgePath).json()
    : {
        schemaVersion: 1,
        label: source.id === 'core' ? 'BMAD Method' : `${source.label} Module`,
        color: 'green',
      };
  badge.message = version;
  await Bun.write(badgePath, `${JSON.stringify(badge, null, 2)}\n`);
}

console.log(`Badge files updated for ${sources.length} upstream sources.`);
