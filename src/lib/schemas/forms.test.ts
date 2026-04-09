import { describe, it, expect } from 'vitest';
import { signinSchema, joinSchema, rsvpSchema } from './forms';

describe('signinSchema', () => {
	it('accepts a valid email', () => {
		expect(signinSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
	});

	it('rejects an invalid email', () => {
		expect(signinSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
	});

	it('rejects an empty email', () => {
		expect(signinSchema.safeParse({ email: '' }).success).toBe(false);
	});
});

describe('joinSchema', () => {
	it('accepts valid email and display name', () => {
		expect(
			joinSchema.safeParse({ email: 'user@example.com', display_name: 'Maya Keller' }).success
		).toBe(true);
	});

	it('rejects an invalid email', () => {
		expect(joinSchema.safeParse({ email: 'bad', display_name: 'Maya' }).success).toBe(false);
	});

	it('rejects an empty display name', () => {
		expect(joinSchema.safeParse({ email: 'user@example.com', display_name: '' }).success).toBe(
			false
		);
	});

	it('rejects a display name over 100 characters', () => {
		expect(
			joinSchema.safeParse({ email: 'user@example.com', display_name: 'a'.repeat(101) }).success
		).toBe(false);
	});
});

describe('rsvpSchema', () => {
	it('accepts yes', () => {
		expect(rsvpSchema.safeParse({ response: 'yes' }).success).toBe(true);
	});

	it('accepts no', () => {
		expect(rsvpSchema.safeParse({ response: 'no' }).success).toBe(true);
	});

	it('rejects an invalid response', () => {
		expect(rsvpSchema.safeParse({ response: 'maybe' }).success).toBe(false);
	});
});
