/**
 * Dev seed script — generates realistic data using Faker.
 * Run with: pnpm seed
 *
 * Requires a running local Supabase instance (supabase start) and
 * test_users.sql to have been applied (supabase db reset).
 * Re-running is safe — `supabase db reset` gives a clean slate first.
 */
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed UUIDs — must match test_users.sql
const MEMBER = { id: '00000000-0000-0000-0000-000000000001', name: 'Jordan Park' };
const ADMIN = { id: '00000000-0000-0000-0000-000000000002', name: 'Sam Chen' };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function insert<T extends object>(table: string, data: T | T[]): Promise<string[]> {
	const rows = Array.isArray(data) ? data : [data];
	const { data: result, error } = await db.from(table).insert(rows).select('id');
	if (error) {
		console.warn(`  ⚠ ${table}:`, error.message);
		return [];
	}
	return (result ?? []).map((r) => r.id as string);
}

async function upsert<T extends object>(table: string, data: T | T[], conflict = 'id') {
	const rows = Array.isArray(data) ? data : [data];
	const { error } = await db.from(table).upsert(rows, { onConflict: conflict });
	if (error) console.warn(`  ⚠ ${table}:`, error.message);
}

const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const slc = () => `${faker.location.streetAddress()}, Salt Lake City, UT`;

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
	console.log('Seeding dev data…\n');

	// ── Users ─────────────────────────────────────────────────────────────────
	// Upsert so re-running doesn't break display names
	console.log('Users');
	await upsert('users', [
		{ id: MEMBER.id, display_name: MEMBER.name, email: 'member@test.toolclub', role: 'member' },
		{ id: ADMIN.id, display_name: ADMIN.name, email: 'admin@test.toolclub', role: 'admin' },
	]);

	// ── Events ────────────────────────────────────────────────────────────────
	// 6 events across all states: published (3), draft (1), past (2)
	console.log('Events');

	// Published — member hosting (so member can write recap)
	const [woadId] = await insert('events', {
		title: "Woad Dyeing at Dana's",
		status: 'published',
		starts_at: soon(3),
		ends_at: soon(3),
		location_name: "Dana's garage",
		address: slc(),
		body_md: faker.lorem.paragraphs(2),
		host_name: MEMBER.name,
		host_id: MEMBER.id,
		capacity: 12,
		links: [{ label: 'What is woad?', url: 'https://en.wikipedia.org/wiki/Woad' }],
	});

	// Published — open RSVPs, external host
	const [latheId] = await insert('events', {
		title: 'Lathe Night at the Makerspace',
		status: 'published',
		starts_at: soon(10),
		location_name: 'Forge Collective',
		address: slc(),
		body_md: faker.lorem.paragraphs(2),
		host_name: 'Forge Collective Staff',
		capacity: 10,
	});

	// Published — will be shown as FULL (promoted from a suggestion)
	const [pressId] = await insert('events', {
		title: 'Tour — Letterpress Print Shop',
		status: 'published',
		starts_at: soon(17),
		location_name: 'Old Town Press Co.',
		address: slc(),
		body_md: faker.lorem.paragraphs(2),
		host_name: 'Old Town Press Co.',
		capacity: 8,
	});

	// Draft — admin-only visibility
	await insert('events', {
		title: 'Ceramics at the Clay Studio',
		status: 'draft',
		starts_at: soon(30),
		host_name: ADMIN.name,
		host_id: ADMIN.id,
		body_md: faker.lorem.paragraph(),
	});

	// Past — has recap + photos
	const [hatFactoryId] = await insert('events', {
		title: "Tour — Christy's Hat Factory",
		status: 'past',
		starts_at: ago(14),
		ends_at: ago(14),
		location_name: "Christy's Custom Hats",
		address: slc(),
		body_md: faker.lorem.paragraphs(2),
		host_name: MEMBER.name,
		host_id: MEMBER.id,
	});

	// Past — no recap yet
	await insert('events', {
		title: 'Bike Repair Basics',
		status: 'past',
		starts_at: ago(28),
		ends_at: ago(28),
		location_name: faker.company.name(),
		body_md: faker.lorem.paragraph(),
		host_name: faker.person.fullName(),
	});

	// ── RSVPs ─────────────────────────────────────────────────────────────────
	console.log('RSVPs');

	if (woadId)
		await upsert(
			'rsvps',
			[
				{ event_id: woadId, user_id: MEMBER.id, response: 'yes' },
				{ event_id: woadId, user_id: ADMIN.id, response: 'yes' },
			],
			'event_id,user_id'
		);

	if (latheId)
		await upsert(
			'rsvps',
			[
				{ event_id: latheId, user_id: MEMBER.id, response: 'yes' },
				{ event_id: latheId, user_id: ADMIN.id, response: 'no' },
			],
			'event_id,user_id'
		);

	// Press is "full" — both going, capacity is 8
	if (pressId)
		await upsert(
			'rsvps',
			[
				{ event_id: pressId, user_id: MEMBER.id, response: 'yes' },
				{ event_id: pressId, user_id: ADMIN.id, response: 'yes' },
			],
			'event_id,user_id'
		);

	if (hatFactoryId)
		await upsert(
			'rsvps',
			[
				{ event_id: hatFactoryId, user_id: MEMBER.id, response: 'yes' },
				{ event_id: hatFactoryId, user_id: ADMIN.id, response: 'yes' },
			],
			'event_id,user_id'
		);

	// ── Recap + photos ────────────────────────────────────────────────────────
	console.log('Recaps & photos');

	if (hatFactoryId) {
		const [recapId] = await insert('recaps', {
			event_id: hatFactoryId,
			author_id: MEMBER.id,
			body_md: faker.lorem.paragraphs(3),
		});
		if (recapId) {
			await insert('photos', [
				{
					recap_id: recapId,
					uploaded_by: MEMBER.id,
					storage_path: `${hatFactoryId}/photo_1.jpg`,
					is_public: true,
				},
				{
					recap_id: recapId,
					uploaded_by: MEMBER.id,
					storage_path: `${hatFactoryId}/photo_2.jpg`,
					is_public: true,
				},
				{
					recap_id: recapId,
					uploaded_by: ADMIN.id,
					storage_path: `${hatFactoryId}/photo_3.jpg`,
					is_public: false,
				},
			]);
		}
	}

	// ── Suggestions ───────────────────────────────────────────────────────────
	// States: open (4, varying vote counts), planned (promoted), closed (1)
	console.log('Suggestions');

	// Open — top voted, closes soon, has comments
	const [foundryId] = await insert('suggestions', {
		author_id: MEMBER.id,
		title: 'Foundry tour — Provo Iron Works',
		body_md: faker.lorem.paragraphs(2),
		host_name: 'Dana Flores',
		status: 'open',
		voting_closes_at: soon(11),
	});

	// Open — mid votes, explicit host
	const [cncId] = await insert('suggestions', {
		author_id: ADMIN.id,
		title: 'CNC intro — build a box',
		body_md: faker.lorem.paragraphs(2),
		host_name: ADMIN.name,
		status: 'open',
		voting_closes_at: soon(21),
	});

	// Open — closing very soon, 1 vote
	const [dyeId] = await insert('suggestions', {
		author_id: ADMIN.id,
		title: 'Natural dye workshop — indigo and weld',
		body_md: faker.lorem.paragraph(),
		host_name: faker.person.fullName(),
		status: 'open',
		voting_closes_at: soon(2),
	});

	// Open — no votes, no close date
	const [climbId] = await insert('suggestions', {
		author_id: MEMBER.id,
		title: 'Rock climbing night at the bouldering gym',
		body_md: faker.lorem.paragraph(),
		status: 'open',
	});

	void climbId;

	// Planned — promoted to the press tour event
	const [pressIdeaId] = await insert('suggestions', {
		author_id: MEMBER.id,
		title: 'Tour — letterpress print shop',
		body_md: faker.lorem.paragraph(),
		host_name: 'Old Town Press Co.',
		status: 'planned',
		promoted_to_event_id: pressId ?? null,
	});

	if (pressIdeaId && pressId) {
		await db.from('events').update({ promoted_from_id: pressIdeaId }).eq('id', pressId);
	}

	// Closed — voting ended, no promotion
	await insert('suggestions', {
		author_id: MEMBER.id,
		title: 'Ceramics class at the Clay Studio',
		body_md: faker.lorem.paragraph(),
		status: 'closed',
		voting_closes_at: ago(7),
	});

	// ── Votes ─────────────────────────────────────────────────────────────────
	console.log('Votes');

	if (foundryId)
		await upsert(
			'votes',
			[
				{ suggestion_id: foundryId, user_id: MEMBER.id },
				{ suggestion_id: foundryId, user_id: ADMIN.id },
			],
			'suggestion_id,user_id'
		);

	if (cncId)
		await upsert('votes', [{ suggestion_id: cncId, user_id: MEMBER.id }], 'suggestion_id,user_id');

	if (dyeId)
		await upsert('votes', [{ suggestion_id: dyeId, user_id: ADMIN.id }], 'suggestion_id,user_id');

	// ── Comments ──────────────────────────────────────────────────────────────
	console.log('Comments');

	if (foundryId)
		await insert('comments', [
			{ suggestion_id: foundryId, user_id: ADMIN.id, body: faker.lorem.sentence() },
			{ suggestion_id: foundryId, user_id: MEMBER.id, body: faker.lorem.sentence() },
			{ suggestion_id: foundryId, user_id: ADMIN.id, body: faker.lorem.sentence() },
		]);

	if (cncId)
		await insert('comments', [
			{ suggestion_id: cncId, user_id: MEMBER.id, body: faker.lorem.sentence() },
		]);

	// ── Feed tokens ───────────────────────────────────────────────────────────
	console.log('Feed tokens');
	await upsert(
		'feed_tokens',
		[
			{ user_id: MEMBER.id, token: faker.string.alphanumeric(32) },
			{ user_id: ADMIN.id, token: faker.string.alphanumeric(32) },
		],
		'user_id'
	);

	console.log(
		'\nDone. Seeded: 2 users · 6 events · 1 recap · 6 suggestions (4 open, 1 planned, 1 closed) · votes · comments · feed tokens'
	);
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
