/**
 * Version consistency check:
 * - .upstream-version ↔ upstream package.json
 * - .plugin-version starts with upstream version + has patch suffix
 */

import { join } from 'node:path';
import { ROOT, UPSTREAM } from '../config.ts';
import { fail, pass, section } from '../output.ts';

export async function checkVersion(): Promise<void> {
  section('Version Consistency');

  const upstreamRaw = await Bun.file(join(ROOT, '.upstream-version')).text();
  const upstreamFile = upstreamRaw.trim();

  const pkgJson = await Bun.file(join(UPSTREAM, 'package.json')).json();
  const upstreamVersion = `v${pkgJson.version}`;

  if (upstreamFile === upstreamVersion) {
    pass(`Upstream version: ${upstreamFile}`);
  } else {
    fail(
      `Version mismatch: .upstream-version=${upstreamFile}, upstream package.json=${upstreamVersion}`,
    );
  }

  // Validate plugin version
  const pluginRaw = await Bun.file(join(ROOT, '.plugin-version')).text();
  const pluginVersion = pluginRaw.trim();

  if (!pluginVersion.startsWith(`${upstreamFile}.`)) {
    fail(
      `Plugin version "${pluginVersion}" must start with upstream "${upstreamFile}."`,
    );
    return;
  }

  const patch = pluginVersion.slice(upstreamFile.length + 1);
  if (!/^\d+$/.test(patch)) {
    fail(`Plugin version patch "${patch}" must be a non-negative integer`);
    return;
  }

  pass(`Plugin version: ${pluginVersion}`);
}
