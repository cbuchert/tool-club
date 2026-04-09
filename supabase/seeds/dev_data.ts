/**
 * Dev seed script — generates realistic data using Faker and inserts via Supabase admin client.
 * Run with: pnpm seed
 *
 * Requires a running local Supabase instance (supabase start).
 * Reads credentials from .env.local (gitignored).
 */
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local before anything else
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
	process.loadEnvFile(envPath);
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed test UUIDs — must match supabase/seeds/test_users.sql
const MEMBER_UUID = '00000000-0000-0000-0000-000000000001';
const ADMIN_UUID = '00000000-0000-0000-0000-000000000002';

async function seed() {
	console.log('Seeding dev data...');

	// Users (mirrors test_users.sql; upsert so re-running is safe)
	const { error: usersErr } = await supabase.from('users').upsert([
		{
			id: MEMBER_UUID,
			display_name: faker.person.fullName(),
			email: 'member@test.toolclub',
			role: 'member',
		},
		{
			id: ADMIN_UUID,
			display_name: faker.person.fullName(),
			email: 'admin@test.toolclub',
			role: 'admin',
		},
	]);
	if (usersErr) console.warn('users:', usersErr.message);

	// Published events (upcoming)
	const eventIds: string[] = [];
	for (let i = 0; i < 3; i++) {
		const startsAt = faker.date.soon({ days: 30 + i * 14 });
		const { data, error } = await supabase
			.from('events')
			.insert({
				title: faker.lorem.words(4),
				status: 'published',
				starts_at: startsAt.toISOString(),
				ends_at: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
				location_name: faker.company.name(),
				address: faker.location.streetAddress(),
				body_md: faker.lorem.paragraphs(2),
				host_id: ADMIN_UUID,
				capacity: faker.number.int({ min: 10, max: 30 }),
			})
			.select('id')
			.single();
		if (error) console.warn('event:', error.message);
		else if (data) eventIds.push(data.id);
	}

	// Draft event
	await supabase.from('events').insert({
		title: faker.lorem.words(3) + ' (Draft)',
		status: 'draft',
		starts_at: faker.date.soon({ days: 60 }).toISOString(),
		host_id: ADMIN_UUID,
		body_md: faker.lorem.paragraph(),
	});

	// Past event with recap and photos
	const pastDate = faker.date.recent({ days: 14 });
	const { data: pastEvent } = await supabase
		.from('events')
		.insert({
			title: faker.lorem.words(4) + ' (Past)',
			status: 'past',
			starts_at: pastDate.toISOString(),
			ends_at: new Date(pastDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
			location_name: faker.company.name(),
			host_id: ADMIN_UUID,
			body_md: faker.lorem.paragraphs(2),
		})
		.select('id')
		.single();

	if (pastEvent) {
		const { data: recap } = await supabase
			.from('recaps')
			.insert({
				event_id: pastEvent.id,
				author_id: ADMIN_UUID,
				body_md: faker.lorem.paragraphs(3),
			})
			.select('id')
			.single();

		if (recap) {
			for (let i = 0; i < 3; i++) {
				await supabase.from('photos').insert({
					recap_id: recap.id,
					uploaded_by: MEMBER_UUID,
					storage_path: `${pastEvent.id}/placeholder_${i}.jpg`,
					is_public: i < 2,
				});
			}
		}
	}

	// RSVPs for first published event
	if (eventIds[0]) {
		await supabase.from('rsvps').upsert([
			{ event_id: eventIds[0], user_id: MEMBER_UUID, response: 'yes' },
			{ event_id: eventIds[0], user_id: ADMIN_UUID, response: 'yes' },
		]);
	}

	// Suggestions
	const suggestionIds: string[] = [];
	for (let i = 0; i < 4; i++) {
		const { data, error } = await supabase
			.from('suggestions')
			.insert({
				author_id: MEMBER_UUID,
				title: faker.lorem.words(5),
				body_md: faker.lorem.paragraphs(1),
				status: 'open',
				voting_closes_at: faker.date.soon({ days: 21 }).toISOString(),
			})
			.select('id')
			.single();
		if (error) console.warn('suggestion:', error.message);
		else if (data) suggestionIds.push(data.id);
	}

	// Votes and comments on first suggestion
	if (suggestionIds[0]) {
		await supabase.from('votes').upsert({
			suggestion_id: suggestionIds[0],
			user_id: MEMBER_UUID,
		});
		await supabase.from('votes').upsert({
			suggestion_id: suggestionIds[0],
			user_id: ADMIN_UUID,
		});
		await supabase.from('comments').insert([
			{
				suggestion_id: suggestionIds[0],
				user_id: MEMBER_UUID,
				body: faker.lorem.sentence(),
			},
			{
				suggestion_id: suggestionIds[0],
				user_id: ADMIN_UUID,
				body: faker.lorem.sentence(),
			},
		]);
	}

	// Feed tokens
	await supabase.from('feed_tokens').upsert([
		{ user_id: MEMBER_UUID, token: faker.string.alphanumeric(32) },
		{ user_id: ADMIN_UUID, token: faker.string.alphanumeric(32) },
	]);

	console.log('Done.');
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
