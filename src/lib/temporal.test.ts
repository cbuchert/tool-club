import { describe, it, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { toPlainDate, formatEventDate, DEFAULT_TIMEZONE } from './temporal';

describe('DEFAULT_TIMEZONE', () => {
	it('is America/Denver (Salt Lake City)', () => {
		expect(DEFAULT_TIMEZONE).toBe('America/Denver');
	});
});

describe('toPlainDate', () => {
	it('converts a JS Date to a Temporal.PlainDate', () => {
		const plain = toPlainDate(new Date('2026-07-04T12:00:00Z'));
		expect(plain).toBeInstanceOf(Temporal.PlainDate);
	});

	it('resolves the correct calendar date in the local timezone', () => {
		// Midnight UTC on July 4 is still July 3 in Denver (UTC-6 in summer).
		// This is the kind of off-by-one that will silently break event dates.
		const plain = toPlainDate(new Date('2026-07-04T00:00:00Z'), 'America/Denver');
		expect(plain.year).toBe(2026);
		expect(plain.month).toBe(7);
		expect(plain.day).toBe(3);
	});
});

describe('formatEventDate', () => {
	it('returns a non-empty string', () => {
		const instant = Temporal.Instant.from('2026-08-15T19:00:00Z');
		const result = formatEventDate(instant, 'America/Denver');
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});

	it('includes the month and day', () => {
		const instant = Temporal.Instant.from('2026-08-15T19:00:00Z');
		const result = formatEventDate(instant, 'America/Denver');
		// August 15 at 1pm MDT (UTC-6)
		expect(result).toMatch(/August/i);
		expect(result).toMatch(/15/);
	});
});
