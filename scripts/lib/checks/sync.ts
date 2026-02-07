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

/** Run git in an upstream repo, with BEADS_DIR set to avoid hook interference. */
function gitInUpstream(
  upstreamRoot: string,
  ...args: string[]
): ReturnType<typeof $> {
  const beadsDir = join(ROOT, '.beads');
  return $`BEADS_DIR=${beadsDir} git -C ${upstreamRoot} ${args}`.quiet();
}

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
      await gitInUpstream(upstreamRoot, 'fetch', '--tags');
    } catch {
      // Fetch may fail (offline, auth, private repo) — continue with local tags
    }

    let checked = false;
    for (const tag of candidates) {
      try {
        await gitInUpstream(upstreamRoot, 'checkout', tag);
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
  }
}
