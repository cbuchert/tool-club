import { z } from 'zod';

export const signinSchema = z.object({
	email: z.string().email('Please enter a valid email address.'),
});

export const joinSchema = z.object({
	email: z.string().email('Please enter a valid email address.'),
	display_name: z.string().min(1, 'Please enter your name.').max(100),
});

export const rsvpSchema = z.object({
	response: z.enum(['yes', 'no']),
});

export const displayNameSchema = z.object({
	display_name: z.string().min(1, 'Display name is required.').max(100),
});

export const recapSchema = z.object({
	body_md: z.string().min(1, 'Please write something for the recap.').max(10000),
});

// host_name is optional. The TanStack form omits it from FormData when blank
// (the svelte does `if (value.host_name) fd.set(...)`), so the server receives
// undefined — which z.string() would reject. .optional() accepts both '' and
// undefined; the server action then coerces to null for the DB insert.
export const proposalSchema = z.object({
	title: z.string().min(1, 'Title is required.').max(200),
	body_md: z.string().min(1, 'Please describe your idea.'),
	host_name: z.string().max(100).optional(),
});

// Used by admin event create/edit forms (server-side validation only).
// Optional fields use empty string → null coercion in the action.
export const eventSchema = z.object({
	title: z.string().min(1, 'Title is required.').max(200),
	starts_at: z.string().min(1, 'Start date is required.'),
	host_name: z.string().min(1, 'Host name is required.').max(200),
	status: z.enum(['draft', 'published', 'past']),
});

export type SigninValues = z.infer<typeof signinSchema>;
export type JoinValues = z.infer<typeof joinSchema>;
export type RsvpValues = z.infer<typeof rsvpSchema>;
