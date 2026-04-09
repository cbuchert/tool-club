import { describe, it, expect } from 'vitest';
import { isVotingOpen, formatVotingCloses } from './suggestions';

const TZ = 'America/Denver';

// Fixed instants relative to "now" — tests use these to avoid flakiness
const FUTURE = new Date(Date.now() + 7 * 86_400_000).toISOString(); // 7 days from now
const PAST = new Date(Date.now() - 1 * 86_400_000).toISOString(); // 1 day ago

describe('isVotingOpen', () => {
	it('returns true when status is open and closesAt is in the future', () => {
		expect(isVotingOpen('open', FUTURE)).toBe(true);
	});

	it('returns true when status is open and closesAt is null (never closes)', () => {
		expect(isVotingOpen('open', null)).toBe(true);
	});

	it('returns false when status is open but closesAt has passed', () => {
		expect(isVotingOpen('open', PAST)).toBe(false);
	});

	it('returns false when status is planned regardless of closesAt', () => {
		expect(isVotingOpen('planned', FUTURE)).toBe(false);
		expect(isVotingOpen('planned', null)).toBe(false);
	});

	it('returns false when status is closed regardless of closesAt', () => {
		expect(isVotingOpen('closed', FUTURE)).toBe(false);
		expect(isVotingOpen('closed', null)).toBe(false);
	});
});

describe('formatVotingCloses', () => {
	it('returns null when closesAt is null (no deadline)', () => {
		expect(formatVotingCloses(null, TZ)).toBeNull();
	});

	it('returns "Voting closed" when the date has passed', () => {
		expect(formatVotingCloses(PAST, TZ)).toBe('Voting closed');
	});

	it('includes the month abbreviation and day when in the future', () => {
		const result = formatVotingCloses(FUTURE, TZ);
		expect(result).toMatch(/^Closes [A-Z][a-z]{2} \d{1,2}$/);
	});

	it('includes the year when closesAt is in a different year', () => {
		const nextYear = new Date(Date.now() + 400 * 86_400_000).toISOString();
		const result = formatVotingCloses(nextYear, TZ);
		expect(result).toMatch(/^Closes [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
	});
});
