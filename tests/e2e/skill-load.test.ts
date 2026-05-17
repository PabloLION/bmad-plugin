import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PLUGIN_DIR = resolve(import.meta.dir, '../../plugins/bmad');
const TIMEOUT = 60_000;

// Each test runs claude in a fresh temp dir to avoid modifying the real
// working directory (e.g. skills that create files and configs).
// mkdtempSync adds a unique suffix so parallel tests don't collide.
const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bmad-e2e-'));
  tempDirs.push(dir);
  return dir;
}

async function runClaude(prompt: string): Promise<string> {
  const dir = makeTempDir();
  const proc = Bun.spawn(
    [
      'claude',
      '--plugin-dir',
      PLUGIN_DIR,
      '-p',
      '--no-session-persistence',
      prompt,
      '--output-format',
      'text',
    ],
    { cwd: dir, stdout: 'pipe', stderr: 'pipe' },
  );
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`claude exited with code ${exitCode}: ${stderr}`);
  }
  return new Response(proc.stdout).text();
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('skill loading', () => {
  test.concurrent(
    'bmad-help skill loads',
    async () => {
      const output = await runClaude('/bmad:bmad-help');
      expect(output.toLowerCase()).toMatch(/bmad|help/);
    },
    TIMEOUT,
  );

  test.concurrent(
    'bmad-brainstorming skill loads',
    async () => {
      const output = await runClaude('/bmad:bmad-brainstorming');
      expect(output.toLowerCase()).toContain('brainstorm');
    },
    TIMEOUT,
  );

  test.concurrent(
    'bmad-customize skill loads (NEW v6.5.0)',
    async () => {
      const output = await runClaude('/bmad:bmad-customize');
      expect(output.toLowerCase()).toMatch(/customiz|override|toml|skill/);
    },
    TIMEOUT,
  );
});

describe('agent persona loading (now via skills)', () => {
  test.concurrent(
    'bmad-tea (Murat) responds',
    async () => {
      // Agents are skills as of v6.5.0+; invoke via skill name.
      const output = await runClaude(
        '/bmad:bmad-tea — briefly describe your role. Reply in one sentence.',
      );
      expect(output.toLowerCase()).toMatch(/test|architect|quality|murat/);
    },
    TIMEOUT,
  );

  test.concurrent(
    'bmad-agent-pm (John) responds',
    async () => {
      const output = await runClaude(
        '/bmad:bmad-agent-pm — briefly describe your role. Reply in one sentence.',
      );
      expect(output.toLowerCase()).toMatch(/product|manager|prd|john/);
    },
    TIMEOUT,
  );
});

describe('random smoke test', () => {
  // Skills may respond with domain content OR ask to initialize first
  // in an empty temp dir. Both prove the skill loaded successfully.
  const LOADED_FALLBACK = /bmad|init|plugin|project/i;

  const SMOKE_POOL = [
    { skill: 'bmad-product-brief', expect: /brief|product/i },
    { skill: 'bmad-create-prd', expect: /prd|requirement/i },
    { skill: 'bmad-code-review', expect: /review|code/i },
    { skill: 'bmad-sprint-status', expect: /sprint|status/i },
    { skill: 'bmad-retrospective', expect: /retro|sprint/i },
    { skill: 'bmad-testarch-automate', expect: /test|automat/i },
    { skill: 'bmad-quick-dev', expect: /quick|implement/i },
    { skill: 'bmad-document-project', expect: /document/i },
    { skill: 'bmad-create-architecture', expect: /architect/i },
    { skill: 'bmad-market-research', expect: /research|market/i },
  ];

  const pick = SMOKE_POOL[Math.floor(Math.random() * SMOKE_POOL.length)];
  if (!pick) throw new Error('SMOKE_POOL is empty — test setup is broken');

  test.concurrent(
    `random smoke: ${pick.skill}`,
    async () => {
      const output = await runClaude(`/bmad:${pick.skill}`);
      const lower = output.toLowerCase();
      const matched = pick.expect.test(lower) || LOADED_FALLBACK.test(lower);
      expect(matched).toBe(true);
    },
    TIMEOUT,
  );
});
