import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PLUGIN_DIR = resolve(import.meta.dir, '../../plugins/bmad');
const TIMEOUT = 60_000;

// Each test runs claude in a fresh temp dir to avoid modifying the real
// working directory (e.g. skills like init create files and configs).
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
    'help skill loads',
    async () => {
      const output = await runClaude('/bmad:help');
      expect(output.toLowerCase()).toMatch(/bmad|help/);
    },
    TIMEOUT,
  );

  test.concurrent(
    'brainstorming skill loads',
    async () => {
      const output = await runClaude('/bmad:brainstorming');
      expect(output.toLowerCase()).toContain('brainstorm');
    },
    TIMEOUT,
  );

  test.concurrent(
    'status skill loads',
    async () => {
      const output = await runClaude('/bmad:status');
      expect(output.toLowerCase()).toMatch(/status|project|bmad/);
    },
    TIMEOUT,
  );

  test.concurrent(
    'init skill loads',
    async () => {
      // init is interactive (asks project info), so in single-turn mode
      // we just verify the skill loads and mentions initialization
      const output = await runClaude('/bmad:init');
      expect(output.toLowerCase()).toMatch(/init|bmad|project|setup/);
    },
    TIMEOUT,
  );
});

describe('agent loading', () => {
  test.concurrent(
    'quinn agent responds',
    async () => {
      const output = await runClaude(
        'Use the quinn agent to briefly describe your role. Reply in one sentence.',
      );
      expect(output.toLowerCase()).toMatch(/test|qa|quality|quinn/);
    },
    TIMEOUT,
  );
});

describe('random smoke test', () => {
  // Skills may respond with domain content OR ask to initialize first
  // in an empty temp dir. Both prove the skill loaded successfully.
  const LOADED_FALLBACK = /bmad|init|plugin|project/i;

  const SMOKE_POOL = [
    { skill: 'create-product-brief', expect: /brief|product/i },
    { skill: 'create-prd', expect: /prd|requirement/i },
    { skill: 'code-review', expect: /review|code/i },
    { skill: 'sprint-status', expect: /sprint|status/i },
    { skill: 'retrospective', expect: /retro|sprint/i },
    { skill: 'automate', expect: /test|automat/i },
    { skill: 'quick-spec', expect: /spec|story/i },
    { skill: 'document-project', expect: /document/i },
    { skill: 'create-architecture', expect: /architect/i },
    { skill: 'research', expect: /research/i },
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
