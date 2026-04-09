/**
 * Shared constants for the auth storage state file paths.
 * Extracted into a plain (non-test) module so both auth.setup.ts and
 * fixtures.ts can import from it without triggering Playwright's
 * "should not import test file" error.
 */
import { join } from 'node:path';

export const AUTH_DIR = join('playwright', '.auth');
export const ADMIN_AUTH_FILE = join(AUTH_DIR, 'admin.json');
export const MEMBER_AUTH_FILE = join(AUTH_DIR, 'member.json');
