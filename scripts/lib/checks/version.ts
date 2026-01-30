/**
 * Version consistency check for all upstream sources.
 *
 * Core: .upstream-version ↔ upstream package.json, plugin version anchored
 * External modules: .upstream-version-<id> tracks module version independently
 */

import { exists } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import { getEnabledSources } from '../upstream-sources.ts';

export async function checkVersion(): Promise<void> {
  section('Version Consistency');

  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const versionFilePath = join(ROOT, source.versionFile);

    if (!(await exists(versionFilePath))) {
      fail(`[${source.id}] Version file ${source.versionFile} not found`);
      continue;
    }

    const trackedVersion = (await Bun.file(versionFilePath).text()).trim();

    if (source.id === 'core') {
      // Core: compare against package.json
      const pkgJson = await Bun.file(join(upstreamRoot, 'package.json')).json();
      const upstreamVersion = `v${pkgJson.version}`;

      if (trackedVersion === upstreamVersion) {
        pass(`[core] Upstream version: ${trackedVersion}`);
      } else {
        fail(
          `[core] Version mismatch: ${source.versionFile}=${trackedVersion}, package.json=${upstreamVersion}`,
        );
      }

      // Validate plugin version is anchored to core
      const pluginRaw = await Bun.file(join(ROOT, '.plugin-version')).text();
      const pluginVersion = pluginRaw.trim();

      if (!pluginVersion.startsWith(`${trackedVersion}.`)) {
        fail(
          `Plugin version "${pluginVersion}" must start with upstream "${trackedVersion}."`,
        );
        continue;
      }

      const patch = pluginVersion.slice(trackedVersion.length + 1);
      if (!/^\d+$/.test(patch)) {
        fail(`Plugin version patch "${patch}" must be a non-negative integer`);
        continue;
      }

      pass(`Plugin version: ${pluginVersion}`);
    } else {
      // External modules: verify the version file has content
      if (trackedVersion) {
        pass(`[${source.id}] Version: ${trackedVersion}`);
      } else {
        warn(`[${source.id}] Version file ${source.versionFile} is empty`);
      }
    }
  }
}
