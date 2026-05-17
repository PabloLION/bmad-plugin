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

    if (source.id === 'core') {
      coreVersion = trackedVersion;
    }

    pass(`[${source.id}] Version: ${trackedVersion}`);
  }

  // Validate plugin version is anchored to core: <core>.<patch>
  if (coreVersion) {
    const pluginRaw = await Bun.file(join(ROOT, '.plugin-version')).text();
    const pluginVersion = pluginRaw.trim();

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

    pass(`Plugin version: ${pluginVersion}`);
  }
}
