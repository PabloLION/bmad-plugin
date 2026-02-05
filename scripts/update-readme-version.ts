/**
 * Updates the upstream and plugin versions plus sync date in README.md.
 * Reads from .upstream-version-core and .plugin-version, writes between marker
 * comments.
 *
 * Run: bun scripts/update-readme-version.ts
 */

import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const readmePath = join(ROOT, 'README.md');

const upstreamRaw = await Bun.file(join(ROOT, '.upstream-version-core')).text();
const upstreamVersion = upstreamRaw.trim();

const pluginRaw = await Bun.file(join(ROOT, '.plugin-version')).text();
const pluginVersion = pluginRaw.trim();

const today = new Date().toISOString().slice(0, 10);

const readme = await Bun.file(readmePath).text();
const updated = readme.replace(
  /<!-- upstream-version-start -->[\s\S]*?<!-- upstream-version-end -->/,
  `<!-- upstream-version-start -->\n**Plugin version:** ${pluginVersion} | **Upstream version:** ${upstreamVersion} | **Last synced:** ${today}\n<!-- upstream-version-end -->`,
);

if (updated === readme) {
  console.log('README.md already up to date or markers not found.');
} else {
  await Bun.write(readmePath, updated);
  console.log(
    `README.md updated: plugin=${pluginVersion}, upstream=${upstreamVersion}, synced ${today}`,
  );
}
