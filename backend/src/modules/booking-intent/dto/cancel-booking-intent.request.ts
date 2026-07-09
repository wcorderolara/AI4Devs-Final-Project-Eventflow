// Request DTO — Cancelar BookingIntent (US-096 / BE-001). AC-12; VR-10, EC-08.
import { z } from 'zod';

export const CancelBookingIntentRequestSchema = z
  .object({ cancellationReason: z.string().trim().min(1).max(1000) })
  .strict();

export type CancelBookingIntentRequest = z.infer<typeof CancelBookingIntentRequestSchema>;
