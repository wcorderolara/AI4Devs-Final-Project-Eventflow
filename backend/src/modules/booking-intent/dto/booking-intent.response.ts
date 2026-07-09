// Response DTO — BookingIntent (US-096 / BE-001). AC-10/11/12. Flujo simulado (isSimulated).
import { z } from 'zod';
import { BOOKING_INTENT_STATUSES } from '../domain/booking-intent.js';
import type { BookingIntentView } from '../domain/booking-intent.js';

export const BookingIntentResponseSchema = z
  .object({
    id: z.string().uuid(),
    quoteId: z.string().uuid(),
    eventId: z.string().uuid(),
    serviceCategoryId: z.string().uuid(),
    vendorProfileId: z.string().uuid().nullable(),
    status: z.enum(BOOKING_INTENT_STATUSES),
    isSimulated: z.boolean(),
    confirmedAt: z.string().nullable(),
    cancelledAt: z.string().nullable(),
    cancelledBy: z.string().uuid().nullable(),
    cancellationReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type BookingIntentResponse = z.infer<typeof BookingIntentResponseSchema>;

export function toBookingIntentResponse(v: BookingIntentView): BookingIntentResponse {
  return { ...v };
}
