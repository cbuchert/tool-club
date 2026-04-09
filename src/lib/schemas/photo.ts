import { z } from 'zod';

export const PhotoSchema = z.object({
	id: z.string().uuid(),
	recap_id: z.string().uuid(),
	uploaded_by: z.string().uuid(),
	storage_path: z.string().min(1),
	is_public: z.boolean(),
	created_at: z.string().datetime(),
});
export type Photo = z.infer<typeof PhotoSchema>;
