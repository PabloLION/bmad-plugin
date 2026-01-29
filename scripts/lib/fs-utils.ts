/**
 * File system utilities for validation.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Normalize text for content comparison:
 * - Collapse whitespace runs (handles Prettier line-wrapping)
 * - Normalize quotes (Prettier converts 'single' to "double" in YAML)
 */
export function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/'/g, '"').trim();
}

/**
 * Recursively list all files under a directory.
 * Returns paths relative to the given directory.
 */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const rel = entry.name;
    if (entry.isDirectory()) {
      const subFiles = await listFilesRecursive(join(dir, rel));
      results.push(...subFiles.map((f) => `${rel}/${f}`));
    } else {
      results.push(rel);
    }
  }

  return results;
}
