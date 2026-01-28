/**
 * Three-way validation: upstream BMAD-METHOD ↔ plugin files ↔ plugin.json.
 *
 * Checks:
 * 0. Upstream sync — pull latest upstream before validating
 * 1. Agent coverage — upstream agents ↔ plugin agent .md files
 * 2. Workflow/skill coverage — upstream workflows ↔ plugin skill directories
 * 3. Content consistency — shared files between upstream and plugin match
 * 4. Manifest consistency — plugin.json commands ↔ actual skill directories
 * 5. Version consistency — .upstream-version ↔ upstream package.json
 *
 * Known workarounds are documented in config.ts and printed with ⚠ markers.
 * Exit 0 = pass, Exit 1 = gaps found.
 */

import { AGENT_WORKAROUNDS, WORKFLOW_WORKAROUNDS } from "./lib/config.ts";
import { hasFailed, GREEN, RED, YELLOW, RESET } from "./lib/output.ts";
import {
  checkSync,
  checkAgents,
  checkWorkflows,
  checkContent,
  checkManifest,
  checkVersion,
} from "./lib/checks/index.ts";

console.log("Validating upstream coverage...");

await checkSync();
await checkAgents();
await checkWorkflows();
await checkContent();
await checkManifest();
await checkVersion();

const workaroundCount =
  Object.keys(AGENT_WORKAROUNDS).length +
  Object.keys(WORKFLOW_WORKAROUNDS).length;

console.log("");

if (hasFailed()) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else if (workaroundCount > 0) {
  console.log(
    `${GREEN}✓ All checks passed.${RESET} ${YELLOW}(${workaroundCount} workarounds — see ⚠ above)${RESET}`,
  );
} else {
  console.log(`${GREEN}✓ All checks passed — full alignment.${RESET}`);
}
