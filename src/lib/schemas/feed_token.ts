import { z } from 'zod';

export const FeedTokenSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	token: z.string().min(1),
	created_at: z.string().datetime(),
});
export type FeedToken = z.infer<typeof FeedTokenSchema>;
