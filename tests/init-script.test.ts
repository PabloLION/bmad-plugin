import { afterAll, describe, expect, test } from 'bun:test';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const INIT_SH = join(ROOT, 'plugins/bmad/scripts/init.sh');

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bmad-init-'));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** path → content, for every file under `root`. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(root, full)] = readFileSync(full, 'utf8');
    }
  };
  walk(root);
  return out;
}

/**
 * Minimal RFC4180 reader. `split(',')` cannot check this catalog: 34 of
 * its rows carry commas inside quoted fields, so a naive split reports
 * 20+ columns for a perfectly good row and cannot see a corrupted one.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

async function runInitAt(script: string, ...args: string[]): Promise<string> {
  const proc = Bun.spawn(['bash', script, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`init.sh exited with ${exitCode}: ${stderr}`);
  }
  return stdout;
}

async function runInit(...args: string[]): Promise<string> {
  return runInitAt(INIT_SH, ...args);
}

async function runGit(cwd: string, ...args: string[]): Promise<void> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if ((await proc.exited) !== 0) {
    throw new Error(`git ${args.join(' ')} failed`);
  }
}

describe('init.sh', () => {
  test('creates the full working-repo structure', async () => {
    const dir = makeTempDir();
    const output = await runInit(dir);

    for (const rel of [
      '_bmad/config.toml',
      '_bmad/scripts/memlog.py',
      '_bmad/scripts/resolve_customization.py',
      '_bmad/_config/bmad-help.csv',
      '_bmad/custom/config.toml',
      '_bmad/custom/config.user.toml',
      '_bmad-output/planning-artifacts',
      '_bmad-output/implementation-artifacts',
      'docs',
      'skills/test-artifacts',
    ]) {
      expect(existsSync(join(dir, rel))).toBe(true);
    }
    // dot.gitignore in the template materializes as a real .gitignore
    const gitignore = join(dir, '_bmad/custom/.gitignore');
    expect(existsSync(gitignore)).toBe(true);
    expect(readFileSync(gitignore, 'utf8')).toContain('*.user.toml');
    expect(existsSync(join(dir, '_bmad/custom/dot.gitignore'))).toBe(false);
    expect(output).toContain('created');
  });

  test('substitutes project name, user name and install date', async () => {
    const dir = makeTempDir();
    await runInit(dir);

    const configToml = readFileSync(join(dir, '_bmad/config.toml'), 'utf8');
    const userToml = readFileSync(join(dir, '_bmad/config.user.toml'), 'utf8');
    const bmmYaml = readFileSync(join(dir, '_bmad/bmm/config.yaml'), 'utf8');
    const manifest = readFileSync(
      join(dir, '_bmad/_config/manifest.yaml'),
      'utf8',
    );

    expect(configToml).toContain(`project_name = "${basename(dir)}"`);
    expect(bmmYaml).toContain(`project_name: ${basename(dir)}`);
    // No placeholder may survive into a working repo — a leftover
    // __BMAD_USER_NAME__ would be read back as the operator's name.
    for (const text of [configToml, userToml, bmmYaml, manifest]) {
      expect(text).not.toMatch(/__BMAD_[A-Z_]+__/);
    }
    expect(userToml).toMatch(/user_name = "(?!__)[^"]+"/);
    expect(manifest).toMatch(/installDate: \d{4}-\d{2}-\d{2}T/);
  });

  test('is idempotent: a second run changes nothing', async () => {
    const dir = makeTempDir();
    await runInit(dir);
    const before = snapshot(join(dir, '_bmad'));

    const output = await runInit(dir);
    expect(output).toContain('Done: 0 created, 0 refreshed');
    expect(output).toContain('Repo was already initialized');
    expect(snapshot(join(dir, '_bmad'))).toEqual(before);
  });

  test('preserves the user-owned custom/ layer but refreshes installer-owned files', async () => {
    const dir = makeTempDir();
    await runInit(dir);

    // custom/ is the declared user-editable layer — never touched.
    const customPath = join(dir, '_bmad/custom/config.toml');
    writeFileSync(customPath, '# my overrides\n');

    // Everything else is installer-managed. Upstream's own header says
    // so, and a repo initialized by an older plugin must be upgradable.
    const helpPath = join(dir, '_bmad/_config/bmad-help.csv');
    const scriptPath = join(dir, '_bmad/scripts/memlog.py');
    writeFileSync(helpPath, 'module,skill\nstale,rows\n');
    writeFileSync(scriptPath, '# stale\n');

    const output = await runInit(dir);

    expect(readFileSync(customPath, 'utf8')).toBe('# my overrides\n');
    expect(readFileSync(scriptPath, 'utf8')).not.toBe('# stale\n');
    expect(readFileSync(helpPath, 'utf8')).not.toContain('stale,rows');
    expect(output).toContain('refreshed');
  });

  test('upgrades a repo whose runtime predates the current template', async () => {
    // The v6.10 shape: a subset of today's files, one of them carrying
    // the sync machine's user name — the leak this rebuild removed.
    const dir = makeTempDir();
    mkdirSync(join(dir, '_bmad/scripts'), { recursive: true });
    writeFileSync(
      join(dir, '_bmad/config.user.toml'),
      '[core]\nuser_name = "Dev"\n',
    );
    writeFileSync(join(dir, '_bmad/scripts/memlog.py'), '# old\n');

    await runInit(dir);

    const userToml = readFileSync(join(dir, '_bmad/config.user.toml'), 'utf8');
    expect(userToml).not.toContain('user_name = "Dev"');
    // Files the older runtime never had are installed.
    expect(existsSync(join(dir, '_bmad/scripts/render_skill.py'))).toBe(true);
    expect(existsSync(join(dir, '_bmad/render/.gitignore'))).toBe(true);
  });

  test('--dry-run creates nothing and does not claim it did', async () => {
    const dir = makeTempDir();
    const output = await runInit(dir, '--dry-run');
    expect(output).toContain('[dry-run]');
    expect(output).toContain('Done (dry run): would create');
    expect(output).not.toMatch(/^Done: \d+ created/m);
    expect(existsSync(join(dir, '_bmad'))).toBe(false);
    expect(existsSync(join(dir, '_bmad-output'))).toBe(false);
  });

  test('substituted values stay parseable in TOML and YAML', async () => {
    // A git identity or directory name carrying a quote, a colon, a hash
    // or a backslash lands inside `user_name = "…"` (TOML) and
    // `user_name: …` (unquoted YAML). Unsanitized, it makes the file
    // unparseable — and every skill calls resolve_config.py on it.
    const dir = mkdtempSync(join(tmpdir(), 'bmad-init-a&b|c\\d '));
    tempDirs.push(dir);
    await runGit(dir, 'init', '-q', '.');
    await runGit(
      dir,
      'config',
      'user.name',
      'He said "hi": C:\\Users\\tg #1 & co',
    );

    await runInit(dir);

    const userToml = readFileSync(join(dir, '_bmad/config.user.toml'), 'utf8');
    const configToml = readFileSync(join(dir, '_bmad/config.toml'), 'utf8');
    for (const text of [userToml, configToml]) {
      // No unescaped quote, backslash or newline inside the value.
      for (const line of text.split('\n')) {
        if (!/^(user_name|project_name)\s*=/.test(line)) continue;
        expect(line).toMatch(/^(user_name|project_name) = "[^"\\]*"$/);
      }
    }
    for (const module of ['bmm', 'gds', 'tea']) {
      const yaml = readFileSync(
        join(dir, `_bmad/${module}/config.yaml`),
        'utf8',
      );
      for (const line of yaml.split('\n')) {
        if (!/^(user_name|project_name):/.test(line)) continue;
        // No YAML-significant character survived into the scalar.
        expect(line).not.toMatch(/:\s.*[:#"']/);
      }
    }
    // And nothing was silently dropped to empty.
    expect(userToml).toMatch(/user_name = "\S[^"]*"/);
  });

  test('--with-plugin merges a sibling plugin exactly once', async () => {
    const dir = makeTempDir();
    await runInit(dir, '--with-plugin', 'bmad-manticore');

    const helpPath = join(dir, '_bmad/_config/bmad-help.csv');
    const manticoreRows = () =>
      parseCsv(readFileSync(helpPath, 'utf8')).filter(
        (row) => row[0] === 'BMad Manticore',
      );

    const first = manticoreRows().length;
    expect(first).toBeGreaterThan(0);
    expect(existsSync(join(dir, '_bmad/manticore/module-help.csv'))).toBe(true);
    // A sibling's _config/ holds its own filtered skill-manifest, which
    // exists for the repo's gates — materializing it would replace the
    // aggregate's 110 rows with the sibling's 15.
    const skillManifest = parseCsv(
      readFileSync(join(dir, '_bmad/_config/skill-manifest.csv'), 'utf8'),
    );
    expect(skillManifest.length).toBeGreaterThan(100);

    // The installer writes bmad-help.csv without a trailing newline, so a
    // naive append glues the first merged row onto the last existing one.
    // split(',') cannot see that — 34 rows legitimately contain commas
    // inside quoted fields — so parse it properly.
    for (const row of parseCsv(readFileSync(helpPath, 'utf8'))) {
      expect(row.length).toBe(13);
    }

    await runInit(dir, '--with-plugin', 'bmad-manticore');
    expect(manticoreRows().length).toBe(first);
  });

  test('--with-plugin replaces the module rows rather than accumulating them', async () => {
    // A sibling point release that reworded one row and dropped another
    // must not leave the old wording or the removed skill behind:
    // bmad-help routes users from this catalog.
    const dir = makeTempDir();
    const plugins = makeTempDir();
    cpSync(join(ROOT, 'plugins'), join(plugins, 'plugins'), {
      recursive: true,
    });
    const initSh = join(plugins, 'plugins/bmad/scripts/init.sh');
    const siblingHelp = join(
      plugins,
      'plugins/bmad-manticore/runtime/_bmad/manticore/module-help.csv',
    );

    await runInitAt(initSh, dir, '--with-plugin', 'bmad-manticore');

    const original = readFileSync(siblingHelp, 'utf8');
    writeFileSync(
      siblingHelp,
      original
        .split('\n')
        .filter((line) => !line.startsWith('BMad Manticore,mc-beats,'))
        .map((line) =>
          line.startsWith('BMad Manticore,mc-retro,')
            ? line.replace('Retro,RT,', 'Retro,RT,REWORDED ')
            : line,
        )
        .join('\n'),
    );

    await runInitAt(initSh, dir, '--with-plugin', 'bmad-manticore');

    const rows = parseCsv(
      readFileSync(join(dir, '_bmad/_config/bmad-help.csv'), 'utf8'),
    ).filter((row) => row[0] === 'BMad Manticore');
    expect(rows.filter((r) => r[1] === 'mc-retro')).toHaveLength(1);
    expect(rows.some((r) => r[1] === 'mc-beats')).toBe(false);
    expect(rows.some((r) => r.join(',').includes('REWORDED'))).toBe(true);
  });

  test('a refresh keeps the date the repo was first initialized with', async () => {
    // Restamping on every run would report a refresh of every
    // date-bearing file forever, drowning the changes that matter. Two
    // runs inside the same second would not notice, so plant a date.
    const dir = makeTempDir();
    await runInit(dir);

    const manifestPath = join(dir, '_bmad/_config/manifest.yaml');
    const planted = '2020-01-02T03:04:05.000Z';
    writeFileSync(
      manifestPath,
      readFileSync(manifestPath, 'utf8').replaceAll(
        /\d{4}-\d{2}-\d{2}T[\d:.]+Z/g,
        planted,
      ),
    );

    const output = await runInit(dir);
    expect(readFileSync(manifestPath, 'utf8')).toContain(planted);
    expect(output).toContain('Done: 0 created, 0 refreshed');
  });

  test('naming the same sibling twice merges it once', async () => {
    const dir = makeTempDir();
    await runInit(
      dir,
      '--with-plugin',
      'bmad-manticore',
      '--with-plugin=bmad-manticore',
    );
    const rows = parseCsv(
      readFileSync(join(dir, '_bmad/_config/bmad-help.csv'), 'utf8'),
    ).filter((row) => row[0] === 'BMad Manticore');
    const ids = rows.map((r) => r[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('without --with-plugin no sibling rows are merged', async () => {
    const dir = makeTempDir();
    await runInit(dir);
    const help = readFileSync(join(dir, '_bmad/_config/bmad-help.csv'), 'utf8');
    expect(help).not.toContain('BMad Manticore,');
    expect(existsSync(join(dir, '_bmad/manticore'))).toBe(false);
  });

  test('rejects an unknown option and an unknown sibling plugin', async () => {
    const dir = makeTempDir();
    await expect(runInit(dir, '--nope')).rejects.toThrow(/unknown option/);
    await expect(runInit(dir, '--with-plugin', 'not-a-plugin')).rejects.toThrow(
      /no runtime template/,
    );
  });
});
