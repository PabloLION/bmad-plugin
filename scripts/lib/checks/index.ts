/**
 * Barrel export for validation check functions.
 *
 * After the v6.5.0+ migration to installer-based sync, only the version
 * check survives — three-way upstream-coverage validation is unnecessary
 * because the installer is the source of truth.
 */

export { checkVersion } from './version.ts';
