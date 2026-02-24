/**
 * Syncs supporting files from upstream sources to plugin skills.
 *
 * Iterates all enabled upstream sources (core, tea, etc.) and copies
 * step files, instructions, templates, checklists into plugin skill dirs.
 * Skips workflow.md, workflow.yaml (plugin uses SKILL.md instead).
 *
 * Run: bun scripts/sync-upstream-content.ts
 */

import { cp, exists, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PLUGIN, PLUGIN_JSON_PATH, ROOT } from './lib/config.ts';
import { gitInUpstream } from './lib/git-utils.ts';
import {
  type WorkflowMap,
  buildWorkflowMap,
  isTextFile,
  rewriteFileContent,
} from './lib/path-rewriter.ts';
import type { UpstreamSource } from './lib/upstream-sources.ts';
import {
  getCoreSource,
  getEnabledSources,
  getSource,
  shouldSkipContentFile,
} from './lib/upstream-sources.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_FILTER = (() => {
  const idx = process.argv.indexOf('--source');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

/** Accumulated path rewrite statistics. */
const rewriteStats = {
  filesRewritten: 0,
  totalChanges: 0,
  warnings: [] as string[],
};

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

/**
 * Copy a file, applying path rewrites for text files.
 * Binary files are copied with cp(). Text files are read, rewritten, and written.
 */
async function copyWithRewrite(
  srcPath: string,
  destPath: string,
  map: WorkflowMap,
): Promise<void> {
  const destDir = dirname(destPath);
  await Bun.$`mkdir -p ${destDir}`.quiet();

  if (isTextFile(srcPath)) {
    const content = await Bun.file(srcPath).text();
    const result = rewriteFileContent(content, map);
    await Bun.write(destPath, result.content);
    if (result.changeCount > 0) {
      rewriteStats.filesRewritten++;
      rewriteStats.totalChanges += result.changeCount;
    }
    if (result.warnings.length > 0) {
      rewriteStats.warnings.push(...result.warnings);
    }
  } else {
    await cp(srcPath, destPath, { force: true });
  }
}

interface WorkflowSkillPair {
  upstreamDir: string;
  pluginDir: string;
  label: string;
}

/** Get workflow→skill pairs for a flat source (workflow dirs directly under contentRoot). */
async function getFlatWorkflowPairs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  const entries = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const entry of entries) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    if (skipWorkflows.has(entry.name)) continue;

    const skillName = workarounds[entry.name] ?? entry.name;
    const skillPath = join(PLUGIN, 'skills', skillName);
    if (await exists(skillPath)) {
      pairs.push({
        upstreamDir: join(workflowsRoot, entry.name),
        pluginDir: skillPath,
        label: `[${source.id}] ${skillName}`,
      });
    }
  }
  return pairs;
}

/** Check if a directory is a leaf workflow (has workflow.yaml or workflow.md). */
async function isLeafWorkflow(dir: string): Promise<boolean> {
  if (await exists(join(dir, 'workflow.yaml'))) return true;
  if (await exists(join(dir, 'workflow.md'))) return true;
  return false;
}

/** Get workflow→skill pairs for a categorized source (category → workflow structure). */
async function getCategorizedWorkflowPairs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowSkillPair[]> {
  const pairs: WorkflowSkillPair[] = [];
  const workflowsRoot = join(upstreamRoot, source.contentRoot);
  const categories = await readdir(workflowsRoot, { withFileTypes: true });
  const skipDirs = source.skipDirs ?? new Set();
  const skipWorkflows = source.skipWorkflows ?? new Set();
  const workarounds = source.workflowWorkarounds ?? {};

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    const catDir = join(workflowsRoot, cat.name);

    // Leaf workflow at top level (has workflow.yaml or workflow.md)
    if (await isLeafWorkflow(catDir)) {
      if (skipWorkflows.has(cat.name)) continue;
      const skillName = workarounds[cat.name] ?? cat.name;
      const skillPath = join(PLUGIN, 'skills', skillName);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: catDir,
          pluginDir: skillPath,
          label: `[${source.id}] ${skillName}`,
        });
      }
      continue;
    }

    // Category directory — iterate sub-workflows
    const subs = await readdir(catDir, { withFileTypes: true });
    for (const sub of subs) {
      if (!sub.isDirectory() || skipDirs.has(sub.name)) continue;
      if (skipWorkflows.has(sub.name)) continue;

      const skillName = workarounds[sub.name] ?? sub.name;
      const skillPath = join(PLUGIN, 'skills', skillName);
      if (await exists(skillPath)) {
        pairs.push({
          upstreamDir: join(catDir, sub.name),
          pluginDir: skillPath,
          label: `[${source.id}] ${skillName}`,
        });
      }
    }
  }
  return pairs;
}

/** Get all workflow→skill pairs for a source. */
async function getWorkflowSkillPairs(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<WorkflowSkillPair[]> {
  if (source.flatWorkflows) {
    return getFlatWorkflowPairs(source, upstreamRoot);
  }
  return getCategorizedWorkflowPairs(source, upstreamRoot);
}

async function syncPair(
  pair: WorkflowSkillPair,
  source: UpstreamSource,
  map: WorkflowMap,
): Promise<number> {
  const upstreamFiles = await listFilesRecursive(pair.upstreamDir);
  let count = 0;

  for (const relPath of upstreamFiles) {
    const fileName = relPath.split('/').at(-1) ?? relPath;

    if (shouldSkipContentFile(source, fileName)) continue;

    const srcPath = join(pair.upstreamDir, relPath);
    const destPath = join(pair.pluginDir, relPath);

    if (DRY_RUN) {
      console.log(`  [dry-run] ${relPath}`);
    } else {
      await copyWithRewrite(srcPath, destPath, map);
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
  map: WorkflowMap,
): Promise<number> {
  let count = 0;

  const sharedDest = join(pluginSharedDir, relPath);
  if (DRY_RUN) {
    console.log(`  [dry-run] _shared/${relPath}`);
  } else {
    await copyWithRewrite(srcPath, sharedDest, map);
  }
  count++;

  for (const skill of targetSkills) {
    const skillDest = join(PLUGIN, 'skills', skill, 'data', relPath);
    if (DRY_RUN) {
      console.log(`  [dry-run] ${skill}/data/${relPath}`);
    } else {
      await copyWithRewrite(srcPath, skillDest, map);
    }
    count++;
  }

  return count;
}

/** Checkout a source to its tracked version tag. */
async function checkoutSource(
  source: UpstreamSource,
  upstreamRoot: string,
): Promise<string> {
  const versionFile = join(ROOT, source.versionFile);
  const trackedVersion = (await Bun.file(versionFile).text()).trim();
  const candidates = [trackedVersion, trackedVersion.replace(/^v/, '')];
  try {
    await gitInUpstream(upstreamRoot, 'fetch', '--tags');
  } catch {
    // Fetch may fail (offline, auth, private repo) — continue with local tags
  }
  for (const tag of candidates) {
    try {
      await gitInUpstream(upstreamRoot, 'checkout', tag);
      return tag;
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Could not checkout ${trackedVersion} for ${source.id}`);
}

/** Sync a single upstream source. */
async function syncSource(
  source: UpstreamSource,
  map: WorkflowMap,
): Promise<number> {
  const upstreamRoot = join(ROOT, '.upstream', source.localPath);
  if (!(await exists(join(upstreamRoot, '.git')))) {
    console.log(`⚠ Skipping ${source.id}: repo not cloned at ${upstreamRoot}`);
    return 0;
  }

  const tag = await checkoutSource(source, upstreamRoot);
  console.log(`[${source.id}] Pinned to tag: ${tag}`);

  const pairs = await getWorkflowSkillPairs(source, upstreamRoot);
  let totalFiles = 0;

  for (const pair of pairs) {
    console.log(`Syncing: ${pair.label}`);
    const count = await syncPair(pair, source, map);
    totalFiles += count;
    if (!DRY_RUN) {
      console.log(`  ✓ ${count} files copied`);
    }
  }

  // Sync shared files (only if source defines shared targets)
  const sharedTargets = source.sharedFileTargets ?? {};
  if (Object.keys(sharedTargets).length > 0) {
    const workflowsRoot = join(upstreamRoot, source.contentRoot);
    let sharedCount = 0;

    for (const [category, targetSkills] of Object.entries(sharedTargets)) {
      const sharedDir = join(workflowsRoot, category, '_shared');
      if (!(await exists(sharedDir))) continue;

      const sharedFiles = await listFilesRecursive(sharedDir);
      const pluginSharedDir = join(PLUGIN, '_shared');

      for (const relPath of sharedFiles) {
        const srcPath = join(sharedDir, relPath);
        sharedCount += await syncSharedFile(
          srcPath,
          relPath,
          pluginSharedDir,
          targetSkills,
          map,
        );
      }

      console.log(
        `Shared: ${category}/_shared/ → _shared/ + ${targetSkills.length} skills`,
      );
    }

    if (sharedCount > 0) {
      console.log(`Shared files: ${sharedCount} copies synced.`);
    }
  }

  return totalFiles;
}

/**
 * Sync core extras that live outside the normal contentRoot paths:
 * - Core task files → _shared/tasks/
 * - Core special workflows (advanced-elicitation, party-mode) → skills/
 * - TEA knowledge index → _shared/
 */
async function syncCoreExtras(map: WorkflowMap): Promise<number> {
  const coreSource = getCoreSource();
  const coreRoot = join(ROOT, '.upstream', coreSource.localPath);
  let count = 0;

  // 1. Core task files → _shared/tasks/
  const tasksDir = join(coreRoot, 'src/core/tasks');
  if (await exists(tasksDir)) {
    const taskFiles = await readdir(tasksDir);
    const destDir = join(PLUGIN, '_shared', 'tasks');
    console.log('Syncing: [core] tasks → _shared/tasks/');

    for (const file of taskFiles) {
      const srcPath = join(tasksDir, file);
      if (DRY_RUN) {
        console.log(`  [dry-run] _shared/tasks/${file}`);
      } else {
        await copyWithRewrite(srcPath, join(destDir, file), map);
      }
      count++;
    }
    if (!DRY_RUN) console.log(`  ✓ ${taskFiles.length} task files copied`);
  }

  // 2. Core special workflows → skills/<name>/
  // These live at src/core/workflows/ (not under the normal bmm contentRoot)
  const specialWorkflows = ['advanced-elicitation', 'party-mode'];
  const coreWorkflowsDir = join(coreRoot, 'src/core/workflows');

  if (await exists(coreWorkflowsDir)) {
    for (const name of specialWorkflows) {
      const workflowDir = join(coreWorkflowsDir, name);
      if (!(await exists(workflowDir))) continue;

      const skillDir = join(PLUGIN, 'skills', name);
      const files = await listFilesRecursive(workflowDir);
      let pairCount = 0;

      console.log(`Syncing: [core] ${name} → skills/${name}/`);
      for (const relPath of files) {
        const fileName = relPath.split('/').at(-1) ?? relPath;
        if (shouldSkipContentFile(coreSource, fileName)) continue;

        const srcPath = join(workflowDir, relPath);
        const destPath = join(skillDir, relPath);

        if (DRY_RUN) {
          console.log(`  [dry-run] ${relPath}`);
        } else {
          await copyWithRewrite(srcPath, destPath, map);
        }
        pairCount++;
      }
      count += pairCount;
      if (!DRY_RUN) console.log(`  ✓ ${pairCount} files copied`);
    }
  }

  // 3. TEA knowledge index → _shared/
  const teaSource = getSource('tea');
  if (teaSource) {
    const teaRoot = join(ROOT, '.upstream', teaSource.localPath);
    const teaIndex = join(teaRoot, 'src/testarch/tea-index.csv');
    if (await exists(teaIndex)) {
      const destDir = join(PLUGIN, '_shared');
      const destPath = join(destDir, 'tea-index.csv');
      console.log('Syncing: [tea] tea-index.csv → _shared/');

      if (DRY_RUN) {
        console.log('  [dry-run] _shared/tea-index.csv');
      } else {
        await copyWithRewrite(teaIndex, destPath, map);
        console.log('  ✓ 1 index file copied');
      }
      count++;
    }
  }

  return count;
}

// === Main ===

const sources = SOURCE_FILTER
  ? getEnabledSources().filter((s) => s.id === SOURCE_FILTER)
  : getEnabledSources();

if (sources.length === 0) {
  console.error(`No matching source found for "${SOURCE_FILTER}"`);
  process.exit(1);
}

console.log(DRY_RUN ? 'Dry run — no files will be copied\n' : 'Syncing...\n');

// Build workflow map from ALL sources (cross-module refs need full map)
const workflowMap = await buildWorkflowMap();

let grandTotal = 0;
for (const source of sources) {
  const count = await syncSource(source, workflowMap);
  grandTotal += count;
  console.log('');
}

// Sync core extras (tasks, special workflows, indexes)
// Only when running all sources or when core/tea is the filter
const shouldSyncExtras =
  !SOURCE_FILTER || SOURCE_FILTER === 'core' || SOURCE_FILTER === 'tea';

if (shouldSyncExtras) {
  const extrasCount = await syncCoreExtras(workflowMap);
  grandTotal += extrasCount;
  console.log('');
}

console.log(
  `Total: ${grandTotal} files ${DRY_RUN ? 'would be' : ''} synced across ${sources.length} sources.`,
);

// Print path rewrite summary
if (!DRY_RUN && rewriteStats.totalChanges > 0) {
  console.log(
    `Path rewrites: ${rewriteStats.totalChanges} paths rewritten across ${rewriteStats.filesRewritten} files.`,
  );
}
if (rewriteStats.warnings.length > 0) {
  console.log(`\n⚠ Rewrite warnings (${rewriteStats.warnings.length}):`);
  for (const warning of rewriteStats.warnings) {
    console.log(`  - ${warning}`);
  }
}

// Update version files (core-anchored strategy) — skip when filtering to a single source
if (!DRY_RUN && !SOURCE_FILTER) {
  const core = getCoreSource();
  const coreRoot = join(ROOT, '.upstream', core.localPath);
  const pkgJson = await Bun.file(join(coreRoot, 'package.json')).json();
  const newUpstream = `v${pkgJson.version}`;
  await Bun.write(join(ROOT, core.versionFile), `${newUpstream}\n`);
  console.log(`\nUpdated ${core.versionFile} to ${newUpstream}`);

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

  // Update external module version files
  for (const source of getEnabledSources()) {
    if (source.id === 'core') continue;
    const upstreamRoot = join(ROOT, '.upstream', source.localPath);
    if (!(await exists(join(upstreamRoot, '.git')))) continue;

    // Read the latest tag from the checked-out repo
    const result = await gitInUpstream(
      upstreamRoot,
      'describe',
      '--tags',
      '--abbrev=0',
    );
    const latestTag = result.text().trim();
    await Bun.write(join(ROOT, source.versionFile), `${latestTag}\n`);
    console.log(`Updated ${source.versionFile} to ${latestTag}`);
  }
}
