/**
 * Three-way validation: upstream BMAD-METHOD ↔ plugin files ↔ plugin.json.
 *
 * Checks:
 * 1. Upstream sync — pull latest upstream before validating
 * 2. Agent coverage — upstream agents ↔ plugin agent .md files
 * 3. Workflow/skill coverage — upstream workflows ↔ plugin skill directories
 * 4. Manifest consistency — plugin.json commands ↔ actual skill directories
 * 5. Version consistency — .upstream-version ↔ upstream package.json
 *
 * Known workarounds are documented inline and printed with ⚠ markers.
 * Exit 0 = pass, Exit 1 = gaps found.
 */

import { readdir, exists } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";

const ROOT = join(import.meta.dir, "..");
const UPSTREAM = join(ROOT, ".upstream/BMAD-METHOD");
const PLUGIN = join(ROOT, "plugins/bmad");
const PLUGIN_JSON_PATH = join(PLUGIN, ".claude-plugin/plugin.json");

// -- Output helpers ----------------------------------------------------------

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let failed = false;

function pass(msg: string): void {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
}

function fail(msg: string): void {
  console.log(`${RED}✗ ${msg}${RESET}`);
  failed = true;
}

function warn(msg: string): void {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

// -- Known workarounds -------------------------------------------------------
// These are mismatches between upstream names and plugin names.
// Each should be eliminated over time by renaming plugin files to match
// upstream exactly. Until then, the script accepts them but prints warnings.

const AGENT_WORKAROUNDS: Record<string, string> = {
  "quick-flow-solo-dev": "barry",
};

const WORKFLOW_WORKAROUNDS: Record<string, string> = {
  retrospective: "epic-retrospective",
  "check-implementation-readiness": "implementation-readiness",
  "create-product-brief": "product-brief",
  automate: "test-automate",
  ci: "continuous-integration",
  framework: "test-framework",
  trace: "test-trace",
};

/** Plugin-only agents with no upstream counterpart */
const PLUGIN_ONLY_AGENTS = new Set(["bmad-master"]);

/** Plugin-only skills with no upstream counterpart */
const PLUGIN_ONLY_SKILLS = new Set([
  "help",
  "init",
  "status",
  "brainstorm",
  "testarch-knowledge",
]);

/** Upstream subdirectories that are not workflow leaves */
const SKIP_DIRS = new Set(["_shared", "templates", "workflows"]);

// -- 0. Pull upstream --------------------------------------------------------

async function syncUpstream(): Promise<void> {
  console.log("\n== Sync Upstream ==");
  const upstreamExists = await exists(join(UPSTREAM, ".git"));
  if (!upstreamExists) {
    fail("Upstream repo not found at .upstream/BMAD-METHOD — run clone first");
    return;
  }
  try {
    await $`git -C ${UPSTREAM} pull --ff-only`.quiet();
    pass("Pulled latest upstream");
  } catch {
    warn("Could not pull upstream (offline or no remote changes)");
  }
}

// -- 1. Agent coverage -------------------------------------------------------

async function checkAgents(): Promise<void> {
  console.log("\n== Agent Coverage (upstream → plugin) ==");
  const upstreamDir = join(UPSTREAM, "src/bmm/agents");
  const entries = await readdir(upstreamDir, { withFileTypes: true });

  const upstreamNames: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      upstreamNames.push(entry.name);
    } else if (entry.name.endsWith(".agent.yaml")) {
      upstreamNames.push(entry.name.replace(".agent.yaml", ""));
    }
  }

  for (const upstream of upstreamNames) {
    const workaround = AGENT_WORKAROUNDS[upstream];
    const pluginName = workaround ?? upstream;
    const pluginPath = join(PLUGIN, "agents", `${pluginName}.md`);

    if (await exists(pluginPath)) {
      if (workaround) {
        warn(
          `Agent: ${upstream} → ${workaround} (workaround — should rename to ${upstream}.md)`,
        );
      } else {
        pass(`Agent: ${upstream}`);
      }
    } else {
      fail(`Agent missing: expected ${pluginName}.md for upstream ${upstream}`);
    }
  }

  // Check for plugin agents with no upstream counterpart
  console.log("\n== Plugin-Only Agents ==");
  const pluginAgents = await readdir(join(PLUGIN, "agents"));
  const coveredNames = new Set(
    upstreamNames.map((n) => AGENT_WORKAROUNDS[n] ?? n),
  );

  for (const file of pluginAgents) {
    if (!file.endsWith(".md")) continue;
    const name = file.replace(".md", "");
    if (coveredNames.has(name)) continue;
    if (PLUGIN_ONLY_AGENTS.has(name)) {
      pass(`Plugin-only agent: ${name} (no upstream counterpart — expected)`);
    } else {
      warn(`Plugin-only agent: ${name} (no upstream counterpart — investigate)`);
    }
  }
}

// -- 2. Workflow → Skill coverage --------------------------------------------

async function checkWorkflows(): Promise<void> {
  console.log("\n== Workflow → Skill Coverage (upstream → plugin) ==");
  const workflowsRoot = join(UPSTREAM, "src/bmm/workflows");
  const categories = await readdir(workflowsRoot, { withFileTypes: true });

  const coveredSkills = new Set<string>();

  for (const cat of categories) {
    if (!cat.isDirectory()) continue;

    // document-project is a leaf workflow (files + subdirs, not sub-workflows)
    if (cat.name === "document-project") {
      const skillPath = join(PLUGIN, "skills", "document-project");
      if (await exists(skillPath)) {
        pass("Workflow: document-project");
        coveredSkills.add("document-project");
      } else {
        fail("Skill missing: document-project");
      }
      continue;
    }

    const subs = await readdir(join(workflowsRoot, cat.name), {
      withFileTypes: true,
    });

    for (const sub of subs) {
      if (!sub.isDirectory()) continue;
      if (SKIP_DIRS.has(sub.name)) continue;

      const workaround = WORKFLOW_WORKAROUNDS[sub.name];
      const skillName = workaround ?? sub.name;
      const skillPath = join(PLUGIN, "skills", skillName);

      if (await exists(skillPath)) {
        if (workaround) {
          warn(
            `Workflow: ${cat.name}/${sub.name} → ${workaround} (workaround — should rename to ${sub.name})`,
          );
        } else {
          pass(`Workflow: ${cat.name}/${sub.name} → skill: ${skillName}`);
        }
        coveredSkills.add(skillName);
      } else {
        fail(
          `Skill missing: ${skillName} (from workflow ${cat.name}/${sub.name})`,
        );
      }
    }
  }

  // Check for plugin skills with no upstream counterpart
  console.log("\n== Plugin-Only Skills ==");
  const pluginSkills = await readdir(join(PLUGIN, "skills"), {
    withFileTypes: true,
  });

  for (const entry of pluginSkills) {
    if (!entry.isDirectory()) continue;
    if (coveredSkills.has(entry.name)) continue;
    if (PLUGIN_ONLY_SKILLS.has(entry.name)) {
      pass(`Plugin-only skill: ${entry.name} (no upstream counterpart — expected)`);
    } else {
      warn(
        `Plugin-only skill: ${entry.name} (no upstream counterpart — investigate)`,
      );
    }
  }
}

// -- 3. Manifest consistency -------------------------------------------------

async function checkManifest(): Promise<void> {
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

// -- 4. Version consistency --------------------------------------------------

async function checkVersion(): Promise<void> {
  console.log("\n== Version Consistency ==");
  const versionFile = (
    await Bun.file(join(ROOT, ".upstream-version")).text()
  ).trim();
  const pkgJson = await Bun.file(join(UPSTREAM, "package.json")).json();
  const upstreamVersion = `v${pkgJson.version}`;

  if (versionFile === upstreamVersion) {
    pass(`Version: ${versionFile}`);
  } else {
    fail(
      `Version mismatch: .upstream-version=${versionFile}, upstream package.json=v${pkgJson.version}`,
    );
  }
}

// -- Main --------------------------------------------------------------------

console.log("Validating upstream coverage...");

await syncUpstream();
await checkAgents();
await checkWorkflows();
await checkManifest();
await checkVersion();

const workaroundCount =
  Object.keys(AGENT_WORKAROUNDS).length +
  Object.keys(WORKFLOW_WORKAROUNDS).length;

console.log("");
if (failed) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else if (workaroundCount > 0) {
  console.log(
    `${GREEN}✓ All checks passed.${RESET} ${YELLOW}(${workaroundCount} workarounds — see ⚠ above)${RESET}`,
  );
} else {
  console.log(`${GREEN}✓ All checks passed — full alignment.${RESET}`);
}
