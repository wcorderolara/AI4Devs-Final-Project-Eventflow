// US-026 (PB-P2-003 / BE-001) — DTO de body para regeneración de `AIRecommendation`.
//
// Contrato Tech Spec §7 (EC-01):
//   - `feedback` opcional, máx. 500 chars.
//   - `preferMock` opcional (paridad `AiBaseRequestSchema` — tests IT lo inyectan).
//   - `.strict()` para rechazar campos desconocidos y prevenir sneak-in de fields sensibles.
//
// EC-04: whitespace-only se acepta a nivel de schema; el use case aplica `.trim()` y trata
// vacío como null (D3).
import { z } from 'zod';

export const RegenerateAiRecommendationBodySchema = z
  .object({
    feedback: z.string().max(500).optional(),
    preferMock: z.boolean().optional(),
  })
  .strict();

export type RegenerateAiRecommendationBody = z.infer<typeof RegenerateAiRecommendationBodySchema>;
