import { Temporal } from '@js-temporal/polyfill';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublicFeedEvent {
	id: string;
	title: string;
	starts_at: string;
	url: string;
}

export interface PrivateFeedEvent {
	id: string;
	title: string;
	starts_at: string;
	ends_at: string | null;
	location_name: string | null;
	address: string | null;
	body_html: string | null;
	url: string;
}

// ── Primitives ────────────────────────────────────────────────────────────────

/** Escape a string for safe inclusion in XML text nodes and attribute values. */
export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const RFC2822_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RFC2822_MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

/**
 * Format a Temporal.Instant as an RFC 2822 date string (used in RSS <pubDate>).
 * Always UTC (+0000). Example: "Sun, 12 Apr 2026 14:00:00 +0000"
 */
export function formatRfc2822(instant: Temporal.Instant): string {
	const zdt = instant.toZonedDateTimeISO('UTC');
	const day = RFC2822_DAYS[zdt.dayOfWeek % 7]; // Temporal: 1=Mon…7=Sun
	const dd = String(zdt.day).padStart(2, '0');
	const mon = RFC2822_MONTHS[zdt.month - 1];
	const yyyy = zdt.year;
	const hh = String(zdt.hour).padStart(2, '0');
	const mm = String(zdt.minute).padStart(2, '0');
	const ss = String(zdt.second).padStart(2, '0');
	return `${day}, ${dd} ${mon} ${yyyy} ${hh}:${mm}:${ss} +0000`;
}

/**
 * Format a Temporal.Instant as an iCal UTC datetime string.
 * Example: "20260412T140000Z"
 */
export function formatIcalDate(instant: Temporal.Instant): string {
	const zdt = instant.toZonedDateTimeISO('UTC');
	const pad = (n: number) => String(n).padStart(2, '0');
	return (
		`${zdt.year}${pad(zdt.month)}${pad(zdt.day)}` +
		`T${pad(zdt.hour)}${pad(zdt.minute)}${pad(zdt.second)}Z`
	);
}

// ── RSS feeds ─────────────────────────────────────────────────────────────────

function rssHeader(selfUrl?: string): string {
	const atom = selfUrl
		? `\n    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>`
		: '';
	// Derive the site root from selfUrl when available; fall back to empty string
	// so no domain is assumed. The link element is optional in RSS 2.0.
	const siteLink = selfUrl ? new URL(selfUrl).origin : '';
	return (
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
		`  <channel>\n` +
		`    <title>Tool Club</title>\n` +
		(siteLink ? `    <link>${siteLink}</link>\n` : '') +
		`    <description>Upcoming events from Tool Club — Springville.</description>\n` +
		`    <language>en-us</language>${atom}`
	);
}

function rssFooter(): string {
	return `  </channel>\n</rss>`;
}

/**
 * Build the public RSS feed — titles and dates only, no location or body.
 * Beautifully indented for human readability in browsers and terminals.
 */
export function buildPublicRssFeed(events: PublicFeedEvent[], selfUrl?: string): string {
	const items = events
		.map((e) => {
			const pubDate = formatRfc2822(Temporal.Instant.from(e.starts_at));
			return (
				`    <item>\n` +
				`      <title>${escapeXml(e.title)}</title>\n` +
				`      <pubDate>${pubDate}</pubDate>\n` +
				`      <link>${escapeXml(e.url)}</link>\n` +
				`      <guid isPermaLink="true">${escapeXml(e.url)}</guid>\n` +
				`    </item>`
			);
		})
		.join('\n');

	return [rssHeader(selfUrl), items, rssFooter()].filter(Boolean).join('\n') + '\n';
}

/**
 * Build the private (per-member) RSS feed — full event details including
 * location and body HTML wrapped in CDATA.
 */
export function buildPrivateRssFeed(events: PrivateFeedEvent[], selfUrl?: string): string {
	const items = events
		.map((e) => {
			const pubDate = formatRfc2822(Temporal.Instant.from(e.starts_at));
			const locationLine = e.location_name
				? `      <location>${escapeXml(e.location_name)}</location>\n`
				: '';
			const descriptionLine = e.body_html
				? `      <description><![CDATA[${e.body_html}]]></description>\n`
				: '';
			return (
				`    <item>\n` +
				`      <title>${escapeXml(e.title)}</title>\n` +
				`      <pubDate>${pubDate}</pubDate>\n` +
				`      <link>${escapeXml(e.url)}</link>\n` +
				`      <guid isPermaLink="true">${escapeXml(e.url)}</guid>\n` +
				locationLine +
				descriptionLine +
				`    </item>`
			);
		})
		.join('\n');

	return [rssHeader(selfUrl), items, rssFooter()].filter(Boolean).join('\n') + '\n';
}

// ── iCal feed ─────────────────────────────────────────────────────────────────

/**
 * Build a VCALENDAR iCal feed from a list of events.
 * Follows RFC 5545. All times in UTC.
 */
export function buildIcalFeed(
	events: PrivateFeedEvent[],
	siteOrigin: string,
	calName = 'Tool Club'
): string {
	// Strip the protocol for the UID — RFC 5545 uses domain only as a uniqueness scope
	const uidDomain = siteOrigin.replace(/^https?:\/\//, '');

	const vevents = events.map((e) => {
		const dtstart = formatIcalDate(Temporal.Instant.from(e.starts_at));
		const dtend = e.ends_at ? formatIcalDate(Temporal.Instant.from(e.ends_at)) : null;
		const location = e.location_name ?? null;

		const lines = [
			'BEGIN:VEVENT',
			`UID:${e.id}@${uidDomain}`,
			`DTSTART:${dtstart}`,
			dtend ? `DTEND:${dtend}` : null,
			`SUMMARY:${e.title}`,
			location ? `LOCATION:${location}` : null,
			`URL:${e.url}`,
			'END:VEVENT',
		]
			.filter((l): l is string => l !== null)
			.join('\r\n');

		return lines;
	});

	return (
		[
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Tool Club//EN',
			`X-WR-CALNAME:${calName}`,
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			...vevents,
			'END:VCALENDAR',
		].join('\r\n') + '\r\n'
	);
}
