/**
 * Bumps plugin version for a new core BMAD-METHOD release.
 *
 * Fetches tags from .upstream/BMAD-METHOD, finds the latest semver tag
 * (or uses --tag override), updates .upstream-version-core, derives
 * plugin version as v<core>.0, and updates all version files + README.
 *
 * Run: bun scripts/bump-core.ts [--tag <version>] [--dry-run] [--yes]
 *
 * Examples:
 *   bun run bump-core                    # fetch latest tag, bump to v<core>.0
 *   bun run bump-core -- --tag v6.0.2    # pin to specific tag
 *   bun run bump-core -- --dry-run       # preview only
 */

import { join } from 'node:path';
import {
  VERSION_FILES,
  confirmProceed,
  fetchLatestTag,
  updateJsonVersionFiles,
  updateReadmeBadge,
} from './lib/bump-utils.ts';
import { ROOT } from './lib/config.ts';
import { getCoreSource } from './lib/upstream-sources.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const YES = process.argv.includes('--yes');
const TAG_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--tag');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

const core = getCoreSource();
const upstreamRoot = join(ROOT, '.upstream', core.localPath);

// --- Resolve target version ---

const targetTag = await fetchLatestTag(upstreamRoot, TAG_OVERRIDE);
const targetVersion = targetTag.replace(/^v/, '');
const targetTagPrefixed = `v${targetVersion}`;

// --- Read current versions ---

const currentCoreRaw = (
  await Bun.file(join(ROOT, core.versionFile)).text()
).trim();
const currentCoreVersion = currentCoreRaw.replace(/^v/, '');

const currentPluginRaw = (
  await Bun.file(VERSION_FILES.pluginVersion).text()
).trim();
const currentPluginVersion = currentPluginRaw.replace(/^v/, '');

// New plugin version: <core>.0
const newPluginVersion = `${targetVersion}.0`;
const newPluginVersionPrefixed = `v${newPluginVersion}`;

// --- Show summary ---

console.log('');
console.log(`Core upstream:  ${currentCoreRaw} → ${targetTagPrefixed}`);
console.log(
  `Plugin version: ${currentPluginRaw} → ${newPluginVersionPrefixed}`,
);
console.log('');

if (currentCoreVersion === targetVersion) {
  console.log('Already at target core version — nothing to do.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[dry-run] Files that would change:');
  console.log(`  ${core.versionFile}`);
  for (const [label, path] of Object.entries(VERSION_FILES)) {
    console.log(`  ${label}: ${path}`);
  }
  console.log('  README.md (via update-readme)');
  console.log('\nNext steps (after running without --dry-run):');
  console.log('  bun run sync');
  console.log('  bun run generate:agents');
  console.log('  bun run generate:skills');
  process.exit(0);
}

// --- Confirm and apply ---

await confirmProceed(YES);

await Bun.write(join(ROOT, core.versionFile), `${targetTagPrefixed}\n`);
console.log(`Updated ${core.versionFile} to ${targetTagPrefixed}`);

await Bun.write(VERSION_FILES.pluginVersion, `${newPluginVersionPrefixed}\n`);
console.log(`Updated .plugin-version to ${newPluginVersionPrefixed}`);

await updateJsonVersionFiles(currentPluginVersion, newPluginVersion);
await updateReadmeBadge();

console.log(`\n✓ Bumped to ${newPluginVersionPrefixed}`);
console.log('\nNext steps:');
console.log('  bun run sync');
console.log('  bun run generate:agents');
console.log('  bun run generate:skills');
