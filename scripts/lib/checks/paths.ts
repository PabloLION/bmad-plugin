/**
 * Check for unrewritten {project-root}/_bmad/ paths in synced skill files.
 *
 * Scans all files under plugins/bmad/skills/ for paths that should have
 * been rewritten by the sync pipeline. Excludes deferred categories
 * (_memory/, _config/) and known unresolvable patterns.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PLUGIN } from '../config.ts';
import { pass, section, warn } from '../output.ts';

/** Patterns that are expected to remain unrewritten. */
const EXPECTED_PATTERNS = [
  /_bmad\/_memory\//,
  /_bmad\/_config\//,
  /_bmad\/[^/]*\{/, // template variables like {module-id}
  /_bmad\/\[/, // bracket templates like [module-path]
  /_bmad\/foo\//, // example placeholder
  /_bmad\/\.\.\./, // documentation ellipsis
];

async function listAllFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subFiles = await listAllFiles(join(dir, entry.name));
      results.push(...subFiles);
    } else {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

export async function checkPaths(): Promise<void> {
  section('Path rewrites');

  const skillsDir = join(PLUGIN, 'skills');
  const files = await listAllFiles(skillsDir);
  const textExts = new Set(['.md', '.xml', '.yaml', '.yml', '.csv', '.txt']);

  let unrewrittenCount = 0;
  let fileCount = 0;
  const unexpectedFiles: string[] = [];

  for (const filePath of files) {
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    if (!textExts.has(ext)) continue;

    const content = await Bun.file(filePath).text();
    const matches = content.match(/\{project-root\}\/_bmad\/[^\s'"<>{}()`]+/g);
    if (!matches) continue;

    // Filter out expected/deferred patterns
    const unexpected = matches.filter(
      (m) => !EXPECTED_PATTERNS.some((p) => p.test(m)),
    );

    if (unexpected.length > 0) {
      const relPath = filePath.replace(`${PLUGIN}/`, '');
      unrewrittenCount += unexpected.length;
      fileCount++;
      unexpectedFiles.push(`${relPath} (${unexpected.length} paths)`);
    }
  }

  if (unexpectedFiles.length > 0) {
    warn(
      `${unrewrittenCount} unrewritten paths in ${fileCount} files (may be orphaned or unresolvable):`,
    );
    for (const f of unexpectedFiles.slice(0, 10)) {
      warn(`  ${f}`);
    }
    if (unexpectedFiles.length > 10) {
      warn(`  ... and ${unexpectedFiles.length - 10} more files`);
    }
  } else {
    pass('No unexpected unrewritten paths found');
  }
}
