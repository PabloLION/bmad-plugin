/**
 * Shared utilities for bump-core.ts and bump-module.ts.
 *
 * Centralizes version file paths, tag fetching, JSON version updates,
 * README badge updates, and confirmation prompts.
 */

import { join } from 'node:path';
import { PLUGIN_JSON_PATH, ROOT } from './config.ts';
import { gitInUpstream } from './git-utils.ts';

/** All files that contain the plugin version string. */
export const VERSION_FILES = {
  pluginVersion: join(ROOT, '.plugin-version'),
  packageJson: join(ROOT, 'package.json'),
  pluginJson: PLUGIN_JSON_PATH,
  marketplaceJson: join(ROOT, '.claude-plugin/marketplace.json'),
} as const;

/**
 * Fetch and resolve the latest semver tag from an upstream repo.
 * Returns the tag string (with original prefix). Uses --tag override if provided.
 */
export async function fetchLatestTag(
  upstreamRoot: string,
  tagOverride?: string,
): Promise<string> {
  console.log('Fetching tags...');
  try {
    await gitInUpstream(upstreamRoot, 'fetch', 'origin', '--tags');
  } catch {
    console.error('⚠ Could not fetch tags (offline?). Using local tags only.');
  }

  if (tagOverride) return tagOverride;

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
  return tags[tags.length - 1] as string;
}

/** Update all JSON version files from currentVersion to newVersion. */
export async function updateJsonVersionFiles(
  currentVersion: string,
  newVersion: string,
): Promise<void> {
  for (const key of ['packageJson', 'pluginJson', 'marketplaceJson'] as const) {
    const path = VERSION_FILES[key];
    const content = await Bun.file(path).text();
    const updated = content.replace(
      `"version": "${currentVersion}"`,
      `"version": "${newVersion}"`,
    );
    if (updated === content) {
      console.error(
        `⚠ Warning: version "${currentVersion}" not found in ${path}`,
      );
    }
    await Bun.write(path, updated);
  }
  console.log('Updated package.json, plugin.json, marketplace.json');
}

/** Update README version badge via the dedicated script. */
export async function updateReadmeBadge(): Promise<void> {
  await Bun.$`bun scripts/update-readme-version.ts`.quiet();
  console.log('Updated README version badge');
}

/** Prompt user for confirmation. Exits if declined. */
export async function confirmProceed(yes: boolean): Promise<void> {
  if (yes) return;
  process.stdout.write('Proceed? [y/N] ');
  const response = (await Bun.stdin.text()).trim().toLowerCase();
  if (response !== 'y' && response !== 'yes') {
    console.log('Aborted.');
    process.exit(0);
  }
}
