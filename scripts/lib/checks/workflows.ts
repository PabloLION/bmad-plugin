/**
 * Three-set skill coverage check:
 * - Upstream workflow names
 * - Plugin skill directories
 * - Plugin.json manifest commands
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  PLUGIN,
  PLUGIN_JSON_PATH,
  PLUGIN_ONLY_SKILLS,
  SKIP_DIRS,
  UPSTREAM,
  WORKFLOW_WORKAROUNDS,
} from "../config.ts";
import { fail, pass, warn } from "../output.ts";

export interface SkillSets {
  upstream: Set<string>;
  directories: Set<string>;
  manifest: Set<string>;
}

/** Collect upstream workflow names (leaf directories). */
async function getUpstreamWorkflows(): Promise<Set<string>> {
  const names = new Set<string>();
  const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");
  const categories = await readdir(workflowsRoot, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    // document-project is a leaf workflow itself
    if (cat.name === "document-project") {
      names.add("document-project");
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });

    for (const sub of subs) {
      if (!sub.isDirectory()) continue;
      if (SKIP_DIRS.has(sub.name)) continue;
      names.add(sub.name);
    }
  }

  return names;
}

/** Collect plugin skill directory names. */
async function getPluginDirectories(): Promise<Set<string>> {
  const entries = await readdir(join(PLUGIN, "skills"), {
    withFileTypes: true,
  });
  return new Set(
    entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .map((e) => e.name),
  );
}

/** Collect plugin.json manifest command names. */
async function getManifestCommands(): Promise<Set<string>> {
  const pluginJson = await Bun.file(PLUGIN_JSON_PATH).json();
  return new Set(
    (pluginJson.commands as string[]).map((c: string) =>
      c.replace("./skills/", "").replace(/\/$/, ""),
    ),
  );
}

/** Apply workarounds: upstream name → plugin name */
function applyWorkaround(upstreamName: string): string {
  return WORKFLOW_WORKAROUNDS[upstreamName] ?? upstreamName;
}

export async function checkWorkflows(): Promise<SkillSets> {
  const upstream = await getUpstreamWorkflows();
  const directories = await getPluginDirectories();
  const manifest = await getManifestCommands();

  // --- Upstream → Directories ---
  console.log("\n== Skills: Upstream → Plugin Directories ==");
  for (const name of [...upstream].sort()) {
    const pluginName = applyWorkaround(name);
    const isWorkaround = pluginName !== name;

    if (directories.has(pluginName)) {
      if (isWorkaround) {
        warn(`${name} → ${pluginName} (workaround — rename dir to ${name})`);
      } else {
        pass(name);
      }
    } else {
      fail(`Missing directory: skills/${pluginName} (upstream: ${name})`);
    }
  }

  // --- Upstream → Manifest ---
  console.log("\n== Skills: Upstream → Manifest ==");
  for (const name of [...upstream].sort()) {
    const pluginName = applyWorkaround(name);

    if (manifest.has(pluginName)) {
      pass(`${pluginName} in plugin.json`);
    } else {
      fail(`Missing in plugin.json: ${pluginName} (upstream: ${name})`);
    }
  }

  // --- Directories → Manifest (bidirectional) ---
  console.log("\n== Skills: Directories ↔ Manifest ==");
  for (const dir of [...directories].sort()) {
    if (!manifest.has(dir)) {
      fail(`Directory "${dir}" not in plugin.json commands`);
    }
  }
  for (const cmd of [...manifest].sort()) {
    if (!directories.has(cmd)) {
      fail(`plugin.json command "${cmd}" has no directory`);
    }
  }
  pass("Directories ↔ Manifest aligned");

  // --- Plugin-only skills (in directories but not upstream) ---
  console.log("\n== Plugin-Only Skills ==");
  const upstreamMapped = new Set([...upstream].map(applyWorkaround));
  for (const dir of [...directories].sort()) {
    if (upstreamMapped.has(dir)) continue;

    if (PLUGIN_ONLY_SKILLS.has(dir)) {
      pass(`${dir} (plugin-only, expected)`);
    } else {
      warn(`${dir} (plugin-only, investigate — not in upstream)`);
    }
  }

  return { upstream, directories, manifest };
}
