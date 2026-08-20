/**
 * Path constants for upstream validation and sync scripts.
 */

import { join } from 'node:path';

export const ROOT = join(import.meta.dir, '../..');
export const PLUGINS_DIR = join(ROOT, 'plugins');
export const PLUGIN = join(PLUGINS_DIR, 'bmad');
export const PLUGIN_JSON_PATH = join(PLUGIN, '.claude-plugin/plugin.json');
export const MARKETPLACE_JSON_PATH = join(
  ROOT,
  '.claude-plugin/marketplace.json',
);
