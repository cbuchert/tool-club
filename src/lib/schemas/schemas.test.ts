import { describe, it, expect } from 'vitest';
import { UserSchema, UserRoleSchema } from './user';
import { EventSchema, EventStatusSchema, CreateEventSchema } from './event';
import { RsvpSchema, RsvpResponseSchema } from './rsvp';
import { SuggestionSchema, SuggestionStatusSchema, CreateSuggestionSchema } from './suggestion';
import { InviteSchema } from './invite';
import { RecapSchema, CreateRecapSchema } from './recap';
import { PhotoSchema } from './photo';
import { FeedTokenSchema } from './feed_token';

// Must be a valid RFC 4122 UUID — Zod v4 enforces version and variant bits.
// (The all-zeros fixture UUIDs in test_users.sql are for pgTAP only.)
const uuid = '550e8400-e29b-41d4-a716-446655440000';
const now = new Date().toISOString();

describe('UserSchema', () => {
	it('parses a valid user', () => {
		expect(() =>
			UserSchema.parse({
				id: uuid,
				display_name: 'Alice',
				email: 'alice@example.com',
				avatar_url: null,
				role: 'member',
				created_at: now,
				updated_at: now,
			})
		).not.toThrow();
	});
	it('rejects an invalid role', () => {
		expect(() => UserRoleSchema.parse('superadmin')).toThrow();
	});
});

describe('EventSchema', () => {
	it('parses a valid event', () => {
		expect(() =>
			EventSchema.parse({
				id: uuid,
				title: 'Maker Night',
				status: 'published',
				starts_at: now,
				ends_at: null,
				location_name: 'The Shop',
				address: null,
				body_md: '# Details',
				capacity: 20,
				host_id: uuid,
				promoted_from: null,
				created_at: now,
				updated_at: now,
			})
		).not.toThrow();
	});
	it('rejects an invalid status', () => {
		expect(() => EventStatusSchema.parse('cancelled')).toThrow();
	});
	it('CreateEventSchema requires title and starts_at', () => {
		expect(() => CreateEventSchema.parse({})).toThrow();
	});
});

describe('RsvpSchema', () => {
	it('parses a valid RSVP', () => {
		expect(() =>
			RsvpSchema.parse({
				id: uuid,
				event_id: uuid,
				user_id: uuid,
				response: 'yes',
				created_at: now,
				updated_at: now,
			})
		).not.toThrow();
	});
	it('rejects "maybe" as a response', () => {
		expect(() => RsvpResponseSchema.parse('maybe')).toThrow();
	});
});

describe('SuggestionSchema', () => {
	it('parses a valid suggestion', () => {
		expect(() =>
			SuggestionSchema.parse({
				id: uuid,
				author_id: uuid,
				host_id: null,
				title: 'Welding workshop',
				body_md: 'Let us weld.',
				status: 'open',
				voting_closes_at: null,
				created_at: now,
				updated_at: now,
			})
		).not.toThrow();
	});
	it('rejects an invalid status', () => {
		expect(() => SuggestionStatusSchema.parse('archived')).toThrow();
	});
	it('CreateSuggestionSchema requires title and body_md', () => {
		expect(() => CreateSuggestionSchema.parse({ title: 'Only title' })).toThrow();
	});
});

describe('InviteSchema', () => {
	it('parses a valid invite', () => {
		expect(() =>
			InviteSchema.parse({
				id: uuid,
				invited_by: uuid,
				email: 'bob@example.com',
				redeemed_by: null,
				expires_at: now,
				redeemed_at: null,
				created_at: now,
			})
		).not.toThrow();
	});
	it('rejects a malformed email', () => {
		expect(() =>
			InviteSchema.parse({
				id: uuid,
				invited_by: uuid,
				email: 'not-an-email',
				redeemed_by: null,
				expires_at: now,
				redeemed_at: null,
				created_at: now,
			})
		).toThrow();
	});
});

describe('RecapSchema', () => {
	it('parses a valid recap', () => {
		expect(() =>
			RecapSchema.parse({
				id: uuid,
				event_id: uuid,
				author_id: uuid,
				body_md: 'Great night.',
				created_at: now,
				updated_at: now,
			})
		).not.toThrow();
	});
	it('rejects an empty body', () => {
		expect(() => CreateRecapSchema.parse({ event_id: uuid, body_md: '' })).toThrow();
	});
});

describe('PhotoSchema', () => {
	it('parses a valid photo', () => {
		expect(() =>
			PhotoSchema.parse({
				id: uuid,
				recap_id: uuid,
				uploaded_by: uuid,
				storage_path: 'events/abc/photo.jpg',
				is_public: true,
				created_at: now,
			})
		).not.toThrow();
	});
	it('rejects a non-boolean is_public', () => {
		expect(() =>
			PhotoSchema.parse({
				id: uuid,
				recap_id: uuid,
				uploaded_by: uuid,
				storage_path: 'path',
				is_public: 'yes',
				created_at: now,
			})
		).toThrow();
	});
});

describe('FeedTokenSchema', () => {
	it('parses a valid feed token', () => {
		expect(() =>
			FeedTokenSchema.parse({
				id: uuid,
				user_id: uuid,
				token: 'abc123',
				created_at: now,
			})
		).not.toThrow();
	});
	it('rejects an empty token', () => {
		expect(() =>
			FeedTokenSchema.parse({ id: uuid, user_id: uuid, token: '', created_at: now })
		).toThrow();
	});
});
