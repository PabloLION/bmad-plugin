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
import { PLUGIN_JSON_PATH, ROOT } from './lib/config.ts';
import { gitInUpstream } from './lib/git-utils.ts';
import { getCoreSource } from './lib/upstream-sources.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const YES = process.argv.includes('--yes');
const TAG_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--tag');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

const VERSION_FILES = {
  pluginVersion: join(ROOT, '.plugin-version'),
  packageJson: join(ROOT, 'package.json'),
  pluginJson: PLUGIN_JSON_PATH,
  marketplaceJson: join(ROOT, '.claude-plugin/marketplace.json'),
} as const;

const core = getCoreSource();
const upstreamRoot = join(ROOT, '.upstream', core.localPath);

// --- Fetch tags ---

console.log('Fetching tags from upstream BMAD-METHOD...');
try {
  await gitInUpstream(upstreamRoot, 'fetch', 'origin', '--tags');
} catch {
  console.error('⚠ Could not fetch tags (offline?). Using local tags only.');
}

// --- Resolve target version ---

let targetTag: string;

if (TAG_OVERRIDE) {
  targetTag = TAG_OVERRIDE;
} else {
  // List all tags, filter to semver-like, sort, pick latest
  const result = await gitInUpstream(upstreamRoot, 'tag', '--list');
  const semverPattern = /^v?\d+\.\d+/;
  const tags = result
    .text()
    .trim()
    .split('\n')
    .filter((t) => semverPattern.test(t));

  if (tags.length === 0) {
    console.error('No semver tags found in upstream repo.');
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

// --- Confirm unless --yes ---

if (!YES) {
  process.stdout.write('Proceed? [y/N] ');
  const response = (await Bun.stdin.text()).trim().toLowerCase();
  if (response !== 'y' && response !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }
}

// --- Update .upstream-version-core ---

await Bun.write(join(ROOT, core.versionFile), `${targetTagPrefixed}\n`);
console.log(`Updated ${core.versionFile} to ${targetTagPrefixed}`);

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
console.log('  bun run sync');
console.log('  bun run generate:agents');
console.log('  bun run generate:skills');
