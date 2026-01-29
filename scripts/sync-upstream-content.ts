/**
 * Syncs supporting files from upstream BMAD-METHOD to plugin skills.
 *
 * Copies: step files, instructions, templates, checklists
 * Skips: workflow.md, workflow.yaml (plugin uses SKILL.md instead)
 *
 * Run: bun scripts/sync-upstream-content.ts
 */

import { cp, exists, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  PLUGIN,
  PLUGIN_JSON_PATH,
  ROOT,
  SHARED_FILE_TARGETS,
  SKIP_CONTENT_FILES,
  SKIP_DIRS,
  UPSTREAM,
  WORKFLOW_WORKAROUNDS,
} from './lib/config.ts';

const DOCUMENT_PROJECT = 'document-project';

const DRY_RUN = process.argv.includes('--dry-run');

async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(join(dir, entry.name));
      results.push(...subFiles.map((f) => `${entry.name}/${f}`));
    } else {
      results.push(entry.name);
    }
  }
  return results;
}

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
}

/** Process a single category's sub-workflows into pairs. */
async function processCategorySubWorkflows(
  workflowsRoot: string,
  catName: string,
  pairs: WorkflowSkillPair[],
): Promise<void> {
  const subs = await readdir(join(workflowsRoot, catName), {
    withFileTypes: true,
  });

  for (const sub of subs) {
    if (!sub.isDirectory() || SKIP_DIRS.has(sub.name)) {
      continue;
    }

    const skillName = WORKFLOW_WORKAROUNDS[sub.name] ?? sub.name;
    const skillPath = join(PLUGIN, 'skills', skillName);

    if (await exists(skillPath)) {
      pairs.push({
        upstreamDir: join(workflowsRoot, catName, sub.name),
        pluginDir: skillPath,
        label: skillName,
      });
    }
  }
}

async function getWorkflowSkillPairs(): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(UPSTREAM, 'src/bmm/workflows');
  const categories = await readdir(workflowsRoot, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) {
      continue;
    }

    if (cat.name === DOCUMENT_PROJECT) {
      const skillPath = join(PLUGIN, 'skills', DOCUMENT_PROJECT);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(workflowsRoot, cat.name),
          pluginDir: skillPath,
          label: DOCUMENT_PROJECT,
        });
      }
      continue;
    }

    await processCategorySubWorkflows(workflowsRoot, cat.name, pairs);
  }

  return pairs;
}

async function syncPair(pair: WorkflowSkillPair): Promise<number> {
  const upstreamFiles = await listFilesRecursive(pair.upstreamDir);
  let count = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;

    // Skip workflow definition files (plugin uses SKILL.md instead)
    if (SKIP_CONTENT_FILES.has(fileName)) {
      continue;
    }

    const srcPath = join(pair.upstreamDir, relPath);
    const destPath = join(pair.pluginDir, relPath);

    if (DRY_RUN) {
      console.log(`  [dry-run] ${relPath}`);
    } else {
      // Ensure parent directory exists
      const destDir = dirname(destPath);
      await Bun.$`mkdir -p ${destDir}`.quiet();

      // Copy file
      await cp(srcPath, destPath, { force: true });
    }
    count++;
  }

  return count;
}

/** Copy a single shared file to _shared/ and distribute to target skills. */
async function syncSharedFile(
  srcPath: string,
  relPath: string,
  pluginSharedDir: string,
  targetSkills: string[],
): Promise<number> {
  let count = 0;

  const sharedDest = join(pluginSharedDir, relPath);
  if (DRY_RUN) {
    console.log(`  [dry-run] _shared/${relPath}`);
  } else {
    await Bun.$`mkdir -p ${dirname(sharedDest)}`.quiet();
    await cp(srcPath, sharedDest, { force: true });
  }
  count++;

  for (const skill of targetSkills) {
    const skillDest = join(PLUGIN, 'skills', skill, 'data', relPath);
    if (DRY_RUN) {
      console.log(`  [dry-run] ${skill}/data/${relPath}`);
    } else {
      await Bun.$`mkdir -p ${dirname(skillDest)}`.quiet();
      await cp(srcPath, skillDest, { force: true });
    }
    count++;
  }

  return count;
}

console.log(DRY_RUN ? 'Dry run — no files will be copied\n' : 'Syncing...\n');

const allPairs = await getWorkflowSkillPairs();
let totalFiles = 0;

for (const pair of allPairs) {
  console.log(`Syncing: ${pair.label}`);
  const count = await syncPair(pair);
  totalFiles += count;
  if (!DRY_RUN) {
    console.log(`  ✓ ${count} files copied`);
  }
}

console.log(
  `\nTotal: ${totalFiles} files ${DRY_RUN ? 'would be' : ''} synced.`,
);

// Sync _shared/ directories and distribute to target skills
const sharedWorkflowsRoot = join(UPSTREAM, 'src/bmm/workflows');
let sharedCount = 0;

for (const [category, targetSkills] of Object.entries(SHARED_FILE_TARGETS)) {
  const sharedDir = join(sharedWorkflowsRoot, category, '_shared');
  if (!(await exists(sharedDir))) {
    continue;
  }

  const sharedFiles = await listFilesRecursive(sharedDir);
  const pluginSharedDir = join(PLUGIN, '_shared');

  for (const relPath of sharedFiles) {
    const srcPath = join(sharedDir, relPath);
    sharedCount += await syncSharedFile(
      srcPath,
      relPath,
      pluginSharedDir,
      targetSkills,
    );
  }

  console.log(
    `Shared: ${category}/_shared/ → _shared/ + ${targetSkills.length} skills`,
  );
}

if (sharedCount > 0) {
  console.log(`Shared files: ${sharedCount} copies synced.`);
}

// Update version files
if (!DRY_RUN) {
  const pkgJson = await Bun.file(join(UPSTREAM, 'package.json')).json();
  const newUpstream = `v${pkgJson.version}`;
  await Bun.write(join(ROOT, '.upstream-version'), `${newUpstream}\n`);
  console.log(`\nUpdated .upstream-version to ${newUpstream}`);

  // Bump plugin version: <upstream>.0 (reset patch on upstream change)
  const newPlugin = `${newUpstream}.0`;
  await Bun.write(join(ROOT, '.plugin-version'), `${newPlugin}\n`);
  console.log(`Updated .plugin-version to ${newPlugin}`);

  // Update package.json version (strip leading v)
  const pluginVersionNov = newPlugin.slice(1);
  const localPkg = await Bun.file(join(ROOT, 'package.json')).json();
  localPkg.version = pluginVersionNov;
  await Bun.write(
    join(ROOT, 'package.json'),
    `${JSON.stringify(localPkg, null, 2)}\n`,
  );
  console.log(`Updated package.json version to ${pluginVersionNov}`);

  // Update plugin manifest version
  const manifestJson = await Bun.file(PLUGIN_JSON_PATH).json();
  manifestJson.version = pluginVersionNov;
  await Bun.write(
    PLUGIN_JSON_PATH,
    `${JSON.stringify(manifestJson, null, 2)}\n`,
  );
  console.log(`Updated plugin.json version to ${pluginVersionNov}`);

  // Update README badge
  await Bun.$`bun scripts/update-readme-version.ts`.quiet();
  console.log('Updated README version badge');
}
