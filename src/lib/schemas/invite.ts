import { z } from 'zod';

export const InviteSchema = z.object({
	id: z.string().uuid(),
	invited_by: z.string().uuid(),
	email: z.string().email().nullable(),
	redeemed_by: z.string().uuid().nullable(),
	expires_at: z.string().datetime(),
	redeemed_at: z.string().datetime().nullable(),
	created_at: z.string().datetime(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const CreateInviteSchema = InviteSchema.pick({
	email: true,
}).partial();
export type CreateInvite = z.infer<typeof CreateInviteSchema>;
