// Param DTO — `:bookingIntentId` (US-096 / BE-001).
import { z } from 'zod';
export const BookingIntentIdParamSchema = z.object({ bookingIntentId: z.string().uuid() }).strict();
export type BookingIntentIdParam = z.infer<typeof BookingIntentIdParamSchema>;
