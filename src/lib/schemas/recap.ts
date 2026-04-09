import { z } from 'zod';

export const RecapSchema = z.object({
	id: z.string().uuid(),
	event_id: z.string().uuid(),
	author_id: z.string().uuid(),
	body_md: z.string().min(1),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type Recap = z.infer<typeof RecapSchema>;

export const CreateRecapSchema = RecapSchema.pick({
	event_id: true,
	body_md: true,
});
export type CreateRecap = z.infer<typeof CreateRecapSchema>;
