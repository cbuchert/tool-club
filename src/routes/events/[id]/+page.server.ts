import { error, fail } from '@sveltejs/kit';
import { marked } from 'marked';
import { Temporal } from '@js-temporal/polyfill';
import { DEFAULT_TIMEZONE, formatEventDate } from '$lib/temporal';
import { rsvpSchema, recapSchema } from '$lib/schemas/forms';
import { createAdminClient } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, supabase } = locals;

	const { data: event } = await supabase
		.from('events')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (!event) error(404, 'Event not found');

	const isAdmin =
		(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
		'admin';

	if (event.status === 'draft' && !isAdmin) error(404, 'Event not found');

	const instant = Temporal.Instant.from(event.starts_at);
	const dateFormatted = formatEventDate(instant, DEFAULT_TIMEZONE);

	let endFormatted: string | null = null;
	if (event.ends_at) {
		const endZdt = Temporal.Instant.from(event.ends_at).toZonedDateTimeISO(DEFAULT_TIMEZONE);
		endFormatted = endZdt.toPlainTime().toLocaleString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	const bodyHtml = event.body_md ? await marked(event.body_md, { async: true }) : null;

	// Going RSVPs
	const { data: goingRsvps } = await supabase
		.from('rsvps')
		.select('user_id, users!user_id(id, display_name, avatar_url)')
		.eq('event_id', params.id)
		.eq('response', 'yes')
		.order('created_at');

	const goingUsers = (goingRsvps ?? []).map((r) => {
		const u = r.users as unknown as {
			id: string;
			display_name: string;
			avatar_url: string | null;
		} | null;
		return {
			id: r.user_id,
			display_name: u?.display_name ?? 'Member',
			avatar_url: u?.avatar_url ?? null,
		};
	});

	const { data: myRsvp } = await supabase
		.from('rsvps')
		.select('id, response')
		.eq('event_id', params.id)
		.eq('user_id', user!.id)
		.maybeSingle();

	// ── Recap + photos ────────────────────────────────────────────────────────
	const { data: recap } = await supabase
		.from('recaps')
		.select('id, body_md, author_id')
		.eq('event_id', params.id)
		.maybeSingle();

	let recapBodyHtml: string | null = null;
	let photos: {
		id: string;
		storage_path: string;
		is_public: boolean;
		uploaded_by: string;
		url: string;
	}[] = [];

	if (recap) {
		recapBodyHtml = recap.body_md ? await marked(recap.body_md, { async: true }) : null;

		const { data: rawPhotos } = await supabase
			.from('photos')
			.select('id, storage_path, is_public, uploaded_by')
			.eq('recap_id', recap.id)
			.order('created_at');

		// Resolve photo URLs — public photos via public URL, private via signed URL
		photos = await Promise.all(
			(rawPhotos ?? []).map(async (p) => {
				let url: string;
				if (p.is_public) {
					const { data } = supabase.storage.from('recap-photos').getPublicUrl(p.storage_path);
					url = data.publicUrl;
				} else {
					const { data } = await supabase.storage
						.from('recap-photos')
						.createSignedUrl(p.storage_path, 3600);
					url = data?.signedUrl ?? '';
				}
				return { ...p, url };
			})
		);
	}

	const isHost = event.host_id === user!.id;
	const canWriteRecap = event.status === 'past' && !recap && (isHost || isAdmin);
	const canToggleVisibility = isHost || isAdmin;

	const goingCount = goingUsers.length;
	const isFull = event.capacity != null && goingCount >= event.capacity;
	const links = (event.links as { label: string; url: string }[] | null) ?? [];

	return {
		event: {
			id: event.id,
			title: event.title,
			status: event.status as 'draft' | 'published' | 'past',
			dateFormatted,
			endFormatted,
			location_name: event.location_name as string | null,
			address: event.address as string | null,
			host_name: event.host_name as string,
			bodyHtml,
			capacity: event.capacity as number | null,
			links,
			promoted_from_id: event.promoted_from_id as string | null,
		},
		goingUsers,
		goingCount,
		isFull,
		canRsvp: event.status === 'published',
		isHost,
		isAdmin,
		myRsvp: (myRsvp?.response as 'yes' | 'no' | null) ?? null,
		recap: recap ? { id: recap.id, bodyHtml: recapBodyHtml } : null,
		photos,
		canWriteRecap,
		canToggleVisibility,
	};
};

export const actions: Actions = {
	// ── RSVP ─────────────────────────────────────────────────────────────────
	rsvp: async ({ params, request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const parsed = rsvpSchema.safeParse({ response: data.get('response')?.toString() });
		if (!parsed.success) return fail(400, { error: 'Invalid response.' });
		const { response } = parsed.data;

		const { data: event } = await supabase
			.from('events')
			.select('status, capacity')
			.eq('id', params.id)
			.maybeSingle();

		if (!event || event.status !== 'published')
			return fail(400, { error: 'RSVPs are locked for this event.' });

		if (response === 'yes' && event.capacity != null) {
			const { count } = await supabase
				.from('rsvps')
				.select('id', { count: 'exact', head: true })
				.eq('event_id', params.id)
				.eq('response', 'yes')
				.neq('user_id', user!.id);
			if ((count ?? 0) >= event.capacity) return fail(400, { error: 'This event is at capacity.' });
		}

		const { error: upsertError } = await supabase
			.from('rsvps')
			.upsert(
				{ event_id: params.id, user_id: user!.id, response },
				{ onConflict: 'event_id,user_id' }
			);

		if (upsertError) return fail(500, { error: 'Failed to save RSVP. Please try again.' });
		return { success: true };
	},

	// ── Write recap ───────────────────────────────────────────────────────────
	writeRecap: async ({ params, request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const parsed = recapSchema.safeParse({ body_md: data.get('body_md')?.toString() ?? '' });
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });

		// Verify the event is past and user is host or admin
		const { data: event } = await supabase
			.from('events')
			.select('status, host_id')
			.eq('id', params.id)
			.maybeSingle();

		if (!event || event.status !== 'past')
			return fail(400, { error: 'Recaps can only be written for past events.' });

		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';
		const isHost = event.host_id === user!.id;

		if (!isHost && !isAdmin)
			return fail(403, { error: 'Only the event host or an admin can write a recap.' });

		const { error: insertError } = await supabase
			.from('recaps')
			.insert({ event_id: params.id, author_id: user!.id, body_md: parsed.data.body_md });

		if (insertError) return fail(500, { error: 'Failed to save recap. Please try again.' });
		return { success: true };
	},

	// ── Upload photo ──────────────────────────────────────────────────────────
	uploadPhoto: async ({ params, request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const file = data.get('photo') as File | null;
		const recapId = data.get('recap_id')?.toString() ?? '';

		if (!file || file.size === 0) return fail(400, { error: 'Please select a photo.' });
		if (file.size > 5 * 1024 * 1024) return fail(400, { error: 'Photo must be under 5 MB.' });
		if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
			return fail(400, { error: 'Only JPEG, PNG, WebP, or GIF images are supported.' });

		const ext = file.name.split('.').pop() ?? 'jpg';
		const photoId = crypto.randomUUID();
		const storagePath = `${params.id}/${photoId}.${ext}`;

		// Upload to Supabase Storage — service role bypasses storage RLS
		const admin = createAdminClient();
		const { error: uploadError } = await admin.storage
			.from('recap-photos')
			.upload(storagePath, file, { contentType: file.type });

		if (uploadError) return fail(500, { error: 'Upload failed. Please try again.' });

		const { error: insertError } = await supabase.from('photos').insert({
			recap_id: recapId,
			uploaded_by: user!.id,
			storage_path: storagePath,
			is_public: false,
		});

		if (insertError) {
			// Clean up the uploaded file if DB insert fails
			await admin.storage.from('recap-photos').remove([storagePath]);
			return fail(500, { error: 'Failed to save photo record. Please try again.' });
		}

		return { success: true };
	},

	// ── Toggle photo visibility ───────────────────────────────────────────────
	togglePhoto: async ({ params, request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const photoId = data.get('photo_id')?.toString() ?? '';
		const isPublic = data.get('is_public') === 'true';

		if (!photoId) return fail(400, { error: 'Missing photo ID.' });

		// Verify the current user is the host or admin
		const { data: event } = await supabase
			.from('events')
			.select('host_id')
			.eq('id', params.id)
			.maybeSingle();

		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';

		if (event?.host_id !== user!.id && !isAdmin)
			return fail(403, { error: 'Only the event host or an admin can change photo visibility.' });

		await supabase.from('photos').update({ is_public: isPublic }).eq('id', photoId);
		return { success: true };
	},
};
