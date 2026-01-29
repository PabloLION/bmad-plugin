/**
 * Updates the upstream version and sync date in README.md.
 * Reads from .upstream-version and writes between marker comments.
 *
 * Run: bun scripts/update-readme-version.ts
 */

import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const readmePath = join(ROOT, 'README.md');
const versionPath = join(ROOT, '.upstream-version');

const versionRaw = await Bun.file(versionPath).text();
const version = versionRaw.trim();
const today = new Date().toISOString().slice(0, 10);

const readme = await Bun.file(readmePath).text();
const updated = readme.replace(
  /<!-- upstream-version-start -->[\s\S]*?<!-- upstream-version-end -->/,
  `<!-- upstream-version-start -->\n**Upstream version:** ${version} | **Last synced:** ${today}\n<!-- upstream-version-end -->`,
);

if (updated === readme) {
  console.log('README.md already up to date or markers not found.');
} else {
  await Bun.write(readmePath, updated);
  console.log(`README.md updated: ${version}, synced ${today}`);
}
