/**
 * Plugin validation.
 *
 * Pre-v6.5.0+ this script ran a three-way upstream-coverage check
 * (upstream files ↔ plugin files ↔ plugin.json manifest) plus content
 * consistency, agent matching, naming, etc. After the migration to
 * installer-based sync (sync-from-installer.ts), the installer is the
 * source of truth — there is nothing to cross-check against.
 *
 * What survives:
 * - Version consistency (per-module version files + plugin version
 *   anchoring).
 * - A sanity check that plugins/bmad/skills/ exists and is non-empty.
 *
 * Exit 0 = pass, exit 1 = gaps found.
 */

import { exists, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { checkVersion } from './lib/checks/index.ts';
import { PLUGIN } from './lib/config.ts';
import {
  fail,
  GREEN,
  hasFailed,
  pass,
  RED,
  RESET,
  section,
  setVerbose,
} from './lib/output.ts';

setVerbose(process.argv.includes('--verbose'));

console.log('Validating plugin (installer-sync mode)...\n');

// 1. Version consistency
await checkVersion();

// 2. Plugin tree sanity
section('Plugin Tree');
const skillsDir = join(PLUGIN, 'skills');
if (!(await exists(skillsDir))) {
  fail(`plugins/bmad/skills/ does not exist — run \`bun run sync\` first`);
} else {
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skillCount = entries.filter((e) => e.isDirectory()).length;
  if (skillCount === 0) {
    fail(`plugins/bmad/skills/ is empty — run \`bun run sync\` first`);
  } else {
    pass(`plugins/bmad/skills/ contains ${skillCount} skill directories`);
  }
}

console.log('');

if (hasFailed()) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ Plugin valid.${RESET}`);
}
