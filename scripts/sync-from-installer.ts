/**
 * Installer-based sync (replaces sync-upstream-content.ts and friends).
 *
 * Runs the official `npx bmad-method@<version> install --tools claude-code`
 * into `.upstream-install/`, then copies its `.claude/skills/` output 1:1
 * into `plugins/bmad/skills/`. The installer already produces a Claude Code
 * native tree (correct flat layout, `customize.toml` per skill,
 * agents-as-skills, etc.), so the plugin is a thin wrapper over it.
 *
 * Run:
 *   bun scripts/sync-from-installer.ts                 # use core version
 *                                                       # from .upstream-versions/core.json
 *   bun scripts/sync-from-installer.ts --tag v6.5.0    # pin
 *   bun scripts/sync-from-installer.ts --dry-run       # preview only
 *   bun scripts/sync-from-installer.ts --keep-install  # don't wipe .upstream-install/
 */

import { exists, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  updateJsonVersionFiles,
  updateReadmeBadge,
  VERSION_FILES,
} from './lib/bump-utils.ts';
import { PLUGIN, ROOT } from './lib/config.ts';
import { writeVersionInfo } from './lib/upstream-sources.ts';

// ────────────────────────────────────────────────────────────────────────
// Args + paths
// ────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_INSTALL = process.argv.includes('--keep-install');
const TAG_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--tag');
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();

const INSTALL_DIR = join(ROOT, '.upstream-install');
const INSTALL_SKILLS_DIR = join(INSTALL_DIR, '.claude/skills');
const INSTALL_BMAD_DIR = join(INSTALL_DIR, '_bmad');

const PLUGIN_SKILLS_DIR = join(PLUGIN, 'skills');
const PLUGIN_SHARED_DIR = join(PLUGIN, '_shared');
const PLUGIN_AGENTS_DIR = join(PLUGIN, 'agents');
const PLUGIN_TEMPLATES_DIR = join(PLUGIN, 'templates');
const PLUGIN_BMAD_TEMPLATE_DIR = join(PLUGIN, '_bmad-template');

const MODULES = ['bmm', 'bmb', 'cis', 'gds', 'tea'] as const;

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

async function resolveTargetVersion(): Promise<string> {
  if (TAG_OVERRIDE) return TAG_OVERRIDE;
  // Read from .upstream-versions/core.json
  const corePath = join(ROOT, '.upstream-versions/core.json');
  const data: { version: string } = await Bun.file(corePath).json();
  return data.version;
}

async function runInstaller(version: string): Promise<void> {
  // Strip leading 'v' for npm versioning
  const npmVersion = version.replace(/^v/, '');
  console.log(`Running: npx bmad-method@${npmVersion} install ...`);

  if (DRY_RUN) {
    console.log(
      `  [dry-run] would run: npx -y bmad-method@${npmVersion} install --yes --directory ${INSTALL_DIR} --modules ${MODULES.join(',')} --tools claude-code`,
    );
    return;
  }

  // Wipe old install first (unless --keep-install)
  if (!KEEP_INSTALL && (await exists(INSTALL_DIR))) {
    await rm(INSTALL_DIR, { recursive: true, force: true });
  }
  await Bun.$`mkdir -p ${INSTALL_DIR}`.quiet();

  const proc = Bun.spawn(
    [
      'npx',
      '-y',
      `bmad-method@${npmVersion}`,
      'install',
      '--yes',
      '--directory',
      INSTALL_DIR,
      '--modules',
      MODULES.join(','),
      '--tools',
      'claude-code',
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  );

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error(`Installer failed (exit ${exitCode}):`);
    console.error(stderr);
    process.exit(1);
  }

  if (!(await exists(INSTALL_SKILLS_DIR))) {
    console.error(
      `Installer ran but ${INSTALL_SKILLS_DIR} not found. Aborting.`,
    );
    process.exit(1);
  }

  console.log(`✓ Installer completed → ${INSTALL_SKILLS_DIR}`);
}

async function wipePluginTree(): Promise<void> {
  console.log('Wiping plugin tree...');
  for (const dir of [
    PLUGIN_SKILLS_DIR,
    PLUGIN_SHARED_DIR,
    PLUGIN_AGENTS_DIR,
    PLUGIN_TEMPLATES_DIR,
    PLUGIN_BMAD_TEMPLATE_DIR,
  ]) {
    if (await exists(dir)) {
      if (DRY_RUN) {
        console.log(`  [dry-run] rm -rf ${dir}`);
      } else {
        await rm(dir, { recursive: true, force: true });
        console.log(`  ✓ ${dir}`);
      }
    }
  }
}

/**
 * Bundle the installer's `_bmad/` runtime scaffolding under
 * `plugins/bmad/_bmad-template/` so the `scaffold-bmad.py` PreToolUse hook
 * can seed it into the user's project on first BMAD skill invocation.
 *
 * Identity fields are sanitized (the installer baked our local install
 * directory's name + macOS short username into them). Users can override
 * by editing `_bmad/config.user.toml` or re-running `npx bmad-method
 * install`.
 */
async function bundleBmadTemplate(): Promise<void> {
  console.log(`Bundling ${INSTALL_BMAD_DIR} → ${PLUGIN_BMAD_TEMPLATE_DIR}`);

  if (DRY_RUN) {
    console.log(
      '  [dry-run] would copy _bmad/ template + sanitize identity fields',
    );
    return;
  }

  if (!(await exists(INSTALL_BMAD_DIR))) {
    console.warn(`  ⚠ ${INSTALL_BMAD_DIR} not found; skipping template bundle`);
    return;
  }

  await Bun.$`mkdir -p ${PLUGIN_BMAD_TEMPLATE_DIR}`.quiet();
  await Bun.$`cp -R ${INSTALL_BMAD_DIR}/. ${PLUGIN_BMAD_TEMPLATE_DIR}/`.quiet();

  // Sanitize: the installer captured our local cwd basename + macOS short
  // username. Replace with neutral defaults so users don't inherit them.
  const findProc = Bun.spawn(['find', PLUGIN_BMAD_TEMPLATE_DIR, '-type', 'f'], {
    stdout: 'pipe',
  });
  const files = (await new Response(findProc.stdout).text())
    .trim()
    .split('\n')
    .filter(Boolean);

  const macUser = (process.env.USER ?? '').trim();
  let sanitizedCount = 0;
  for (const file of files) {
    const original = await Bun.file(file).text();
    let replaced = original
      .replace(/user_name: \.upstream-install/g, 'user_name: Friend')
      .replace(/project_name: \.upstream-install/g, 'project_name: ""')
      .replace(/project_name = "\.upstream-install"/g, 'project_name = ""');
    if (macUser) {
      // Capitalized form is what the installer wrote (e.g. "Tgorka").
      const macUserCap =
        macUser.charAt(0).toUpperCase() + macUser.slice(1).toLowerCase();
      replaced = replaced
        .replace(
          new RegExp(`user_name: ${macUserCap}\\b`, 'g'),
          'user_name: Friend',
        )
        .replace(
          new RegExp(`user_name = "${macUserCap}"`, 'g'),
          'user_name = "Friend"',
        );
    }
    if (replaced !== original) {
      await Bun.write(file, replaced);
      sanitizedCount += 1;
    }
  }

  console.log(
    `  ✓ ${files.length} files bundled (${sanitizedCount} sanitized)`,
  );
}

async function copyInstallerSkills(): Promise<number> {
  console.log(`Copying ${INSTALL_SKILLS_DIR} → ${PLUGIN_SKILLS_DIR}`);

  if (DRY_RUN) {
    const proc = Bun.spawn(['find', INSTALL_SKILLS_DIR, '-type', 'f'], {
      stdout: 'pipe',
    });
    const stdout = await new Response(proc.stdout).text();
    const count = stdout.trim().split('\n').filter(Boolean).length;
    console.log(`  [dry-run] would copy ${count} files`);
    return count;
  }

  // Use cp -r for raw 1:1 copy. The installer has already done all
  // path rewriting and merging — we just mirror its output.
  await Bun.$`mkdir -p ${PLUGIN_SKILLS_DIR}`.quiet();
  await Bun.$`cp -R ${INSTALL_SKILLS_DIR}/. ${PLUGIN_SKILLS_DIR}/`.quiet();

  const proc = Bun.spawn(['find', PLUGIN_SKILLS_DIR, '-type', 'f'], {
    stdout: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const count = stdout.trim().split('\n').filter(Boolean).length;
  console.log(`  ✓ ${count} files copied`);
  return count;
}

async function bumpVersionAnchors(version: string): Promise<void> {
  // Plugin version: <core-version>.0
  const coreVersion = version.replace(/^v/, '');
  const newPluginVersion = `${coreVersion}.0`;
  const newPluginVersionPrefixed = `v${newPluginVersion}`;

  if (DRY_RUN) {
    console.log(
      `  [dry-run] would set plugin version to ${newPluginVersionPrefixed}`,
    );
    return;
  }

  // Read current plugin version (find-and-replace needs it)
  const currentRaw = (
    await Bun.file(VERSION_FILES.pluginVersion).text()
  ).trim();
  const currentVersion = currentRaw.replace(/^v/, '');

  // .plugin-version
  await Bun.write(VERSION_FILES.pluginVersion, `${newPluginVersionPrefixed}\n`);
  console.log(`Updated .plugin-version → ${newPluginVersionPrefixed}`);

  // package.json + plugin.json + marketplace.json (via shared helper)
  await updateJsonVersionFiles(currentVersion, newPluginVersion);

  // .upstream-versions/core.json
  await writeVersionInfo('core', `v${coreVersion}`);
  console.log(`Updated .upstream-versions/core.json → v${coreVersion}`);

  // README badge is regenerated AFTER bumpModuleVersions() writes the
  // remaining .upstream-versions/<mod>.json files; otherwise the badge
  // and version table reflect stale module versions.
}

async function bumpModuleVersions(): Promise<void> {
  if (DRY_RUN) {
    console.log('  [dry-run] would bump module versions from installer output');
    return;
  }

  // The installer writes canonical module versions to
  // `_bmad/_config/manifest.yaml` — that's the single source of truth for
  // what was actually pinned. Per-module `_bmad/<mod>/config.yaml` files
  // hold runtime config, not version metadata.
  const manifestPath = join(INSTALL_DIR, '_bmad/_config/manifest.yaml');
  if (!(await exists(manifestPath))) {
    console.warn(
      `  ⚠ ${manifestPath} not found; skipping module version bumps`,
    );
    return;
  }

  const manifest = parseYaml(await Bun.file(manifestPath).text()) as {
    modules?: Array<{ name: string; version: string }>;
  };
  const entries = manifest.modules ?? [];

  for (const mod of MODULES) {
    if (mod === 'bmm') continue; // 'bmm' is core, handled separately
    const entry = entries.find((m) => m.name === mod);
    if (!entry?.version) {
      console.warn(
        `  ⚠ no manifest entry for module '${mod}', leaving version untouched`,
      );
      continue;
    }
    const tag = entry.version.startsWith('v')
      ? entry.version
      : `v${entry.version}`;
    await writeVersionInfo(mod, tag);
    console.log(`Updated .upstream-versions/${mod}.json → ${tag}`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

const version = await resolveTargetVersion();
console.log(`Target core version: ${version}`);
console.log(`Modules:             ${MODULES.join(', ')}`);
console.log(DRY_RUN ? '\nDry run — no changes will be made\n' : '');

await runInstaller(version);
await wipePluginTree();
const fileCount = await copyInstallerSkills();
await bundleBmadTemplate();
await bumpVersionAnchors(version);
await bumpModuleVersions();
// Regenerate README + badge files after both core and module versions
// have been written (the badge generator reads .upstream-versions/*.json).
if (!DRY_RUN) await updateReadmeBadge();

console.log('');
console.log(`✓ Sync complete: ${fileCount} files in plugins/bmad/skills/`);
