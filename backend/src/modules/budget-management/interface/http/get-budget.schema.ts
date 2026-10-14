// US-035 (PB-P1-020 / BE-004, R1) — Schema Zod del path param del endpoint.
// `eventId` UUID (VR-02, NT-05) → ValidationError → 400 VALIDATION.
import { z } from 'zod';
import { uuidParamsSchema } from '../../../../shared/validation/uuid-params.js';

export const getBudgetParamsSchema = uuidParamsSchema('eventId').strip();

export type GetBudgetParams = z.infer<typeof getBudgetParamsSchema>;
