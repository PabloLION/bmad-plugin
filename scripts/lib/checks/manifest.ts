/**
 * Manifest consistency check: plugin.json commands ↔ skill directories.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { PLUGIN, PLUGIN_JSON_PATH } from "../config.ts";
import { pass, fail } from "../output.ts";

export async function checkManifest(): Promise<void> {
  console.log("\n== Manifest Consistency (plugin.json ↔ skill directories) ==");

  const pluginJson = await Bun.file(PLUGIN_JSON_PATH).json();
  const commandSet = new Set(
    (pluginJson.commands as string[]).map((c: string) =>
      c.replace("./skills/", "").replace(/\/$/, ""),
    ),
  );

  const skillEntries = await readdir(join(PLUGIN, "skills"), {
    withFileTypes: true,
  });
  const skillDirs = new Set(
    skillEntries.filter((e) => e.isDirectory()).map((e) => e.name),
  );

  // Every skill directory must be in plugin.json commands
  for (const dir of skillDirs) {
    if (commandSet.has(dir)) {
      pass(`Manifest: ${dir} in plugin.json ✓ and directory exists ✓`);
    } else {
      fail(`Skill directory "${dir}" missing from plugin.json commands`);
    }
  }

  // Every plugin.json command must have a skill directory
  for (const cmd of commandSet) {
    if (!skillDirs.has(cmd)) {
      fail(`plugin.json command "${cmd}" has no skill directory`);
    }
  }
}
