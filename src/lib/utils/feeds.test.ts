import { describe, it, expect } from 'vitest';
import {
	escapeXml,
	formatRfc2822,
	formatIcalDate,
	buildPublicRssFeed,
	buildPrivateRssFeed,
	buildIcalFeed,
	type PublicFeedEvent,
	type PrivateFeedEvent,
} from './feeds';
import { Temporal } from '@js-temporal/polyfill';

// Fixed instant: Sunday 12 Apr 2026 14:00:00 UTC
const T = '2026-04-12T14:00:00Z';
const instant = Temporal.Instant.from(T);

const publicEvent: PublicFeedEvent = {
	id: 'evt-1',
	title: "Woad Dyeing at Dana's",
	starts_at: T,
	url: 'https://toolclub.app/events/evt-1',
};

const privateEvent: PrivateFeedEvent = {
	id: 'evt-2',
	title: 'Lathe Night at the Makerspace',
	starts_at: T,
	ends_at: '2026-04-12T16:00:00Z',
	location_name: 'Forge Collective',
	address: '12 Industrial Way, Salt Lake City, UT',
	body_html: '<p>Introduction to wood turning.</p>',
	url: 'https://toolclub.app/events/evt-2',
};

// ── escapeXml ────────────────────────────────────────────────────────────────

describe('escapeXml', () => {
	it('escapes ampersands', () => {
		expect(escapeXml('Salt & Pepper')).toBe('Salt &amp; Pepper');
	});

	it('escapes angle brackets', () => {
		expect(escapeXml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
	});

	it('escapes double quotes', () => {
		expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
	});

	it('leaves plain text unchanged', () => {
		expect(escapeXml("Woad Dyeing at Dana's")).toBe("Woad Dyeing at Dana's");
	});

	it('handles empty string', () => {
		expect(escapeXml('')).toBe('');
	});
});

// ── formatRfc2822 ────────────────────────────────────────────────────────────

describe('formatRfc2822', () => {
	it('matches RFC 2822 pattern', () => {
		const result = formatRfc2822(instant);
		expect(result).toMatch(
			/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} \+0000$/
		);
	});

	it('identifies April 12 2026 as a Sunday', () => {
		expect(formatRfc2822(instant)).toMatch(/^Sun,/);
	});

	it('always uses +0000 UTC offset', () => {
		expect(formatRfc2822(instant)).toMatch(/\+0000$/);
	});

	it('zero-pads hours and minutes', () => {
		const midnight = Temporal.Instant.from('2026-04-01T09:05:00Z');
		expect(formatRfc2822(midnight)).toContain('09:05:00');
	});
});

// ── formatIcalDate ───────────────────────────────────────────────────────────

describe('formatIcalDate', () => {
	it('formats to YYYYMMDDTHHmmssZ', () => {
		expect(formatIcalDate(instant)).toBe('20260412T140000Z');
	});

	it('zero-pads single-digit month and day', () => {
		const jan1 = Temporal.Instant.from('2026-01-01T09:05:03Z');
		expect(formatIcalDate(jan1)).toBe('20260101T090503Z');
	});
});

// ── buildPublicRssFeed ───────────────────────────────────────────────────────

describe('buildPublicRssFeed', () => {
	it('starts with the XML declaration', () => {
		expect(buildPublicRssFeed([])).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
	});

	it('contains a valid RSS wrapper', () => {
		const feed = buildPublicRssFeed([]);
		expect(feed).toContain('<rss version="2.0"');
		expect(feed).toContain('<channel>');
		expect(feed).toContain('</channel>');
		expect(feed).toContain('</rss>');
	});

	it('includes the channel title', () => {
		expect(buildPublicRssFeed([])).toContain('<title>Tool Club</title>');
	});

	it('renders one <item> per event', () => {
		const feed = buildPublicRssFeed([publicEvent]);
		expect(feed).toContain('<item>');
		expect(feed).toContain('</item>');
	});

	it('includes the event title', () => {
		expect(buildPublicRssFeed([publicEvent])).toContain("Woad Dyeing at Dana's");
	});

	it('includes pubDate in RFC 2822 format', () => {
		expect(buildPublicRssFeed([publicEvent])).toContain(
			'<pubDate>Sun, 12 Apr 2026 14:00:00 +0000</pubDate>'
		);
	});

	it('does NOT include location or body inside items (public feed is titles + dates only)', () => {
		const feed = buildPublicRssFeed([publicEvent]);
		// The channel itself has a <description> (required by RSS spec) but items must not
		const itemSection = feed.slice(feed.indexOf('<item>'));
		expect(itemSection).not.toContain('<description>');
		expect(feed).not.toContain('Forge Collective');
	});

	it('escapes special characters in titles', () => {
		const feed = buildPublicRssFeed([{ ...publicEvent, title: 'Tour & Talk <Draft>' }]);
		expect(feed).toContain('Tour &amp; Talk &lt;Draft&gt;');
		expect(feed).not.toContain('<Draft>');
	});

	it('is indented for human readability', () => {
		const feed = buildPublicRssFeed([publicEvent]);
		expect(feed).toContain('\n  <channel>');
		expect(feed).toContain('\n    <item>');
		expect(feed).toContain('\n      <title>');
	});

	it('handles an empty event list without crashing', () => {
		const feed = buildPublicRssFeed([]);
		expect(feed).not.toContain('<item>');
		expect(feed).toContain('<channel>');
	});

	it('renders multiple events correctly', () => {
		const feed = buildPublicRssFeed([
			publicEvent,
			{ ...publicEvent, id: 'evt-2', title: 'Second Event' },
		]);
		expect((feed.match(/<item>/g) ?? []).length).toBe(2);
	});
});

// ── buildPrivateRssFeed ──────────────────────────────────────────────────────

describe('buildPrivateRssFeed', () => {
	it('includes location in description', () => {
		expect(buildPrivateRssFeed([privateEvent])).toContain('Forge Collective');
	});

	it('wraps body HTML in CDATA', () => {
		const feed = buildPrivateRssFeed([privateEvent]);
		expect(feed).toContain('<![CDATA[');
		expect(feed).toContain('Introduction to wood turning');
	});

	it('omits CDATA block when body is null', () => {
		expect(buildPrivateRssFeed([{ ...privateEvent, body_html: null }])).not.toContain('<![CDATA[');
	});

	it('is indented for human readability', () => {
		expect(buildPrivateRssFeed([privateEvent])).toContain('\n    <item>');
	});
});

// ── buildIcalFeed ────────────────────────────────────────────────────────────

describe('buildIcalFeed', () => {
	it('wraps everything in VCALENDAR', () => {
		const cal = buildIcalFeed([]);
		expect(cal).toContain('BEGIN:VCALENDAR');
		expect(cal).toContain('VERSION:2.0');
		expect(cal).toContain('END:VCALENDAR');
	});

	it('includes a VEVENT per event', () => {
		const cal = buildIcalFeed([privateEvent]);
		expect(cal).toContain('BEGIN:VEVENT');
		expect(cal).toContain('END:VEVENT');
	});

	it('formats DTSTART in UTC', () => {
		expect(buildIcalFeed([privateEvent])).toContain('DTSTART:20260412T140000Z');
	});

	it('formats DTEND when ends_at is provided', () => {
		expect(buildIcalFeed([privateEvent])).toContain('DTEND:20260412T160000Z');
	});

	it('includes SUMMARY from the event title', () => {
		expect(buildIcalFeed([privateEvent])).toContain('SUMMARY:Lathe Night at the Makerspace');
	});

	it('includes LOCATION when provided', () => {
		expect(buildIcalFeed([privateEvent])).toContain('LOCATION:Forge Collective');
	});

	it('omits LOCATION line when null', () => {
		expect(buildIcalFeed([{ ...privateEvent, location_name: null }])).not.toContain('LOCATION:');
	});

	it('generates a stable UID per event', () => {
		expect(buildIcalFeed([privateEvent])).toContain('UID:evt-2@toolclub.app');
	});

	it('includes the event URL', () => {
		expect(buildIcalFeed([privateEvent])).toContain('URL:https://toolclub.app/events/evt-2');
	});
});
