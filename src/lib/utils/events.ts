import { Temporal } from '@js-temporal/polyfill';
import { DEFAULT_TIMEZONE } from '$lib/temporal';

/**
 * Returns the day-of-month for the event card date column.
 * e.g. "12"
 */
export function cardDay(startsAt: string, timeZone: string = DEFAULT_TIMEZONE): string {
	return Temporal.Instant.from(startsAt).toZonedDateTimeISO(timeZone).day.toString();
}

/**
 * Returns the abbreviated month name for the event card date column.
 * e.g. "Apr"
 */
export function cardMonth(startsAt: string, timeZone: string = DEFAULT_TIMEZONE): string {
	return Temporal.Instant.from(startsAt)
		.toZonedDateTimeISO(timeZone)
		.toPlainDate()
		.toLocaleString('en-US', { month: 'short' });
}

/**
 * Returns the single-line meta string shown beneath the event title on cards.
 * e.g. "Saturday · 8:00 AM · Dana's garage"
 */
export function cardMeta(
	startsAt: string,
	locationName: string | null,
	timeZone: string = DEFAULT_TIMEZONE
): string {
	const zdt = Temporal.Instant.from(startsAt).toZonedDateTimeISO(timeZone);
	const day = zdt.toPlainDate().toLocaleString('en-US', { weekday: 'long' });
	const time = zdt.toPlainTime().toLocaleString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
	const parts = [day, time];
	if (locationName) parts.push(locationName);
	return parts.join(' · ');
}

/**
 * Derives up-to-two-character initials from a display name.
 * "Maya Keller" → "MK", "Leo" → "L", "" → "?"
 */
export function initials(displayName: string): string {
	const letters = displayName
		.trim()
		.split(/\s+/)
		.map((n) => n[0])
		.filter(Boolean)
		.join('')
		.toUpperCase()
		.slice(0, 2);
	return letters || '?';
}
