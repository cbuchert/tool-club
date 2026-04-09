import { Temporal } from '@js-temporal/polyfill';
import { DEFAULT_TIMEZONE } from '$lib/temporal';

/**
 * Returns true if a suggestion is currently accepting votes.
 * Voting is open when status is 'open' AND (no closesAt OR closesAt is in the future).
 */
export function isVotingOpen(status: string, closesAt: string | null): boolean {
	if (status !== 'open') return false;
	if (!closesAt) return true;
	return Temporal.Instant.compare(Temporal.Now.instant(), Temporal.Instant.from(closesAt)) < 0;
}

/**
 * Returns a human-readable string for when voting closes.
 * - null     → null (no deadline set)
 * - past     → "Voting closed"
 * - future, same year   → "Closes Apr 20"
 * - future, future year → "Closes Apr 20, 2027"
 */
export function formatVotingCloses(
	closesAt: string | null,
	timeZone: string = DEFAULT_TIMEZONE
): string | null {
	if (!closesAt) return null;

	const closes = Temporal.Instant.from(closesAt);
	const now = Temporal.Now.instant();

	if (Temporal.Instant.compare(closes, now) <= 0) return 'Voting closed';

	const zdt = closes.toZonedDateTimeISO(timeZone);
	const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
	const sameYear = zdt.year === today.year;

	const month = zdt.toPlainDate().toLocaleString('en-US', { month: 'short' });
	const day = zdt.day;

	return sameYear ? `Closes ${month} ${day}` : `Closes ${month} ${day}, ${zdt.year}`;
}
