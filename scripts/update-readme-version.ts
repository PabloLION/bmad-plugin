/**
 * Updates the plugin version and multi-upstream dependency table in README.md.
 * Reads from all .upstream-version-* files and .plugin-version, writes between
 * marker comments.
 *
 * Run: bun scripts/update-readme-version.ts
 */

import { join } from 'node:path';
import { ROOT } from './lib/config.ts';
import { getEnabledSources } from './lib/upstream-sources.ts';

/** Display labels for upstream source IDs */
const SOURCE_LABELS: Record<string, string> = {
  core: 'Core',
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

async function getTagDate(localPath: string, version: string): Promise<string> {
  const result = Bun.spawnSync({
    cmd: ['git', 'tag', '-l', version, '--format=%(creatordate:short)'],
    cwd: join(ROOT, '.upstream', localPath),
  });
  const date = new TextDecoder().decode(result.stdout).trim();
  return date || 'unknown';
}

/** Date of the last commit that changed a version file (i.e. when we actually synced). */
function getLastSyncDate(versionFile: string): string {
  const result = Bun.spawnSync({
    cmd: ['git', 'log', '-1', '--format=%ai', '--', versionFile],
    cwd: ROOT,
  });
  const raw = new TextDecoder().decode(result.stdout).trim();
  // %ai gives "2026-02-10 12:34:56 +0100", take date part only
  return raw.split(' ')[0] || 'unknown';
}

const sources = getEnabledSources();
const rows: string[] = [];

for (const source of sources) {
  const version = (
    await Bun.file(join(ROOT, source.versionFile)).text()
  ).trim();
  const label = SOURCE_LABELS[source.id] ?? source.id.toUpperCase();
  const tagDate = await getTagDate(source.localPath, version);
  const syncDate = getLastSyncDate(source.versionFile);
  rows.push(
    `| ${label} | [${source.repo}](https://github.com/${source.repo}) | ${version} | ${tagDate} | ${syncDate} |`,
  );
}

const table = [
  '| Module | Repo | Version | Released | Last Synced |',
  '|---|---|---|---|---|',
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
  const version = (
    await Bun.file(join(ROOT, source.versionFile)).text()
  ).trim();
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
