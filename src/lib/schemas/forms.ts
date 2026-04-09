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

export type SigninValues = z.infer<typeof signinSchema>;
export type JoinValues = z.infer<typeof joinSchema>;
export type RsvpValues = z.infer<typeof rsvpSchema>;
