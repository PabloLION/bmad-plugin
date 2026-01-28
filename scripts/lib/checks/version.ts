/**
 * Version consistency check: .upstream-version ↔ upstream package.json.
 */

import { join } from "node:path";
import { ROOT, UPSTREAM } from "../config.ts";
import { pass, fail } from "../output.ts";

export async function checkVersion(): Promise<void> {
  console.log("\n== Version Consistency ==");

  const versionFile = (
    await Bun.file(join(ROOT, ".upstream-version")).text()
  ).trim();

  const pkgJson = await Bun.file(join(UPSTREAM, "package.json")).json();
  const upstreamVersion = `v${pkgJson.version}`;

  if (versionFile === upstreamVersion) {
    pass(`Version: ${versionFile}`);
  } else {
    fail(
      `Version mismatch: .upstream-version=${versionFile}, upstream package.json=v${pkgJson.version}`,
    );
  }
}
