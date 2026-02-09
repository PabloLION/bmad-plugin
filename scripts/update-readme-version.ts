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

const readmePath = join(ROOT, 'README.md');

const pluginVersion = (
  await Bun.file(join(ROOT, '.plugin-version')).text()
).trim();

const today = new Date().toISOString().slice(0, 10);

const sources = getEnabledSources();
const rows: string[] = [];

for (const source of sources) {
  const version = (
    await Bun.file(join(ROOT, source.versionFile)).text()
  ).trim();
  const label = SOURCE_LABELS[source.id] ?? source.id.toUpperCase();
  rows.push(`| ${label} | ${source.repo} | ${version} | ${today} |`);
}

const table = [
  '| Module | Repo | Version | Last Synced |',
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

const readme = await Bun.file(readmePath).text();
const updated = readme.replace(
  /<!-- upstream-version-start -->[\s\S]*?<!-- upstream-version-end -->/,
  replacement,
);

if (updated === readme) {
  console.log('README.md already up to date or markers not found.');
} else {
  await Bun.write(readmePath, updated);
  console.log(
    `README.md updated: plugin=${pluginVersion}, ${sources.length} upstream sources`,
  );
}
