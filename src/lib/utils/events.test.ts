import { describe, it, expect } from 'vitest';
import { cardDay, cardMonth, cardMeta, initials } from './events';

// Fixed instant: Saturday April 11 2026, 14:00 UTC
// In America/Denver (MDT, UTC-6): Saturday April 11, 8:00 AM
const SATURDAY_APR_11 = '2026-04-11T14:00:00Z';
const TZ = 'America/Denver';

describe('cardDay', () => {
	it('returns the day of month as a string', () => {
		expect(cardDay(SATURDAY_APR_11, TZ)).toBe('11');
	});

	it('accounts for timezone offset — midnight UTC is previous day in Denver', () => {
		// 2026-04-12T00:30:00Z = April 11 in Denver (MDT = UTC-6)
		expect(cardDay('2026-04-12T00:30:00Z', TZ)).toBe('11');
	});
});

describe('cardMonth', () => {
	it('returns the abbreviated month name', () => {
		expect(cardMonth(SATURDAY_APR_11, TZ)).toBe('Apr');
	});

	it('returns the correct month at a year boundary', () => {
		expect(cardMonth('2026-01-01T12:00:00Z', TZ)).toBe('Jan');
	});
});

describe('cardMeta', () => {
	it('includes day, time, and location when all provided', () => {
		const result = cardMeta(SATURDAY_APR_11, "Dana's garage", TZ);
		expect(result).toContain('Saturday');
		expect(result).toContain('8:00 AM');
		expect(result).toContain("Dana's garage");
		expect(result).toContain(' · ');
	});

	it('omits location when null', () => {
		const result = cardMeta(SATURDAY_APR_11, null, TZ);
		expect(result).toContain('Saturday');
		expect(result).toContain('8:00 AM');
		expect(result).not.toContain(' · Dana');
		// Only one separator between day and time
		expect(result.split(' · ')).toHaveLength(2);
	});
});

describe('initials', () => {
	it('returns first letters of first and last name', () => {
		expect(initials('Maya Keller')).toBe('MK');
	});

	it('returns single letter for single-word name', () => {
		expect(initials('Leo')).toBe('L');
	});

	it('caps at two characters for multi-word names', () => {
		expect(initials('Mary Jo Smith')).toBe('MJ');
	});

	it('returns ? for empty string', () => {
		expect(initials('')).toBe('?');
	});

	it('trims whitespace before processing', () => {
		expect(initials('  Sam Chen  ')).toBe('SC');
	});
});
