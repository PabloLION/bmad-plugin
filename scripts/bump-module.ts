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
import { PLUGIN_JSON_PATH, ROOT } from './lib/config.ts';
import { gitInUpstream } from './lib/git-utils.ts';
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

const VERSION_FILES = {
  pluginVersion: join(ROOT, '.plugin-version'),
  packageJson: join(ROOT, 'package.json'),
  pluginJson: PLUGIN_JSON_PATH,
  marketplaceJson: join(ROOT, '.claude-plugin/marketplace.json'),
} as const;

const upstreamRoot = join(ROOT, '.upstream', source.localPath);

// --- Fetch tags ---

console.log(
  `Fetching tags from upstream ${source.id} (${source.localPath})...`,
);
try {
  await gitInUpstream(upstreamRoot, 'fetch', 'origin', '--tags');
} catch {
  console.error('⚠ Could not fetch tags (offline?). Using local tags only.');
}

// --- Resolve target module version ---

let targetTag: string;

if (TAG_OVERRIDE) {
  targetTag = TAG_OVERRIDE;
} else {
  const result = await gitInUpstream(upstreamRoot, 'tag', '--list');
  const semverPattern = /^v?\d+\.\d+/;
  const tags = result
    .text()
    .trim()
    .split('\n')
    .filter((t) => semverPattern.test(t));

  if (tags.length === 0) {
    console.error(`No semver tags found in upstream repo for ${source.id}.`);
    process.exit(1);
  }

  tags.sort((a, b) => {
    const normalize = (t: string): string => t.replace(/^v/, '');
    return normalize(a).localeCompare(normalize(b), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });

  // Non-null: length checked above
  targetTag = tags[tags.length - 1] as string;
}

// Ensure consistent v-prefix
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

// --- Confirm unless --yes ---

if (!YES) {
  process.stdout.write('Proceed? [y/N] ');
  const response = (await Bun.stdin.text()).trim().toLowerCase();
  if (response !== 'y' && response !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }
}

// --- Update module version file ---

await Bun.write(join(ROOT, source.versionFile), `${targetModuleTagPrefixed}\n`);
console.log(`Updated ${source.versionFile} to ${targetModuleTagPrefixed}`);

// --- Update .plugin-version ---

await Bun.write(VERSION_FILES.pluginVersion, `${newPluginVersionPrefixed}\n`);
console.log(`Updated .plugin-version to ${newPluginVersionPrefixed}`);

// --- Update JSON version files ---

for (const key of ['packageJson', 'pluginJson', 'marketplaceJson'] as const) {
  const path = VERSION_FILES[key];
  const content = await Bun.file(path).text();
  const updated = content.replace(
    `"version": "${currentPluginVersion}"`,
    `"version": "${newPluginVersion}"`,
  );
  if (updated === content) {
    console.error(
      `⚠ Warning: version "${currentPluginVersion}" not found in ${path}`,
    );
  }
  await Bun.write(path, updated);
}
console.log('Updated package.json, plugin.json, marketplace.json');

// --- Update README badges ---

await Bun.$`bun scripts/update-readme-version.ts`.quiet();
console.log('Updated README version badge');

// --- Summary ---

console.log(`\n✓ Bumped to ${newPluginVersionPrefixed}`);
console.log('\nNext steps:');
console.log(`  bun run sync -- --source ${source.id}`);
console.log(`  bun run generate:agents -- --source ${source.id}`);
console.log(`  bun run generate:skills -- --source ${source.id}`);
