import { z } from 'zod';

export const SuggestionStatusSchema = z.enum(['open', 'planned', 'closed']);
export type SuggestionStatus = z.infer<typeof SuggestionStatusSchema>;

export const SuggestionSchema = z.object({
	id: z.string().uuid(),
	author_id: z.string().uuid(),
	host_id: z.string().uuid().nullable(),
	title: z.string().min(1),
	body_md: z.string().min(1),
	status: SuggestionStatusSchema,
	voting_closes_at: z.string().datetime().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const CreateSuggestionSchema = SuggestionSchema.pick({
	title: true,
	body_md: true,
}).extend({
	host_id: z.string().uuid().nullable().optional(),
	voting_closes_at: z.string().datetime().nullable().optional(),
});
export type CreateSuggestion = z.infer<typeof CreateSuggestionSchema>;
