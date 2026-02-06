/**
 * Path constants for upstream validation and sync scripts.
 */

import { join } from 'node:path';

export const ROOT = join(import.meta.dir, '../..');
export const PLUGIN = join(ROOT, 'plugins/bmad');
export const PLUGIN_JSON_PATH = join(PLUGIN, '.claude-plugin/plugin.json');
