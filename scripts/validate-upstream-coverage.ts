/**
 * Three-way validation: upstream BMAD-METHOD ↔ plugin files ↔ plugin.json.
 *
 * Checks:
 * 0. Upstream sync — pull latest upstream before validating
 * 1. Agent coverage — upstream agents ↔ plugin agent .md files
 * 2. Skill coverage — three-set: upstream workflows ↔ plugin directories ↔ manifest
 * 3. Content consistency — supporting files match (not SKILL.md vs workflow.md)
 * 4. Version consistency — .upstream-version-<id> ↔ upstream package.json
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
  checkSync,
  checkVersion,
  checkWorkflows,
} from './lib/checks/index.ts';
import {
  GREEN,
  hasFailed,
  RED,
  RESET,
  setVerbose,
  YELLOW,
} from './lib/output.ts';
import { getEnabledSources } from './lib/upstream-sources.ts';

setVerbose(process.argv.includes('--verbose'));

const sourceCount = getEnabledSources().length;
console.log(`Validating upstream coverage (${sourceCount} sources)...`);

await checkSync();
await checkAgents();
await checkWorkflows();
await checkContent();
await checkVersion();
// checkNaming() disabled — requires bmad- prefix workaround (claude-code#17271)
// which is inactive while using auto-discovery plugin.json format
await checkAgentSkills();

const workaroundCount = getEnabledSources().reduce(
  (sum, s) => sum + Object.keys(s.workflowWorkarounds ?? {}).length,
  0,
);

console.log('');

if (hasFailed()) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else if (workaroundCount > 0) {
  console.log(
    `${GREEN}✓ All upstream content covered.${RESET} ${YELLOW}(${workaroundCount} workarounds — see ⚠ above)${RESET}`,
  );
} else {
  console.log(
    `${GREEN}✓ All upstream content covered — agents, skills, and files in sync.${RESET}`,
  );
}
