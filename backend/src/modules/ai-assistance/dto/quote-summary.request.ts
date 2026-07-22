// Request DTO — POST /events/:eventId/ai/quote-summary (US-022 / BE-001, VR-01).
// Body `.strict()` con `category_code` obligatorio (D1); `languageCode` se ignora en runtime porque
// US-084/US-082 imponen el binding server-side desde `event.language`. `preferMock` se preserva
// para demos/tests reutilizando el contrato del motor AI (US-097).
import { z } from 'zod';

export const QuoteSummaryBodySchema = z
  .object({
    category_code: z.string().min(1).max(64),
    preferMock: z.boolean().optional(),
  })
  .strict();

export type QuoteSummaryBody = z.infer<typeof QuoteSummaryBodySchema>;
