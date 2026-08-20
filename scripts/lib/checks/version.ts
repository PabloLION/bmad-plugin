/**
 * Version consistency check.
 *
 * Verifies that every .upstream-versions/<id>.json has a valid version
 * string and that the plugin version (.plugin-version) is anchored to
 * core (`<core>.<patch>` format).
 *
 * Pre-v6.5.0+ this also cross-checked against `.upstream/<repo>/package.json`
 * from the git clones; the installer-based sync no longer keeps those
 * clones, so the check now relies on .upstream-versions/ alone.
 */

import { exists } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import {
  getEnabledSources,
  readVersion,
  versionFilePath,
} from '../upstream-sources.ts';

export async function checkVersion(): Promise<void> {
  section('Version Consistency');

  let coreVersion: string | null = null;

  for (const source of getEnabledSources()) {
    const vfPath = versionFilePath(source.id);

    if (!(await exists(vfPath))) {
      fail(
        `[${source.id}] Version file .upstream-versions/${source.id}.json not found`,
      );
      continue;
    }

    const trackedVersion = await readVersion(source.id);

    if (!trackedVersion) {
      warn(
        `[${source.id}] Version file .upstream-versions/${source.id}.json is empty`,
      );
      continue;
    }

    // A vendored source has no upstream releases, so it is pinned by a
    // full commit SHA. Anything shorter (a branch name, a short SHA)
    // would make the bundle mutate under us.
    if (source.kind === 'vendored') {
      if (!/^[0-9a-f]{40}$/.test(trackedVersion)) {
        fail(
          `[${source.id}] vendored sources must pin a full 40-char commit SHA, got "${trackedVersion}"`,
        );
        continue;
      }
    } else if (!/^v\d/.test(trackedVersion)) {
      fail(
        `[${source.id}] expected a v-prefixed release tag, got "${trackedVersion}"`,
      );
      continue;
    }

    if (source.id === 'core') {
      coreVersion = trackedVersion;
    }

    pass(`[${source.id}] Version: ${trackedVersion}`);
  }

  // Validate plugin version is anchored to core: <core>.<patch>
  if (!coreVersion) return;

  const pluginVersion = (
    await Bun.file(join(ROOT, '.plugin-version')).text()
  ).trim();

  if (!pluginVersion.startsWith(`${coreVersion}.`)) {
    fail(
      `Plugin version "${pluginVersion}" must start with upstream "${coreVersion}."`,
    );
    return;
  }

  const patch = pluginVersion.slice(coreVersion.length + 1);
  if (!/^\d+$/.test(patch)) {
    fail(`Plugin version patch "${patch}" must be a non-negative integer`);
    return;
  }

  // All four anchors must agree. They are written by separate steps, so
  // an interrupted bump can leave `.plugin-version` ahead of the three
  // manifests — and because the manifests still agree with each other,
  // nothing else here would notice. The published marketplace would then
  // carry new content under the previous version, which Claude Code
  // never offers as an update.
  const unprefixed = pluginVersion.replace(/^v/, '');
  const anchors: Array<[string, string]> = [
    ['package.json', 'version'],
    ['plugins/bmad/.claude-plugin/plugin.json', 'version'],
  ];
  for (const [rel, key] of anchors) {
    const value = (await Bun.file(join(ROOT, rel)).json())[key];
    if (value !== unprefixed) {
      fail(`${rel} version is ${value}, but .plugin-version is ${unprefixed}`);
    }
  }

  const marketplace = await Bun.file(
    join(ROOT, '.claude-plugin/marketplace.json'),
  ).json();
  const bmadEntry = marketplace.plugins?.find(
    (p: { name: string }) => p.name === 'bmad',
  );
  if (bmadEntry?.version !== unprefixed) {
    fail(
      `marketplace.json bmad version is ${bmadEntry?.version}, but .plugin-version is ${unprefixed}`,
    );
  }

  pass(`Plugin version: ${pluginVersion} (all four anchors agree)`);
}
