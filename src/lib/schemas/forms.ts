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

export const recapSchema = z.object({
	body_md: z.string().min(1, 'Please write something for the recap.').max(10000),
});

export const proposalSchema = z.object({
	title: z.string().min(1, 'Title is required.').max(200),
	body_md: z.string().min(1, 'Please describe your idea.'),
	host_name: z.string().max(100).optional(),
});

export type SigninValues = z.infer<typeof signinSchema>;
export type JoinValues = z.infer<typeof joinSchema>;
export type RsvpValues = z.infer<typeof rsvpSchema>;
