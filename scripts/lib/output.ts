/**
 * Console output helpers with color formatting.
 *
 * Default: quiet mode (only errors, warnings, and summary).
 * Pass --verbose to show all output including pass messages and section headers.
 */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let _failed = false;
let _verbose = false;

export function setVerbose(verbose: boolean): void {
  _verbose = verbose;
}

export function isVerbose(): boolean {
  return _verbose;
}

export function pass(msg: string): void {
  if (_verbose) {
    console.log(`${GREEN}✓ ${msg}${RESET}`);
  }
}

export function fail(msg: string): void {
  console.log(`${RED}✗ ${msg}${RESET}`);
  _failed = true;
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

/** Print a section header (only in verbose mode). */
export function section(title: string): void {
  if (_verbose) {
    console.log(`\n== ${title} ==`);
  }
}

export function hasFailed(): boolean {
  return _failed;
}

export function resetFailed(): void {
  _failed = false;
}

export { GREEN, RED, YELLOW, RESET };
