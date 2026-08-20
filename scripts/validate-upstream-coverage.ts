/**
 * Plugin validation.
 *
 * The installer is the source of truth, so these checks do not re-derive
 * content — they assert that what is committed is exactly what the
 * installer produced and that nothing machine-specific leaked into it.
 *
 * - Version consistency: per-source version files, plugin-version
 *   anchoring, and each published plugin's manifest agreeing with the
 *   marketplace entry.
 * - Marketplace integrity: every declared plugin resolves to a real
 *   directory with skills.
 * - Skill surface: `plugins/bmad/skills/` matches the installer's own
 *   `_config/skill-manifest.csv` exactly, in both directions. This
 *   replaced the pre-v6.11 "no DEPRECATED shims" rule — v6.11 renamed
 *   the marker to sentence case, which turned that rule into a gate
 *   that passed while measuring nothing.
 * - Runtime template: the files skills resolve at run time are present,
 *   fully templatized, and carry no live nested .gitignore.
 *
 * Exit 0 = pass, exit 1 = gaps found.
 */

import { exists, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { checkVersion } from './lib/checks/index.ts';
import {
  MARKETPLACE_JSON_PATH,
  PLUGIN,
  PLUGINS_DIR,
  ROOT,
} from './lib/config.ts';
import {
  fail,
  GREEN,
  hasFailed,
  pass,
  RED,
  RESET,
  section,
  setVerbose,
} from './lib/output.ts';

setVerbose(process.argv.includes('--verbose'));

console.log('Validating plugin (installer-sync mode)...\n');

interface MarketplacePlugin {
  name: string;
  source: string;
  version: string;
}

async function listDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/** Every `_bmad/<module>/module-help.csv` under a plugin's runtime. */
async function moduleHelpFiles(runtimeRoot: string): Promise<string[]> {
  if (!(await exists(runtimeRoot))) return [];
  const found: string[] = [];
  for (const dir of await listDirs(runtimeRoot)) {
    const candidate = join(runtimeRoot, dir, 'module-help.csv');
    if (await exists(candidate)) found.push(candidate);
  }
  return found;
}

// ── 1. Version consistency ──────────────────────────────────────────────
await checkVersion();

// ── 2. Marketplace integrity ────────────────────────────────────────────
section('Marketplace');
const marketplace: { plugins: MarketplacePlugin[] } = await Bun.file(
  MARKETPLACE_JSON_PATH,
).json();

for (const entry of marketplace.plugins) {
  const dir = join(ROOT, entry.source);
  const manifestPath = join(dir, '.claude-plugin/plugin.json');

  if (!(await exists(manifestPath))) {
    fail(`[${entry.name}] no .claude-plugin/plugin.json at ${entry.source}`);
    continue;
  }

  const manifest: { name: string; version: string; skills?: string } =
    await Bun.file(manifestPath).json();

  if (manifest.name !== entry.name) {
    fail(
      `[${entry.name}] plugin.json name is "${manifest.name}" — marketplace says "${entry.name}"`,
    );
  }
  if (manifest.version !== entry.version) {
    fail(
      `[${entry.name}] plugin.json version ${manifest.version} != marketplace ${entry.version}`,
    );
  }

  const skillsDir = join(dir, 'skills');
  if (!(await exists(skillsDir))) {
    fail(`[${entry.name}] skills/ does not exist — run \`bun run sync\``);
    continue;
  }
  const skillDirs = await listDirs(skillsDir);
  if (skillDirs.length === 0) {
    fail(`[${entry.name}] skills/ is empty — run \`bun run sync\``);
  } else {
    pass(`[${entry.name}] ${skillDirs.length} skills, manifest agrees`);
  }
}

// A sibling plugin directory that nobody publishes is dead weight in
// every marketplace clone.
const published = new Set(
  marketplace.plugins.map((p) => relative(PLUGINS_DIR, join(ROOT, p.source))),
);
for (const dir of await listDirs(PLUGINS_DIR)) {
  if (!published.has(dir)) {
    fail(`plugins/${dir}/ is not listed in .claude-plugin/marketplace.json`);
  }
}

// ── 3. Skill surface matches the installer manifest ─────────────────────
// Every published plugin, not just `bmad`: a sibling plugin whose skills
// are selected by a name prefix would otherwise ship a silent subset if
// upstream renamed half of them, because `skills/` would still be
// non-empty.
section('Skill Surface');
for (const entry of marketplace.plugins) {
  const dir = join(ROOT, entry.source);
  const manifestPath = join(dir, 'runtime/_bmad/_config/skill-manifest.csv');
  if (!(await exists(manifestPath))) {
    fail(
      `[${entry.name}] runtime/_bmad/_config/skill-manifest.csv missing — run \`bun run sync\``,
    );
    continue;
  }

  // canonicalId is the first column and is always double-quoted.
  const declared = new Set(
    (await Bun.file(manifestPath).text())
      .split('\n')
      .slice(1)
      .filter(Boolean)
      .map((line) => line.match(/^"([^"]+)"/)?.[1])
      .filter((id): id is string => Boolean(id)),
  );
  const shipped = new Set(await listDirs(join(dir, 'skills')));

  const missing = [...declared].filter((id) => !shipped.has(id));
  const extra = [...shipped].filter((id) => !declared.has(id));

  if (missing.length > 0) {
    fail(
      `[${entry.name}] declared by the installer but not shipped: ${missing.join(', ')}`,
    );
  }
  if (extra.length > 0) {
    fail(
      `[${entry.name}] shipped but not in the installer manifest: ${extra.join(', ')}`,
    );
  }
  if (missing.length === 0 && extra.length === 0) {
    pass(
      `[${entry.name}] skill surface matches the installer manifest (${declared.size})`,
    );
  }

  // A help row naming a skill that is not shipped makes `bmad-help`
  // offer, and route to, something that does not exist.
  for (const helpPath of await moduleHelpFiles(join(dir, 'runtime/_bmad'))) {
    const ghosts = (await Bun.file(helpPath).text())
      .split('\n')
      .slice(1)
      .filter(Boolean)
      .map((line) => line.split(',')[1] ?? '')
      .filter(
        (skill) => skill !== '' && skill !== '_meta' && !shipped.has(skill),
      );
    if (ghosts.length > 0) {
      fail(
        `[${entry.name}] ${relative(ROOT, helpPath)} names unshipped skills: ${[...new Set(ghosts)].join(', ')}`,
      );
    }
  }
}

// ── 4. Runtime template + init assets ───────────────────────────────────
section('Runtime Template');
const runtimeChecks = [
  'runtime/_bmad/config.toml',
  'runtime/_bmad/config.user.toml',
  'runtime/_bmad/_config/manifest.yaml',
  'runtime/_bmad/_config/bmad-help.csv',
  'runtime/_bmad/_config/skill-manifest.csv',
  'runtime/_bmad/custom/config.toml',
  'runtime/_bmad/custom/dot.gitignore',
  // v6.11: skills render through render_skill.py, which publishes
  // content-addressed snapshots into _bmad/render/.
  'runtime/_bmad/render/dot.gitignore',
  'runtime/_bmad/scripts/config_utils.py',
  'runtime/_bmad/scripts/memlog.py',
  'runtime/_bmad/scripts/render_skill.py',
  'runtime/_bmad/scripts/resolve_config.py',
  'runtime/_bmad/scripts/resolve_customization.py',
  'scripts/init.sh',
  'commands/init.md',
  'templates/module-template/README.md',
];
for (const rel of runtimeChecks) {
  if (await exists(join(PLUGIN, rel))) {
    pass(`plugins/bmad/${rel} present`);
  } else {
    fail(`plugins/bmad/${rel} missing — run \`bun run sync\``);
  }
}

// ── 5. No machine-specific values, no live nested .gitignore ────────────
//
// Two independent checks, deliberately. The first mirrors the sync's own
// substitution keys — necessary, but it shares a predicate with the code
// it audits, so it cannot notice the sync silently missing a renamed key.
// The second searches for the VALUES instead: this operator's identity
// and any surviving timestamp. That is what catches the failure mode this
// whole rebuild exists to fix — a gate that keeps passing after upstream
// renames the thing it matched on.
section('Templatization');
const vendoredRoots = [
  join(PLUGIN, 'runtime'),
  join(PLUGIN, 'templates'),
  ...marketplace.plugins.map((p) => join(ROOT, p.source, 'runtime')),
];

/** key → the placeholder its value must be, everywhere in vendored content. */
const REQUIRED_PLACEHOLDERS: Record<string, string> = {
  user_name: '__BMAD_USER_NAME__',
  project_name: '__BMAD_PROJECT_NAME__',
  installDate: '__BMAD_INSTALL_DATE__',
  lastUpdated: '__BMAD_INSTALL_DATE__',
};

const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * The operator's identity, discovered the same way `init.sh` discovers it.
 * Only applied to config and manifest files: upstream prose legitimately
 * contains common names.
 */
const identities = [
  process.env.USER,
  (await Bun.$`git config user.name`.quiet().nothrow()).stdout
    .toString()
    .trim(),
]
  .filter((v) => typeof v === 'string' && v.trim().length >= 3)
  .map((v) => (v as string).trim());

const leaks: string[] = [];
const liveGitignores: string[] = [];

for (const root of vendoredRoots) {
  if (!(await exists(root))) continue;
  const proc = Bun.spawn(['find', root, '-type', 'f'], { stdout: 'pipe' });
  const files = (await new Response(proc.stdout).text())
    .trim()
    .split('\n')
    .filter(Boolean);

  for (const file of files) {
    const rel = relative(ROOT, file);
    if (file.endsWith('/.gitignore')) {
      // A live nested .gitignore excludes its siblings from this repo's
      // tree — and marketplace installs are git clones, so those files
      // would never reach a user. The sync stores them as dot.gitignore.
      liveGitignores.push(rel);
      continue;
    }

    const text = await Bun.file(file).text();
    if (text.includes('.upstream-install')) {
      leaks.push(`${rel}: install-dir name`);
    }

    for (const [key, placeholder] of Object.entries(REQUIRED_PLACEHOLDERS)) {
      const pattern = new RegExp(
        `^\\s*${key}\\s*[:=]\\s*"?([^"\\n]*)"?$`,
        'gm',
      );
      for (const match of text.matchAll(pattern)) {
        if (match[1]?.trim() !== placeholder) {
          leaks.push(`${rel}: ${key} = ${match[1]}`);
        }
      }
    }

    const isConfig = /\.(toml|yaml|yml)$/.test(file);
    if (!isConfig) continue;

    if (ISO_TIMESTAMP.test(text)) {
      leaks.push(`${rel}: an install timestamp survived templatization`);
    }

    // Match the identity only where it is the WHOLE value of some
    // `key: value` / `key = "value"` line — any key, so a renamed one is
    // still caught, but prose is not. A bare word search cries wolf:
    // GitHub Actions runs as `runner`, and `bmad-eval-runner` is a real
    // skill id that appears throughout the manifests.
    for (const identity of identities) {
      const escaped = identity.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const asValue = new RegExp(
        `^\\s*[\\w.\\-]+\\s*[:=]\\s*"?${escaped}"?\\s*$`,
        'm',
      );
      if (asValue.test(text)) {
        leaks.push(
          `${rel}: a config value is the operator identity "${identity}"`,
        );
      }
    }
  }
}

if (leaks.length > 0) {
  fail(
    `machine-specific values in vendored content:\n    ${leaks.join('\n    ')}`,
  );
} else {
  pass('no machine-specific values in vendored content');
}
if (liveGitignores.length > 0) {
  fail(
    `live nested .gitignore (must be dot.gitignore):\n    ${liveGitignores.join('\n    ')}`,
  );
} else {
  pass('no live nested .gitignore in vendored content');
}

console.log('');

if (hasFailed()) {
  console.log(`${RED}✗ Validation failed — gaps found above.${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ Plugin valid.${RESET}`);
}
