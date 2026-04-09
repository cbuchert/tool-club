import { Temporal } from '@js-temporal/polyfill';

export { Temporal };

/** Salt Lake City — the community's local timezone. */
export const DEFAULT_TIMEZONE = 'America/Denver';

/**
 * Converts a JavaScript Date to a Temporal.PlainDate in the given timezone.
 * Defaults to the app's local timezone (America/Denver).
 *
 * This matters because midnight UTC on July 4 is still July 3 in SLC.
 */
export function toPlainDate(date: Date, timeZone: string = DEFAULT_TIMEZONE): Temporal.PlainDate {
	return Temporal.Instant.fromEpochMilliseconds(date.getTime())
		.toZonedDateTimeISO(timeZone)
		.toPlainDate();
}

/**
 * Formats a Temporal.Instant as a human-readable event date string.
 * Example: "Saturday, August 15 at 1:00 PM"
 */
export function formatEventDate(instant: Temporal.Instant, timeZone: string): string {
	const zdt = instant.toZonedDateTimeISO(timeZone);
	return zdt.toPlainDateTime().toLocaleString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

/**
 * Returns true if the instant is strictly in the future.
 */
export function isUpcoming(instant: Temporal.Instant): boolean {
	return Temporal.Instant.compare(instant, Temporal.Now.instant()) > 0;
}

/**
 * Returns true if the instant is strictly in the past.
 */
export function isPast(instant: Temporal.Instant): boolean {
	return Temporal.Instant.compare(instant, Temporal.Now.instant()) < 0;
}
