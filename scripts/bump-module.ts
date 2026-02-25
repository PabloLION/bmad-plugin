/**
 * Bumps plugin version for a new external module release (tea, bmb, cis, gds).
 *
 * Fetches tags from the module's upstream repo, finds the latest semver tag
 * (or uses --tag override), updates the module's version file, increments
 * the plugin's .X patch count, and updates all version files + README.
 *
 * Run: bun scripts/bump-module.ts --source <id> [--tag <version>] [--dry-run] [--yes]
 *
 * Examples:
 *   bun run bump-module -- --source tea              # fetch latest tag, increment .X
 *   bun run bump-module -- --source gds --tag v0.1.7 # pin to specific tag
 *   bun run bump-module -- --source tea --dry-run    # preview only
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
import { getSource } from './lib/upstream-sources.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const YES = process.argv.includes('--yes');
const SOURCE_ID = (() => {
  const idx = process.argv.indexOf('--source');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();
const TAG_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--tag');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

if (!SOURCE_ID) {
  console.error(
    'Usage: bun scripts/bump-module.ts --source <id> [--tag <version>] [--dry-run] [--yes]',
  );
  console.error('Sources: tea, bmb, cis, gds');
  process.exit(1);
}

if (SOURCE_ID === 'core') {
  console.error('Use bump-core.ts for core upstream bumps.');
  process.exit(1);
}

const source = getSource(SOURCE_ID);
if (!source) {
  console.error(`Unknown source: "${SOURCE_ID}"`);
  process.exit(1);
}

const upstreamRoot = join(ROOT, '.upstream', source.localPath);

// --- Resolve target module version ---

const targetTag = await fetchLatestTag(upstreamRoot, TAG_OVERRIDE);
const targetModuleVersion = targetTag.replace(/^v/, '');
const targetModuleTagPrefixed = `v${targetModuleVersion}`;

// --- Read current versions ---

const currentModuleRaw = (
  await Bun.file(join(ROOT, source.versionFile)).text()
).trim();
const currentModuleVersion = currentModuleRaw.replace(/^v/, '');

const currentPluginRaw = (
  await Bun.file(VERSION_FILES.pluginVersion).text()
).trim();
const currentPluginVersion = currentPluginRaw.replace(/^v/, '');

// Parse current plugin version to increment .X
// Format: <core>.<X> e.g. "6.0.0-Beta.8.1" → core="6.0.0-Beta.8", X=1
const lastDot = currentPluginVersion.lastIndexOf('.');
if (lastDot < 0) {
  console.error(`Cannot parse plugin version: ${currentPluginRaw}`);
  process.exit(1);
}
const coreBase = currentPluginVersion.slice(0, lastDot);
const currentPatch = Number.parseInt(
  currentPluginVersion.slice(lastDot + 1),
  10,
);
const newPatch = currentPatch + 1;
const newPluginVersion = `${coreBase}.${newPatch}`;
const newPluginVersionPrefixed = `v${newPluginVersion}`;

// --- Show summary ---

console.log('');
console.log(
  `Module ${source.id}: ${currentModuleRaw} → ${targetModuleTagPrefixed}`,
);
console.log(
  `Plugin version:  ${currentPluginRaw} → ${newPluginVersionPrefixed} (.X: ${currentPatch} → ${newPatch})`,
);
console.log('');

if (currentModuleVersion === targetModuleVersion) {
  console.log(`Already at target ${source.id} version — nothing to do.`);
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[dry-run] Files that would change:');
  console.log(`  ${source.versionFile}`);
  for (const [label, path] of Object.entries(VERSION_FILES)) {
    console.log(`  ${label}: ${path}`);
  }
  console.log('  README.md (via update-readme)');
  console.log(`\nNext steps (after running without --dry-run):`);
  console.log(`  bun run sync -- --source ${source.id}`);
  console.log(`  bun run generate:agents -- --source ${source.id}`);
  console.log(`  bun run generate:skills -- --source ${source.id}`);
  process.exit(0);
}

// --- Confirm and apply ---

await confirmProceed(YES);

await Bun.write(join(ROOT, source.versionFile), `${targetModuleTagPrefixed}\n`);
console.log(`Updated ${source.versionFile} to ${targetModuleTagPrefixed}`);

await Bun.write(VERSION_FILES.pluginVersion, `${newPluginVersionPrefixed}\n`);
console.log(`Updated .plugin-version to ${newPluginVersionPrefixed}`);

await updateJsonVersionFiles(currentPluginVersion, newPluginVersion);
await updateReadmeBadge();

console.log(`\n✓ Bumped to ${newPluginVersionPrefixed}`);
console.log('\nNext steps:');
console.log(`  bun run sync -- --source ${source.id}`);
console.log(`  bun run generate:agents -- --source ${source.id}`);
console.log(`  bun run generate:skills -- --source ${source.id}`);
