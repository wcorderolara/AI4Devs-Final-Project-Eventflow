// US-115 (PB-P2-012 / BE-001). Zod schema strict para query params de
// `GET /api/v1/admin/ai-metrics`.
//
// Contrato (AC-02 · VR-03):
//   * `window ∈ {24h, all-time, both}`; default `both` cuando el param se omite.
//   * `.strict()` — rechaza cualquier otro campo (defensa SEC-04 contra query
//     smuggling / injection payloads como `?window=' OR 1=1--` → 400).
import { z } from 'zod';

export const AI_METRICS_WINDOW_INPUTS = ['24h', 'all-time', 'both'] as const;
export type AIMetricsWindowInput = (typeof AI_METRICS_WINDOW_INPUTS)[number];

export const aiMetricsQuerySchema = z
  .object({
    window: z.enum(AI_METRICS_WINDOW_INPUTS).default('both'),
  })
  .strict();

export type AIMetricsQueryInput = z.infer<typeof aiMetricsQuerySchema>;
