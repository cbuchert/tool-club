import { z } from 'zod';

export const RsvpResponseSchema = z.enum(['yes', 'no']);
export type RsvpResponse = z.infer<typeof RsvpResponseSchema>;

export const RsvpSchema = z.object({
	id: z.string().uuid(),
	event_id: z.string().uuid(),
	user_id: z.string().uuid(),
	response: RsvpResponseSchema,
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type Rsvp = z.infer<typeof RsvpSchema>;
