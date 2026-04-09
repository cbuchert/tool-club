import { z } from 'zod';

export const UserRoleSchema = z.enum(['member', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
	id: z.string().uuid(),
	display_name: z.string(),
	email: z.string().email().nullable(),
	avatar_url: z.string().url().nullable(),
	role: UserRoleSchema,
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;
