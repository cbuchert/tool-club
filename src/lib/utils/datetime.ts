/**
 * Datetime helpers for admin event forms.
 *
 * HTML <input type="datetime-local"> values have no timezone ("2026-04-15T14:00").
 * The app treats all event times as America/Denver (Salt Lake City).
 */
import { Temporal } from '$lib/temporal';

export const EVENT_TIMEZONE = 'America/Denver';

/**
 * Converts a UTC ISO timestamp (as stored in the DB) to a datetime-local
 * input value in America/Denver time.
 * e.g. "2026-04-15T20:00:00Z" → "2026-04-15T14:00"
 */
export function toDatetimeLocal(utcTs: string): string {
	const zdt = Temporal.Instant.from(utcTs).toZonedDateTimeISO(EVENT_TIMEZONE);
	const d = zdt.toPlainDateTime();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.year}-${p(d.month)}-${p(d.day)}T${p(d.hour)}:${p(d.minute)}`;
}

/**
 * Converts a datetime-local input value (America/Denver) to a UTC ISO string
 * suitable for storing in the DB.
 * e.g. "2026-04-15T14:00" → "2026-04-15T20:00:00+00:00"
 * Returns null if the value is empty or invalid.
 */
export function fromDatetimeLocal(value: string): string | null {
	if (!value.trim()) return null;
	try {
		return Temporal.PlainDateTime.from(value)
			.toZonedDateTime(EVENT_TIMEZONE)
			.toInstant()
			.toString();
	} catch {
		return null;
	}
}

/**
 * Serialises an array of {label, url} link objects to the textarea format:
 * one "Label | URL" per line.
 */
export function linksToText(links: { label: string; url: string }[]): string {
	return links.map((l) => `${l.label} | ${l.url}`).join('\n');
}

/**
 * Parses the textarea format back to the JSONB array stored in the DB.
 * Lines without a pipe separator are treated as label-only entries.
 */
export function parseLinks(text: string): { label: string; url: string }[] {
	if (!text.trim()) return [];
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const idx = line.indexOf('|');
			if (idx < 0) return { label: line, url: '' };
			return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() };
		})
		.filter((l) => l.label || l.url);
}
