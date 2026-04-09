import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local into process.env before any module is imported.
// This file is gitignored — no keys are committed to source control.
// process.loadEnvFile is available in Node 20.12+.
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
	process.loadEnvFile(envLocalPath);
}
