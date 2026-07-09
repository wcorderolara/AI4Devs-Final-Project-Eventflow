// Request DTO — Crear BookingIntent (US-096 / BE-001). AC-10; VR-09.
import { z } from 'zod';

export const CreateBookingIntentRequestSchema = z
  .object({ quoteId: z.string().uuid() })
  .strict();

export type CreateBookingIntentRequest = z.infer<typeof CreateBookingIntentRequestSchema>;
