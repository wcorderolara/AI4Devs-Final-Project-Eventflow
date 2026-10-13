// Param DTO — `:bookingIntentId` (US-096 / BE-001).
import { z } from 'zod';
import { uuidParamsSchema } from '../../../shared/validation/uuid-params.js';
export const BookingIntentIdParamSchema = uuidParamsSchema('bookingIntentId');
export type BookingIntentIdParam = z.infer<typeof BookingIntentIdParamSchema>;
