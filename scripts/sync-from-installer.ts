/**
 * Installer-based sync — the only path that produces plugin content.
 *
 * Runs the official `npx bmad-method@<version> install --tools claude-code`
 * and copies its `.claude/skills/` output 1:1 into `plugins/<plugin>/skills/`.
 * The installer already produces a Claude Code native tree (correct flat
 * layout, `customize.toml` per skill, agents-as-skills, deprecation shims
 * that external modules still invoke), so the plugin is a thin wrapper over
 * it and adds no merge or rewrite layer.
 *
 * Two installer runs happen, into two throwaway directories:
 *
 *   A. `.upstream-install/` — the registry modules
 *      (`bmm,bmb,cis,gds,tea,bmad-loop`). Feeds the `bmad` plugin: its
 *      skills and its `_bmad/` runtime template.
 *   B. `.upstream-install-<id>/` — one per custom-source module. A custom
 *      source is a real BMad module that is NOT in the installer's
 *      `bmad-modules.yaml` registry, so it is cloned at a pinned tag and
 *      handed to the installer as a local `--custom-source` path (keeping
 *      the run offline-reproducible). Feeds its own sibling plugin.
 *
 * Splitting the runs keeps each plugin's runtime template describing only
 * the modules that plugin ships — a `bmad`-only install must not advertise
 * manticore skills in its help catalog.
 *
 * Run:
 *   bun scripts/sync-from-installer.ts                  # versions from .upstream-versions/
 *   bun scripts/sync-from-installer.ts --tag v6.11.0    # pin core
 *   bun scripts/sync-from-installer.ts --manticore-tag v1.0.1
 *   bun scripts/sync-from-installer.ts --dry-run        # preview only
 *   bun scripts/sync-from-installer.ts --keep-install   # don't wipe install dirs
 */

import { exists, readdir, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  updateJsonVersionFiles,
  updateReadmeBadge,
  VERSION_FILES,
} from './lib/bump-utils.ts';
import { PLUGIN, PLUGINS_DIR, ROOT } from './lib/config.ts';
import {
  MODULE_TEMPLATE_SOURCE,
  readVersion,
  writeVersionInfo,
} from './lib/upstream-sources.ts';

// ────────────────────────────────────────────────────────────────────────
// Args + paths
// ────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_INSTALL = process.argv.includes('--keep-install');

/**
 * Read `--flag value` or `--flag=value`. A value that looks like another
 * flag is rejected rather than silently consumed, because the failure
 * mode of `--tag --dry-run` is a sync that quietly targets the wrong
 * version and produces a self-consistent tree every gate passes.
 */
function flagValue(flag: string): string | undefined {
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);

  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${flag} needs a value`);
    process.exit(1);
  }
  return value;
}

const TAG_OVERRIDE = flagValue('--tag');

const INSTALL_DIR = join(ROOT, '.upstream-install');
const INSTALL_SKILLS_SUBDIR = '.claude/skills';
const INSTALL_RUNTIME_SUBDIR = '_bmad';

/**
 * Every throwaway upstream checkout lives under one directory, so a
 * single `.gitignore` line covers them all. Listing clones individually
 * meant a new `CUSTOM_SOURCES` entry silently became committable.
 */
const CLONES_DIR = join(ROOT, '.upstream-clones');

const PLUGIN_SHARED_DIR = join(PLUGIN, '_shared');
const PLUGIN_AGENTS_DIR = join(PLUGIN, 'agents');
const MODULE_TEMPLATE_DIR = join(PLUGIN, 'templates/module-template');

/**
 * Values the installer bakes into the runtime tree from the machine that
 * ran it. `scripts/init.sh` (shipped inside the plugin) substitutes each
 * one when a working repo is initialized.
 */
const PROJECT_NAME_PLACEHOLDER = '__BMAD_PROJECT_NAME__';
const USER_NAME_PLACEHOLDER = '__BMAD_USER_NAME__';
const INSTALL_DATE_PLACEHOLDER = '__BMAD_INSTALL_DATE__';

/**
 * Registry modules installed into the `bmad` plugin. `bmad-loop` became a
 * first-class registry entry in core v6.11.0 (`bmad-modules.yaml`,
 * `code: bmad-loop`); before that it needed a bespoke git clone.
 */
const MODULES = ['bmm', 'bmb', 'cis', 'gds', 'tea', 'bmad-loop'] as const;

interface CustomSource {
  /** `.upstream-versions/<id>.json` and `--<id>-tag` flag stem. */
  id: string;
  /** Clone URL, pinned to the tag in the version file. */
  repoUrl: string;
  /** Sibling plugin directory under `plugins/` that receives the output. */
  pluginDir: string;
  /** Module code the installer records in `_bmad/<code>/`. */
  moduleCode: string;
  /** Installed skill directories starting with this prefix belong here. */
  skillPrefix: string;
}

/**
 * Modules that are real BMad modules (they ship `skills/module.yaml`) but
 * are absent from the installer's official registry, so they can only be
 * installed via `--custom-source`.
 */
const CUSTOM_SOURCES: CustomSource[] = [
  {
    id: 'manticore',
    repoUrl: 'https://github.com/bmad-code-org/bmad-manticore.git',
    pluginDir: 'bmad-manticore',
    moduleCode: 'manticore',
    skillPrefix: 'mc-',
  },
];

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

async function countFiles(dir: string): Promise<number> {
  if (!(await exists(dir))) return 0;
  const proc = Bun.spawn(['find', dir, '-type', 'f'], { stdout: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  return stdout.trim().split('\n').filter(Boolean).length;
}

async function listFiles(dir: string): Promise<string[]> {
  const proc = Bun.spawn(['find', dir, '-type', 'f'], { stdout: 'pipe' });
  return (await new Response(proc.stdout).text())
    .trim()
    .split('\n')
    .filter(Boolean);
}

async function run(cmd: string[], label: string): Promise<void> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    const stdout = await new Response(proc.stdout).text();
    console.error(`${label} failed (exit ${exitCode}):`);
    console.error(stderr || stdout);
    process.exit(1);
  }
}

async function resolveTargetVersion(): Promise<string> {
  if (TAG_OVERRIDE) return TAG_OVERRIDE;
  return readVersion('core');
}

// ────────────────────────────────────────────────────────────────────────
// Install
// ────────────────────────────────────────────────────────────────────────

/**
 * Fetch a repository at an exact ref into `dest`, with no working
 * history. `git clone --branch <name>` resolves `<name>` against
 * branches before tags, so a branch sharing a tag's name silently wins
 * and yields a moving ref; fetching `refs/tags/<tag>` explicitly cannot
 * be shadowed.
 */
async function fetchRef(
  repoUrl: string,
  ref: string,
  dest: string,
  label: string,
): Promise<string> {
  await rm(dest, { recursive: true, force: true });
  await Bun.$`mkdir -p ${dest}`.quiet();
  await run(['git', 'init', '--quiet', dest], `${label} init`);
  await run(
    ['git', '-C', dest, 'remote', 'add', 'origin', repoUrl],
    `${label} remote`,
  );
  await run(
    ['git', '-C', dest, 'fetch', '--depth', '1', '--quiet', 'origin', ref],
    `${label} fetch`,
  );
  await run(
    ['git', '-C', dest, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'],
    `${label} checkout`,
  );

  const proc = Bun.spawn(['git', '-C', dest, 'rev-parse', 'HEAD'], {
    stdout: 'pipe',
  });
  const sha = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  await rm(join(dest, '.git'), { recursive: true, force: true });
  return sha;
}

/**
 * Clone each custom source at its pinned tag. Returns id → local checkout
 * path. Handing the installer a local path (rather than the GitHub URL)
 * is what makes the run reproducible: `--custom-source <url>` resolves to
 * the default branch, which moves.
 *
 * The version file is NOT written here. Recording a tag before the module
 * has been installed, copied and captured means any later failure leaves
 * the repo advertising a version it does not ship — and `validate` would
 * pass, because it only cross-checks the manifests against each other.
 */
async function cloneCustomSources(): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  for (const source of CUSTOM_SOURCES) {
    const tag = await customSourceTag(source);
    const cloneDir = join(CLONES_DIR, source.id);
    console.log(`Cloning ${source.id} @ ${tag}...`);

    if (DRY_RUN) {
      console.log(`  [dry-run] would fetch ${source.repoUrl} refs/tags/${tag}`);
      continue;
    }

    const sha = await fetchRef(
      source.repoUrl,
      `refs/tags/${tag}`,
      cloneDir,
      source.id,
    );
    paths.set(source.id, cloneDir);
    console.log(`  ✓ ${cloneDir} (${sha.slice(0, 8)})`);
  }
  return paths;
}

async function customSourceTag(source: CustomSource): Promise<string> {
  return flagValue(`--${source.id}-tag`) ?? readVersion(source.id);
}

/**
 * Run the installer into `dir`. `customSource` installs one extra module
 * from a local checkout; `modules` is always passed because `--yes` needs
 * an explicit module list (core is force-added by the installer).
 */
async function runInstaller(
  version: string,
  dir: string,
  modules: readonly string[],
  customSource?: string,
): Promise<void> {
  const npmVersion = version.replace(/^v/, '');
  const args = [
    'npx',
    '-y',
    `bmad-method@${npmVersion}`,
    'install',
    '--yes',
    '--directory',
    dir,
    '--modules',
    modules.join(','),
    '--tools',
    'claude-code',
  ];
  if (customSource) args.push('--custom-source', customSource);

  console.log(
    `Running installer → ${basename(dir)} (${modules.join(',')}${customSource ? ` + ${basename(customSource)}` : ''})`,
  );

  if (DRY_RUN) {
    console.log(`  [dry-run] ${args.join(' ')}`);
    return;
  }

  if (!KEEP_INSTALL && (await exists(dir))) {
    await rm(dir, { recursive: true, force: true });
  }
  await Bun.$`mkdir -p ${dir}`.quiet();

  await run(args, 'Installer');

  const skillsDir = join(dir, INSTALL_SKILLS_SUBDIR);
  if (!(await exists(skillsDir))) {
    console.error(`Installer ran but ${skillsDir} not found. Aborting.`);
    process.exit(1);
  }
  console.log(`  ✓ ${skillsDir}`);
}

// ────────────────────────────────────────────────────────────────────────
// Plugin tree
// ────────────────────────────────────────────────────────────────────────

async function wipePluginTree(): Promise<void> {
  console.log('Wiping plugin trees...');
  const dirs = [
    join(PLUGIN, 'skills'),
    join(PLUGIN, 'runtime'),
    PLUGIN_SHARED_DIR,
    PLUGIN_AGENTS_DIR,
    // Only the vendored scaffold, not the whole templates/ dir — its
    // README.md is hand-authored and explains why the scaffold is not
    // published as a plugin.
    MODULE_TEMPLATE_DIR,
    ...CUSTOM_SOURCES.flatMap((s) => [
      join(PLUGINS_DIR, s.pluginDir, 'skills'),
      join(PLUGINS_DIR, s.pluginDir, 'runtime'),
    ]),
  ];
  for (const dir of dirs) {
    if (!(await exists(dir))) continue;
    if (DRY_RUN) {
      console.log(`  [dry-run] rm -rf ${dir}`);
    } else {
      await rm(dir, { recursive: true, force: true });
      console.log(`  ✓ ${dir}`);
    }
  }
}

/** Copy every installed skill directory into a plugin, 1:1. */
async function copySkills(
  installDir: string,
  destDir: string,
  filter?: (name: string) => boolean,
): Promise<number> {
  const src = join(installDir, INSTALL_SKILLS_SUBDIR);
  console.log(`Copying skills → ${destDir}`);

  if (DRY_RUN) {
    console.log(`  [dry-run] would copy from ${src}`);
    return 0;
  }

  await Bun.$`mkdir -p ${destDir}`.quiet();
  const entries = await readdir(src, { withFileTypes: true });
  let copied = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (filter && !filter(entry.name)) continue;
    await Bun.$`cp -R ${join(src, entry.name)} ${destDir}/`.quiet();
    copied++;
  }

  const files = await countFiles(destDir);
  console.log(`  ✓ ${copied} skills, ${files} files`);
  return files;
}

/**
 * Rewrite machine-specific literals the installer baked into a captured
 * runtime tree, and stash nested `.gitignore` files under a name git will
 * not act on.
 *
 * A real nested `.gitignore` (e.g. `custom/.gitignore` ignoring
 * `*.user.toml`, `render/.gitignore` ignoring everything) would exclude
 * sibling template files from THIS repo's git tree — and marketplace
 * installs are git clones, so those files would vanish from the shipped
 * plugin. Store them as `dot.gitignore`; `init.sh` restores the real name.
 */
async function templatizeRuntime(dest: string, installDirName: string) {
  const files = await listFiles(dest);
  let templatized = 0;

  for (const file of files) {
    const text = await Bun.file(file).text();
    let out = text.replaceAll(installDirName, PROJECT_NAME_PLACEHOLDER);
    // The installer resolves the operator's name from $USER; a vendored
    // template must not ship whoever last ran the sync.
    out = out
      .replaceAll(
        /^(\s*user_name\s*[:=]\s*)"?[^"\n]*"?$/gm,
        (_m, p1: string) =>
          p1.trimEnd().endsWith('=')
            ? `${p1}"${USER_NAME_PLACEHOLDER}"`
            : `${p1}${USER_NAME_PLACEHOLDER}`,
      )
      // manifest.yaml install timestamps.
      .replaceAll(
        /^(\s*(?:installDate|lastUpdated):\s*).*$/gm,
        `$1${INSTALL_DATE_PLACEHOLDER}`,
      )
      // `# Date: <iso>` header comment in every per-module config.yaml.
      .replaceAll(/^(#\s*Date:\s*).*$/gm, `$1${INSTALL_DATE_PLACEHOLDER}`);

    if (out === text) continue;
    await Bun.write(file, out);
    templatized++;
  }

  for (const file of files) {
    if (basename(file) !== '.gitignore') continue;
    const renamed = `${file.slice(0, -'.gitignore'.length)}dot.gitignore`;
    await Bun.$`mv ${file} ${renamed}`.quiet();
    console.log(`  ✓ ${file.slice(dest.length + 1)} stored as dot.gitignore`);
  }

  await rehashFilesManifest(dest);

  console.log(
    `  ✓ ${files.length} runtime files captured (${templatized} templatized)`,
  );
}

/**
 * Re-point `_config/files-manifest.csv` at the templatized bytes.
 *
 * The installer hashes every runtime file as it writes it, and two of the
 * values it bakes in (the install timestamp and the operator's name)
 * change on every run — so a manifest captured verbatim makes
 * `bun run sync` non-idempotent: identical input, a different
 * files-manifest.csv, a dirty tree. Recomputing over the templatized
 * content makes the shipped manifest both deterministic and consistent
 * with the bytes next to it.
 *
 * Rows whose path is not in the captured tree are left untouched: the
 * claude-code install moves skill payloads out to `.claude/skills/`, and
 * those rows describe files this template does not carry.
 */
async function rehashFilesManifest(dest: string): Promise<void> {
  const manifestPath = join(dest, '_config/files-manifest.csv');
  if (!(await exists(manifestPath))) return;

  const lines = (await Bun.file(manifestPath).text()).split('\n');
  // Every row below is matched by an anchored regex that pins the column
  // count and the hash width, so an upstream schema change would make all
  // 1400 rows skip at once and silently restore the non-idempotency this
  // function exists to remove. Fail loudly on the header instead.
  const EXPECTED_HEADER = 'type,name,module,path,hash';
  if (lines[0] !== EXPECTED_HEADER) {
    console.error(
      `files-manifest.csv header is "${lines[0]}", expected "${EXPECTED_HEADER}".`,
    );
    console.error(
      'The manifest schema changed upstream — update rehashFilesManifest().',
    );
    process.exit(1);
  }

  let rehashed = 0;
  let resolved = 0;

  for (const [index, line] of lines.entries()) {
    // type,name,module,path,hash — every field is double-quoted.
    if (!/^("[^"]*",){4}"[0-9a-f]{64}"$/.test(line)) continue;
    const parts = line.split('","');
    const relPath = parts[3];
    if (!relPath) continue;

    const file = Bun.file(join(dest, relPath));
    if (!(await file.exists())) continue;
    resolved++;

    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(await file.arrayBuffer());
    const digest = hasher.digest('hex');
    const updated = `${parts.slice(0, 4).join('","')}","${digest}"`;
    if (updated === line) continue;
    lines[index] = updated;
    rehashed++;
  }

  if (rehashed > 0) await Bun.write(manifestPath, lines.join('\n'));
  console.log(
    `  ✓ files-manifest.csv: ${rehashed}/${resolved} resolvable hashes recomputed`,
  );
}

/**
 * Capture the installer's `_bmad/` runtime tree as a template inside the
 * plugin (`plugins/bmad/runtime/_bmad/`).
 *
 * Skills resolve config and shared scripts from `{project-root}/_bmad/...`
 * at run time — files the immutable plugin cannot provide in the user's
 * working repo. `scripts/init.sh` copies this template into a working repo
 * (see `/bmad:init`).
 */
async function captureRuntimeTemplate(): Promise<void> {
  const dest = join(PLUGIN, 'runtime/_bmad');
  console.log(`Capturing runtime template → ${dest}`);

  if (DRY_RUN) {
    console.log('  [dry-run] would copy _bmad/ runtime tree into plugin');
    return;
  }

  const src = join(INSTALL_DIR, INSTALL_RUNTIME_SUBDIR);
  if (!(await exists(src))) {
    console.error(`Installer output ${src} not found.`);
    process.exit(1);
  }

  await Bun.$`mkdir -p ${dest}`.quiet();
  await Bun.$`cp -R ${src}/. ${dest}/`.quiet();
  await templatizeRuntime(dest, basename(INSTALL_DIR));
}

/**
 * Capture the slice of a custom-source install that belongs to its sibling
 * plugin: the module's own `_bmad/<code>/` directory (config + help rows).
 * The core runtime the module's skills resolve against
 * (`_bmad/scripts/resolve_config.py`, `_bmad/custom/`) comes from the
 * `bmad` plugin, which `/bmad:init` materialises first.
 */
async function captureCustomRuntime(
  source: CustomSource,
  installDir: string,
): Promise<void> {
  const dest = join(PLUGINS_DIR, source.pluginDir, 'runtime/_bmad');
  console.log(`Capturing ${source.id} runtime → ${dest}`);

  if (DRY_RUN) {
    console.log(`  [dry-run] would copy _bmad/${source.moduleCode}/`);
    return;
  }

  const src = join(installDir, INSTALL_RUNTIME_SUBDIR, source.moduleCode);
  if (!(await exists(src))) {
    console.error(
      `Installer produced no _bmad/${source.moduleCode}/. Aborting.`,
    );
    process.exit(1);
  }

  const moduleDest = join(dest, source.moduleCode);
  await Bun.$`mkdir -p ${moduleDest}`.quiet();
  // Only the module-level metadata: config.yaml + module-help.csv. Skill
  // payloads live in the plugin's skills/ tree, and anything the installer
  // left behind under _bmad/<code>/<skill>/ was dropped from
  // skill-manifest.csv and is therefore not installed content.
  for (const name of ['config.yaml', 'module-help.csv']) {
    const file = join(src, name);
    if (await exists(file)) {
      await Bun.$`cp ${file} ${moduleDest}/`.quiet();
    }
  }

  await captureSiblingSkillManifest(source, installDir, dest);
  await pruneUnshippedHelpRows(source, moduleDest);
  await templatizeRuntime(dest, basename(installDir));
}

/**
 * Give a sibling plugin its own `_config/skill-manifest.csv`, filtered to
 * the module's rows.
 *
 * Without it the strongest gate in the repo — comparing the shipped skill
 * set against the installer's own manifest — covers `plugins/bmad` only,
 * and a partial upstream rename (say half the skills moving off the
 * `mc-` prefix) would ship a silent subset with a non-empty `skills/`
 * and a green `validate`.
 */
async function captureSiblingSkillManifest(
  source: CustomSource,
  installDir: string,
  dest: string,
): Promise<void> {
  const src = join(installDir, '_bmad/_config/skill-manifest.csv');
  if (!(await exists(src))) {
    console.error(`Installer produced no skill-manifest.csv for ${source.id}.`);
    process.exit(1);
  }

  const [header, ...rows] = (await Bun.file(src).text()).split('\n');
  const mine = rows.filter((r) => r.includes(`,"${source.moduleCode}",`));
  if (mine.length === 0) {
    console.error(
      `No skill-manifest rows for module '${source.moduleCode}'. Aborting.`,
    );
    process.exit(1);
  }

  const out = join(dest, '_config/skill-manifest.csv');
  await Bun.$`mkdir -p ${dirname(out)}`.quiet();
  await Bun.write(out, `${[header, ...mine].join('\n')}\n`);
  console.log(`  ✓ _config/skill-manifest.csv: ${mine.length} rows`);
}

/**
 * Drop help rows naming a skill the installer did not install.
 *
 * Upstream's own catalog can over-declare: manticore v1.0.1 lists
 * `mc-audio`, but that skill's frontmatter is invalid YAML, so the
 * installer's `parseSkillMd()` rejects it and it never reaches
 * `skill-manifest.csv`. Shipping the row anyway makes `bmad-help` offer
 * and route to a skill that is not there. This mirrors the installer's
 * own decision rather than overriding it.
 */
async function pruneUnshippedHelpRows(
  source: CustomSource,
  moduleDest: string,
): Promise<void> {
  const helpPath = join(moduleDest, 'module-help.csv');
  if (!(await exists(helpPath))) return;

  const shipped = new Set(
    (
      await readdir(join(PLUGINS_DIR, source.pluginDir, 'skills'), {
        withFileTypes: true,
      })
    )
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );

  const lines = (await Bun.file(helpPath).text()).split('\n');
  const dropped: string[] = [];
  const kept = lines.filter((line, index) => {
    if (index === 0 || !line) return true;
    const skill = line.split(',')[1];
    if (!skill || skill === '_meta' || shipped.has(skill)) return true;
    dropped.push(skill);
    return false;
  });

  if (dropped.length === 0) return;
  await Bun.write(helpPath, kept.join('\n'));
  console.log(
    `  ✓ module-help.csv: dropped ${dropped.length} row(s) for skills the installer did not install (${dropped.join(', ')})`,
  );
}

/**
 * Vendor the upstream module-authoring template. It is NOT published as a
 * marketplace plugin: its own `.claude-plugin/marketplace.json` declares
 * `"skills": ["./skills/my-skill"]` and that directory does not exist in
 * any upstream ref, so the entry would resolve to nothing. Shipping it as
 * a plugin asset gives module authors the scaffold without putting a dead
 * `my-module` entry in front of end users.
 */
async function vendorModuleTemplate(): Promise<void> {
  const ref = await readVersion('module-template');
  const dest = MODULE_TEMPLATE_DIR;
  console.log(`Vendoring module template @ ${ref} → ${dest}`);

  if (DRY_RUN) {
    console.log(
      `  [dry-run] would clone ${MODULE_TEMPLATE_SOURCE.repo}@${ref}`,
    );
    return;
  }

  const cloneDir = join(CLONES_DIR, 'module-template');
  const sha = await fetchRef(
    `https://github.com/${MODULE_TEMPLATE_SOURCE.repo}.git`,
    ref,
    cloneDir,
    'module-template',
  );
  if (sha !== ref) {
    console.error(`module-template resolved to ${sha}, expected ${ref}.`);
    process.exit(1);
  }

  await Bun.$`mkdir -p ${dest}`.quiet();
  await Bun.$`cp -R ${cloneDir}/. ${dest}/`.quiet();

  // Same reason as the runtime template: a nested .gitignore would strip
  // sibling files out of this repo and out of every marketplace clone.
  const gitignore = join(dest, '.gitignore');
  if (await exists(gitignore)) {
    await Bun.$`mv ${gitignore} ${join(dest, 'dot.gitignore')}`.quiet();
  }
  await rm(cloneDir, { recursive: true, force: true });
  console.log(`  ✓ ${await countFiles(dest)} files @ ${ref.slice(0, 8)}`);
}

// ────────────────────────────────────────────────────────────────────────
// Versions
// ────────────────────────────────────────────────────────────────────────

/**
 * Set the four plugin-version anchors and the core pin.
 *
 * `.plugin-version` is written LAST. It is the value every other anchor
 * is diffed against on the next run, so advancing it first turns any
 * interruption between the writes into an unrecoverable state: the
 * re-run reads the already-advanced value, decides there is nothing to
 * do, and leaves the three JSON manifests behind forever — publishing
 * new content under the previous version, which no installed user is
 * ever offered.
 *
 * The patch counter is preserved when the core version is unchanged, so
 * a re-sync cannot walk a published `6.11.0.1` back to `6.11.0.0`.
 */
async function bumpVersionAnchors(version: string): Promise<void> {
  const coreVersion = version.replace(/^v/, '');
  const currentVersion = (await Bun.file(VERSION_FILES.pluginVersion).text())
    .trim()
    .replace(/^v/, '');

  const currentPatch = currentVersion.startsWith(`${coreVersion}.`)
    ? currentVersion.slice(coreVersion.length + 1)
    : '0';
  const newPluginVersion = `${coreVersion}.${/^\d+$/.test(currentPatch) ? currentPatch : '0'}`;

  if (DRY_RUN) {
    console.log(`  [dry-run] would set plugin version to v${newPluginVersion}`);
    return;
  }

  await updateJsonVersionFiles(currentVersion, newPluginVersion);
  await writeVersionInfo('core', `v${coreVersion}`);
  console.log(`Updated .upstream-versions/core.json → v${coreVersion}`);

  await Bun.write(VERSION_FILES.pluginVersion, `v${newPluginVersion}\n`);
  console.log(`Updated .plugin-version → v${newPluginVersion}`);

  // README badge is regenerated AFTER bumpModuleVersions() writes the
  // remaining .upstream-versions/<mod>.json files; otherwise the badge and
  // version table reflect stale module versions.
}

/**
 * The installer writes canonical module versions to
 * `_bmad/_config/manifest.yaml` — the single source of truth for what was
 * actually resolved and pinned. Per-module `_bmad/<mod>/config.yaml` files
 * hold runtime config, and their `# Version:` header is the *installer*
 * version, not the module's.
 */
async function bumpModuleVersions(installDir: string, ids: readonly string[]) {
  if (DRY_RUN) {
    console.log('  [dry-run] would bump module versions from installer output');
    return;
  }

  const manifestPath = join(installDir, '_bmad/_config/manifest.yaml');
  if (!(await exists(manifestPath))) {
    console.error(`${manifestPath} not found; cannot record module versions.`);
    process.exit(1);
  }

  const manifest = parseYaml(await Bun.file(manifestPath).text()) as {
    modules?: Array<{ name: string; version: string }>;
  };
  const entries = manifest.modules ?? [];

  for (const id of ids) {
    // 'bmm' ships inside core and carries the core version.
    if (id === 'bmm') continue;
    const entry = entries.find((m) => m.name === id);
    if (!entry?.version) {
      console.error(
        `No manifest entry for module '${id}' — the installer did not install it.`,
      );
      process.exit(1);
    }
    const tag = entry.version.startsWith('v')
      ? entry.version
      : `v${entry.version}`;
    await writeVersionInfo(id, tag);
    console.log(`Updated .upstream-versions/${id}.json → ${tag}`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

const version = await resolveTargetVersion();
console.log(`Target core version: ${version}`);
console.log(`Registry modules:    ${MODULES.join(', ')}`);
console.log(
  `Custom sources:      ${CUSTOM_SOURCES.map((s) => s.id).join(', ')}`,
);
console.log(DRY_RUN ? '\nDry run — no changes will be made\n' : '');

const customPaths = await cloneCustomSources();

await runInstaller(version, INSTALL_DIR, MODULES);
await wipePluginTree();

const bmadFiles = await copySkills(INSTALL_DIR, join(PLUGIN, 'skills'));
await captureRuntimeTemplate();
await vendorModuleTemplate();

for (const source of CUSTOM_SOURCES) {
  const installDir = join(ROOT, `.upstream-install-${source.id}`);
  const clone = customPaths.get(source.id);
  await runInstaller(version, installDir, ['bmm'], clone ?? '<clone>');
  await copySkills(
    installDir,
    join(PLUGINS_DIR, source.pluginDir, 'skills'),
    (name) => name.startsWith(source.skillPrefix),
  );
  await captureCustomRuntime(source, installDir);
  // Only now is the tag true of what the repo actually ships.
  if (!DRY_RUN) {
    const tag = await customSourceTag(source);
    await writeVersionInfo(source.id, tag);
    console.log(`Updated .upstream-versions/${source.id}.json → ${tag}`);
  }
  if (!DRY_RUN && !KEEP_INSTALL) {
    await rm(installDir, { recursive: true, force: true });
    if (clone) await rm(clone, { recursive: true, force: true });
  }
}

await bumpVersionAnchors(version);
await bumpModuleVersions(INSTALL_DIR, MODULES);
if (!DRY_RUN) await updateReadmeBadge();

console.log('');
console.log(`✓ Sync complete: ${bmadFiles} files in plugins/bmad/skills/`);
