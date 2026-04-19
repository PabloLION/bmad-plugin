/**
 * Detects and removes orphaned skill directories.
 *
 * Upstream repos renamed skills (e.g., `create-epics-and-stories` →
 * `bmad-create-epics-and-stories`, `agent` → `bmad-agent-builder`). This
 * left old dirs orphaned. This script builds the set of valid skill names
 * from all upstream sources and plugin-only skills, then removes any
 * skill dir that is not in that set.
 *
 * Run: bun scripts/clean-orphaned-skills.ts [--dry-run]
 */

import { exists, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN } from './lib/config.ts';
import { getCoreSource, getEnabledSources } from './lib/upstream-sources.ts';
import { getWorkflowEntries } from './lib/workflow-iterator.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = join(import.meta.dir, '..');
const SKILLS_DIR = join(PLUGIN, 'skills');

/**
 * Build a set of all valid skill names by iterating upstream sources.
 * Includes plugin-only skills and agent ref mapped names.
 */
async function getValidSkillNames(): Promise<Set<string>> {
  const valid = new Set<string>();

  for (const source of getEnabledSources()) {
    for (const name of source.pluginOnlySkills ?? []) {
      valid.add(name);
    }

    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    if (!(await exists(join(upstreamRoot, '.git')))) continue;

    const entries = await getWorkflowEntries(source, upstreamRoot);
    for (const entry of entries) {
      valid.add(entry.skillName);
    }
  }

  // Core skills synced outside the normal contentRoot.
  // Historical paths: src/core/skills/ then src/core/workflows/ — both long
  // since removed upstream. Current path (v6.2.x+) is src/core-skills/ which
  // is what sync-upstream-content.ts's syncCoreExtras() uses.
  const coreSource = getCoreSource();
  const coreRoot = join(ROOT, '.upstream', coreSource.localPath);
  const candidateExtrasDirs = [
    join(coreRoot, 'src/core-skills'),
    join(coreRoot, 'src/core/skills'),
    join(coreRoot, 'src/core/workflows'),
  ];

  for (const dir of candidateExtrasDirs) {
    if (!(await exists(dir))) continue;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) valid.add(entry.name);
    }
  }

  return valid;
}

// === Main ===

console.log(DRY_RUN ? 'Dry run — no files will be removed\n' : 'Cleaning...\n');

const validNames = await getValidSkillNames();
console.log(`Valid skill names (${validNames.size}):`);
for (const name of [...validNames].sort()) {
  console.log(`  ${name}`);
}

const dirEntries = await readdir(SKILLS_DIR, { withFileTypes: true });
const onDisk = dirEntries
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const orphaned = onDisk.filter((name) => !validNames.has(name));

if (orphaned.length === 0) {
  console.log('\nNo orphaned skill directories found.');
  process.exit(0);
}

console.log(`\nOrphaned directories (${orphaned.length}):\n`);
for (const name of orphaned) {
  if (DRY_RUN) {
    console.log(`  [dry-run] ${name}`);
  } else {
    await rm(join(SKILLS_DIR, name), { recursive: true });
    console.log(`  ✓ Removed: ${name}`);
  }
}

console.log(
  `\n${orphaned.length} directories ${DRY_RUN ? 'would be' : ''} removed.`,
);
