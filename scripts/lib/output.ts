/**
 * Console output helpers with color formatting.
 */

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let _failed = false;

export function pass(msg: string): void {
  console.log(`${GREEN}✓ ${msg}${RESET}`);
}

export function fail(msg: string): void {
  console.log(`${RED}✗ ${msg}${RESET}`);
  _failed = true;
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

export function hasFailed(): boolean {
  return _failed;
}

export function resetFailed(): void {
  _failed = false;
}

export { GREEN, RED, YELLOW, RESET };
