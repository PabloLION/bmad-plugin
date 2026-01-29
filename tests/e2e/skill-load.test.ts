import { describe, test, expect, afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolve } from "path";

const PLUGIN_DIR = resolve(import.meta.dir, "../../plugins/bmad");
const TIMEOUT = 60_000;

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "bmad-e2e-"));
  tempDirs.push(dir);
  return dir;
}

function runClaude(prompt: string): string {
  const cwd = makeTempDir();
  const result = Bun.spawnSync(
    [
      "claude",
      "--plugin-dir",
      PLUGIN_DIR,
      "-p",
      "--no-session-persistence",
      prompt,
      "--output-format",
      "text",
    ],
    { cwd, timeout: TIMEOUT },
  );
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString();
    throw new Error(`claude exited with code ${result.exitCode}: ${stderr}`);
  }
  return result.stdout.toString();
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("skill loading", () => {
  test(
    "brainstorming skill loads",
    () => {
      const output = runClaude("/bmad:brainstorming");
      expect(output.toLowerCase()).toContain("brainstorm");
    },
    TIMEOUT,
  );

  test(
    "help skill loads",
    () => {
      const output = runClaude("/bmad:help");
      expect(output.toLowerCase()).toMatch(/bmad|help/);
    },
    TIMEOUT,
  );
});
