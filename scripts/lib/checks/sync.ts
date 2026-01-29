/**
 * Upstream sync check: pull latest before validating.
 */

import { exists } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { UPSTREAM } from "../config.ts";
import { fail, pass, warn } from "../output.ts";

export async function checkSync(): Promise<void> {
  console.log("\n== Sync Upstream ==");

  const upstreamExists = await exists(join(UPSTREAM, ".git"));
  if (!upstreamExists) {
    fail("Upstream repo not found at .upstream/BMAD-METHOD — run clone first");
    return;
  }

  try {
    await $`git -C ${UPSTREAM} pull --ff-only`.quiet();
    pass("Pulled latest upstream");
  } catch {
    warn("Could not pull upstream (offline or no remote changes)");
  }
}
