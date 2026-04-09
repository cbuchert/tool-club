/**
 * Pushes compiled email templates to the production Supabase project via the
 * Management API. Run this manually after reviewing compiled output in
 * supabase/templates/. Never runs in CI — email template changes are
 * deliberate, not automatic.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_ID=... pnpm push:emails
 *
 * Both env vars must be set. SUPABASE_ACCESS_TOKEN is your personal access
 * token (supabase.com → Account → Access Tokens). SUPABASE_PROJECT_ID is the
 * project ref (visible in the Supabase dashboard URL).
 */

import { readFileSync } from 'fs';

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_ID) {
	console.error('Error: SUPABASE_PROJECT_ID is not set.');
	process.exit(1);
}
if (!ACCESS_TOKEN) {
	console.error('Error: SUPABASE_ACCESS_TOKEN is not set.');
	process.exit(1);
}

const templates = [
	{
		key: 'magic_link',
		subject: 'Sign in to Tool Club',
		file: 'supabase/templates/magic-link.html',
	},
	{
		key: 'confirmation',
		subject: 'Confirm your Tool Club account',
		file: 'supabase/templates/confirmation.html',
	},
	{
		key: 'invite',
		subject: "You've been invited to Tool Club",
		file: 'supabase/templates/invite.html',
	},
] as const;

const body: Record<string, string> = {};

for (const t of templates) {
	try {
		const html = readFileSync(t.file, 'utf-8');
		body[`mailer_subjects_${t.key}`] = t.subject;
		body[`mailer_templates_${t.key}_content`] = html;
		console.log(`  Loaded: ${t.file}`);
	} catch {
		console.error(`Error: could not read ${t.file}. Run pnpm build first.`);
		process.exit(1);
	}
}

console.log(`\nPushing ${templates.length} templates to project ${PROJECT_ID}…`);

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/config/auth`, {
	method: 'PATCH',
	headers: {
		Authorization: `Bearer ${ACCESS_TOKEN}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(body),
});

if (!res.ok) {
	const text = await res.text();
	console.error(`\nFailed (${res.status}): ${text}`);
	process.exit(1);
}

console.log('Done. Email templates updated in production.');
