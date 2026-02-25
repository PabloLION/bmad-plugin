/**
 * Orchestrates the full sync pipeline: sync content → generate agents → generate skills.
 *
 * Runs all three steps in sequence, passing through --source and --dry-run flags.
 * Exits on first failure.
 *
 * Run: bun scripts/sync-all.ts [--source <id>] [--dry-run]
 */

const args = process.argv.slice(2);

const steps = [
  { script: 'scripts/sync-upstream-content.ts', label: 'sync' },
  { script: 'scripts/generate-agents.ts', label: 'generate:agents' },
  { script: 'scripts/generate-skills.ts', label: 'generate:skills' },
];

for (const { script, label } of steps) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${label}`);
  console.log('='.repeat(60));

  const proc = Bun.spawn(['bun', script, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`\n✗ ${label} failed (exit ${exitCode})`);
    process.exit(exitCode);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('✓ All steps completed successfully');
console.log('='.repeat(60));
