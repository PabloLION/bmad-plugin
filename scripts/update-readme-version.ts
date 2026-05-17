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
} from './lib/upstream-sources.ts';

/** Display labels for upstream source IDs */
const SOURCE_LABELS: Record<string, string> = {
  core: 'BMAD Method',
  tea: 'TEA',
  bmb: 'BMB',
  cis: 'CIS',
  gds: 'GDS',
};

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/PabloLION/bmad-plugin/main';

const readmePath = join(ROOT, 'README.md');

const pluginVersion = (
  await Bun.file(join(ROOT, '.plugin-version')).text()
).trim();

const sources = getEnabledSources();
const rows: string[] = [];

for (const source of sources) {
  const info = await readVersionInfo(source.id);
  const label = SOURCE_LABELS[source.id] ?? source.id.toUpperCase();
  rows.push(
    `| [${label}](https://github.com/${source.repo}) | ${info.version} | ${info.syncedAt} |`,
  );
}

const table = [
  '| Module | Version | Last Checked |',
  '|---|---|---|',
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
  const label = SOURCE_LABELS[source.id] ?? source.id.toUpperCase();
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
  const version = await readVersion(source.id);
  const badgeFile =
    source.id === 'core'
      ? 'upstream-version.json'
      : `upstream-version-${source.id}.json`;
  const badgePath = join(BADGES_DIR, badgeFile);
  const badge = await Bun.file(badgePath).json();
  badge.message = version;
  await Bun.write(badgePath, `${JSON.stringify(badge, null, 2)}\n`);
}

console.log(`Badge files updated for ${sources.length} upstream sources.`);
