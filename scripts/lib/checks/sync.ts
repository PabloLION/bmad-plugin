/**
 * Upstream sync check: fetch tags and checkout the tracked release tag.
 */

import { exists } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';
import { ROOT, UPSTREAM } from '../config.ts';
import { fail, pass, section, warn } from '../output.ts';

export async function checkSync(): Promise<void> {
  section('Sync Upstream');

  const upstreamExists = await exists(join(UPSTREAM, '.git'));
  if (!upstreamExists) {
    fail('Upstream repo not found at .upstream/BMAD-METHOD — run clone first');
    return;
  }

  const versionFile = join(ROOT, '.upstream-version');
  const trackedVersion = (await Bun.file(versionFile).text()).trim();
  // Strip leading 'v' — upstream tags may not have it
  const tag = trackedVersion.replace(/^v/, '');

  try {
    await $`git -C ${UPSTREAM} fetch --tags`.quiet();
    await $`git -C ${UPSTREAM} checkout ${tag}`.quiet();
    pass(`Checked out upstream tag ${tag}`);
  } catch {
    warn(`Could not checkout upstream tag ${tag} (fetch failed or tag missing)`);
  }
}
