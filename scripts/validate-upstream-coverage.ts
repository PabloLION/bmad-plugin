/**
 * Three-way validation: upstream BMAD-METHOD ↔ plugin files ↔ plugin.json.
 *
 * Checks:
 * 0. Upstream sync — pull latest upstream before validating
 * 1. Agent coverage — upstream agents ↔ plugin agent .md files
 * 2. Skill coverage — three-set: upstream workflows ↔ plugin directories ↔ manifest
 * 3. Content consistency — supporting files match (not SKILL.md vs workflow.md)
 * 4. Version consistency — .upstream-version ↔ upstream package.json
 * 5. Naming consistency — SKILL.md frontmatter name ↔ directory name
 * 6. Agent–skill cross-reference — agent menu workflows ↔ plugin skill dirs
 *
 * Known workarounds are documented in config.ts and printed with ⚠ markers.
 * Exit 0 = pass, Exit 1 = gaps found.
 */

import {
  checkAgentSkills,
  checkAgents,
  checkContent,
  checkNaming,
  checkSync,
  checkVersion,
  checkWorkflows,
} from './lib/checks/index.ts';
import { AGENT_WORKAROUNDS, WORKFLOW_WORKAROUNDS } from './lib/config.ts';
import {
  GREEN,
  hasFailed,
  RED,
  RESET,
  setVerbose,
  YELLOW,
} from './lib/output.ts';

setVerbose(process.argv.includes('--verbose'));

console.log('Validating BMAD-METHOD coverage...');

await checkSync();
await checkAgents();
await checkWorkflows();
await checkContent();
await checkVersion();
await checkNaming();
await checkAgentSkills();

const workaroundCount =
  Object.keys(AGENT_WORKAROUNDS).length +
  Object.keys(WORKFLOW_WORKAROUNDS).length;

console.log('');

if (hasFailed()) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else if (workaroundCount > 0) {
  console.log(
    `${GREEN}✓ All BMAD-METHOD content covered.${RESET} ${YELLOW}(${workaroundCount} workarounds — see ⚠ above)${RESET}`,
  );
} else {
  console.log(
    `${GREEN}✓ All BMAD-METHOD content covered — agents, skills, and files in sync.${RESET}`,
  );
}
