/**
 * Upstream sync check: fetch tags and checkout the tracked release tag
 * for all enabled upstream sources.
 */

import { exists } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';
import { ROOT } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';
import { getEnabledSources } from '../upstream-sources.ts';

export async function checkSync(): Promise<void> {
  section('Sync Upstream');

  for (const source of getEnabledSources()) {
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    const upstreamExists = await exists(join(upstreamRoot, '.git'));
    if (!upstreamExists) {
      fail(
        `[${source.id}] Upstream repo not found at .upstream/${source.localPath} — run clone first`,
      );
      continue;
    }

    const versionFile = join(ROOT, source.versionFile);
    const trackedVersion = (await Bun.file(versionFile).text()).trim();
    // Try version as-is first, then without 'v' prefix (repos vary)
    const candidates = [trackedVersion, trackedVersion.replace(/^v/, '')];

    try {
      await $`git -C ${upstreamRoot} fetch --tags`.quiet();
      let checked = false;
      for (const tag of candidates) {
        try {
          await $`git -C ${upstreamRoot} checkout ${tag}`.quiet();
          pass(`[${source.id}] Checked out upstream tag ${tag}`);
          checked = true;
          break;
        } catch {
          // try next candidate
        }
      }
      if (!checked) {
        warn(
          `[${source.id}] Could not checkout tag ${trackedVersion} (tag missing)`,
        );
      }
    } catch {
      warn(`[${source.id}] Could not fetch tags (network error)`);
    }
  }
}
