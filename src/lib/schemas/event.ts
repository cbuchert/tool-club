import { z } from 'zod';

export const EventStatusSchema = z.enum(['draft', 'published', 'past']);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1),
	status: EventStatusSchema,
	starts_at: z.string().datetime(),
	ends_at: z.string().datetime().nullable(),
	location_name: z.string().nullable(),
	address: z.string().nullable(),
	body_md: z.string().nullable(),
	capacity: z.number().int().positive().nullable(),
	host_id: z.string().uuid().nullable(),
	promoted_from: z.string().uuid().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type Event = z.infer<typeof EventSchema>;

export const CreateEventSchema = EventSchema.pick({
	title: true,
	starts_at: true,
}).extend({
	status: EventStatusSchema.default('draft'),
	ends_at: z.string().datetime().nullable().optional(),
	location_name: z.string().nullable().optional(),
	address: z.string().nullable().optional(),
	body_md: z.string().nullable().optional(),
	capacity: z.number().int().positive().nullable().optional(),
	host_id: z.string().uuid().nullable().optional(),
	promoted_from: z.string().uuid().nullable().optional(),
});
export type CreateEvent = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
