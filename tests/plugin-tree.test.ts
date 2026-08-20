import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const PLUGIN_DIR = join(ROOT, 'plugins/bmad');
const SKILLS_DIR = join(PLUGIN_DIR, 'skills');
const RUNTIME_DIR = join(PLUGIN_DIR, 'runtime/_bmad');
const MANTICORE_DIR = join(ROOT, 'plugins/bmad-manticore');

function dirNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

describe('skill tree', () => {
  test('ships exactly the surface the installer declared', () => {
    const csv = readFileSync(
      join(RUNTIME_DIR, '_config/skill-manifest.csv'),
      'utf8',
    );
    const declared = new Set(
      csv
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map((line) => line.match(/^"([^"]+)"/)?.[1]),
    );
    const shipped = new Set(dirNames(SKILLS_DIR));

    expect([...declared].filter((id) => id && !shipped.has(id))).toEqual([]);
    expect([...shipped].filter((id) => !declared.has(id))).toEqual([]);
  });

  test('skills removed upstream in v6.11.0 are absent', () => {
    // Removed outright (not shimmed) by the v6.11.0 consolidation.
    const removed = [
      'bmad-index-docs',
      'bmad-shard-doc',
      'bmad-check-implementation-readiness',
      'bmad-agent-tech-writer',
      // Retired before v6.11 and never reinstated.
      'bmad-distillator',
      'bmad-create-ux-design',
      'bmad-investigate',
      'gds-create-gdd',
      'gds-edit-gdd',
      'gds-validate-gdd',
    ];
    const present = removed.filter((name) =>
      existsSync(join(SKILLS_DIR, name)),
    );
    expect(present).toEqual([]);
  });

  test('the v6.11.0 replacement skills are present', () => {
    const expected = [
      'bmad-build',
      'bmad-build-auto',
      'bmad-review',
      'bmad-deep-recon',
      'bmad-project-context',
      'bmad-sprint-planning',
      'bmad-prd',
      'bmad-architecture',
      'bmad-ux',
      'bmad-spec',
      'bmad-retrospective',
      'bmad-loop-setup',
      'bmad-loop-resolve',
      'bmad-loop-sweep',
      'bmad-tea',
      'gds-gdd',
    ];
    const missing = expected.filter(
      (name) => !existsSync(join(SKILLS_DIR, name, 'SKILL.md')),
    );
    expect(missing).toEqual([]);
  });

  test('the v6 deprecation shims ship, because external modules call them', () => {
    // Reversal of the pre-v6.11 prune. Upstream's v6-shims/README.md:
    // "External module repos (gds, loop, tea, bmb, os-utils) still invoke
    // these IDs, so they ship by default. Removal rides the v7 cut."
    const shims = [
      'bmad-quick-dev',
      'bmad-dev-auto',
      'bmad-create-story',
      'bmad-dev-story',
      'bmad-market-research',
      'bmad-review-adversarial-general',
      'bmad-document-project',
      'bmad-sprint-status',
    ];
    const missing = shims.filter(
      (name) => !existsSync(join(SKILLS_DIR, name, 'SKILL.md')),
    );
    expect(missing).toEqual([]);
  });
});

describe('runtime template', () => {
  test('ships the files skills resolve from {project-root}/_bmad', () => {
    const required = [
      'config.toml',
      'config.user.toml',
      'scripts/memlog.py',
      'scripts/resolve_config.py',
      'scripts/resolve_customization.py',
      // v6.11: bmad-build and bmad-build-auto are pure loaders that run
      // render_skill.py and halt if it is missing.
      'scripts/render_skill.py',
      'scripts/config_utils.py',
      '_config/bmad-help.csv',
      '_config/manifest.yaml',
      '_config/skill-manifest.csv',
      'bmm/config.yaml',
      'bmad-loop/config.yaml',
      'custom/config.toml',
      // stored under a safe name so it can't ignore sibling template
      // files in this repo; init.sh restores the real .gitignore name
      'custom/dot.gitignore',
      'render/dot.gitignore',
    ];
    const missing = required.filter(
      (rel) => !existsSync(join(RUNTIME_DIR, rel)),
    );
    expect(missing).toEqual([]);
    expect(existsSync(join(RUNTIME_DIR, 'custom/.gitignore'))).toBe(false);
    expect(existsSync(join(RUNTIME_DIR, 'render/.gitignore'))).toBe(false);
  });

  test('machine-specific install values are templatized', () => {
    const configToml = readFileSync(join(RUNTIME_DIR, 'config.toml'), 'utf8');
    expect(configToml).toContain('__BMAD_PROJECT_NAME__');
    expect(configToml).not.toContain('.upstream-install');

    // The v6.10 tree shipped whoever ran the sync as a literal user name.
    const userToml = readFileSync(
      join(RUNTIME_DIR, 'config.user.toml'),
      'utf8',
    );
    expect(userToml).toContain('user_name = "__BMAD_USER_NAME__"');
    for (const module of ['bmm', 'gds', 'tea', 'bmad-loop']) {
      const yaml = readFileSync(
        join(RUNTIME_DIR, module, 'config.yaml'),
        'utf8',
      );
      expect(yaml).toContain('user_name: __BMAD_USER_NAME__');
    }

    const manifest = readFileSync(
      join(RUNTIME_DIR, '_config/manifest.yaml'),
      'utf8',
    );
    expect(manifest).toContain('installDate: __BMAD_INSTALL_DATE__');
    expect(manifest).not.toMatch(/installDate: \d{4}-/);
  });

  test('records the module versions the installer resolved', () => {
    const manifest = readFileSync(
      join(RUNTIME_DIR, '_config/manifest.yaml'),
      'utf8',
    );
    const resolved: Array<[string, string]> = [
      ['core', '6.11.0'],
      ['bmb', 'v2.2.1'],
      ['cis', 'v0.3.1'],
      ['gds', 'v0.7.1'],
      ['tea', 'v1.23.3'],
      ['bmad-loop', 'v0.11.0'],
    ];
    for (const [id, version] of resolved) {
      const pinned = JSON.parse(
        readFileSync(join(ROOT, '.upstream-versions', `${id}.json`), 'utf8'),
      ).version;
      expect(pinned.replace(/^v/, '')).toBe(version.replace(/^v/, ''));
      expect(manifest).toContain(`version: ${version}`);
    }
  });
});

describe('marketplace', () => {
  test('every declared plugin resolves to a real plugin directory', () => {
    const marketplace = JSON.parse(
      readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'),
    );
    expect(marketplace.plugins.map((p: { name: string }) => p.name)).toEqual([
      'bmad',
      'bmad-manticore',
    ]);

    for (const entry of marketplace.plugins) {
      const manifest = JSON.parse(
        readFileSync(
          join(ROOT, entry.source, '.claude-plugin/plugin.json'),
          'utf8',
        ),
      );
      expect(manifest.name).toBe(entry.name);
      expect(manifest.version).toBe(entry.version);
      expect(
        dirNames(join(ROOT, entry.source, 'skills')).length,
      ).toBeGreaterThan(0);
    }
  });

  test('the bmad plugin exposes /bmad:init', () => {
    // The manifest's `skills` / `commands` keys are no-ops for this
    // layout (Claude Code always scans skills/ and commands/), so pinning
    // them would fail on a valid cleanup and pass on nothing real. Assert
    // the entry points instead.
    expect(existsSync(join(PLUGIN_DIR, 'commands/init.md'))).toBe(true);
    expect(existsSync(join(PLUGIN_DIR, 'scripts/init.sh'))).toBe(true);
  });

  test('manticore ships its mc-* skills and module metadata', () => {
    const skills = dirNames(join(MANTICORE_DIR, 'skills'));
    expect(skills.every((name) => name.startsWith('mc-'))).toBe(true);
    expect(skills).toContain('mc-agent');
    expect(skills).toContain('mc-setup');
    // Its help rows are what /bmad:init --with-plugin merges into the
    // aggregate catalog.
    const helpPath = join(
      MANTICORE_DIR,
      'runtime/_bmad/manticore/module-help.csv',
    );
    expect(existsSync(helpPath)).toBe(true);

    // Upstream v1.0.1 declares mc-audio, but its frontmatter is invalid
    // YAML so the installer refuses to install it. The capture drops the
    // row; shipping it would make bmad-help route to a missing skill.
    const help = readFileSync(helpPath, 'utf8');
    expect(help).not.toContain(',mc-audio,');
    for (const row of help.split('\n').slice(1).filter(Boolean)) {
      const skill = row.split(',')[1];
      if (!skill || skill === '_meta') continue;
      expect(skills).toContain(skill);
    }

    // The sibling gets its own installer manifest so the skill-surface
    // gate covers it, not just the aggregate plugin.
    const manifest = readFileSync(
      join(MANTICORE_DIR, 'runtime/_bmad/_config/skill-manifest.csv'),
      'utf8',
    );
    const declared = manifest
      .split('\n')
      .slice(1)
      .filter(Boolean)
      .map((line) => line.match(/^"([^"]+)"/)?.[1]);
    expect(declared.sort()).toEqual([...skills].sort());
  });
});

describe('vendored module template', () => {
  test('is present but deliberately unpublished', () => {
    const dir = join(PLUGIN_DIR, 'templates/module-template');
    expect(existsSync(join(dir, 'README.md'))).toBe(true);
    // A live .gitignore here would strip its siblings from every
    // marketplace clone.
    expect(existsSync(join(dir, 'dot.gitignore'))).toBe(true);
    expect(existsSync(join(dir, '.gitignore'))).toBe(false);

    const marketplace = JSON.parse(
      readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'),
    );
    const sources = marketplace.plugins.map(
      (p: { source: string }) => p.source,
    );
    expect(sources).not.toContain('./plugins/bmad/templates/module-template');
  });
});
