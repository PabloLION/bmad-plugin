/**
 * Git utilities for upstream repo operations.
 *
 * Shared by sync, bump-core, and bump-module scripts.
 */

import { join } from 'node:path';
import { ROOT } from './config.ts';

/** Run git in an upstream repo, with BEADS_DIR set to avoid hook interference. */
export function gitInUpstream(
  upstreamRoot: string,
  ...args: string[]
): ReturnType<typeof Bun.$> {
  const beadsDir = join(ROOT, '.beads');
  return Bun.$`BEADS_DIR=${beadsDir} git -C ${upstreamRoot} ${args}`.quiet();
}
