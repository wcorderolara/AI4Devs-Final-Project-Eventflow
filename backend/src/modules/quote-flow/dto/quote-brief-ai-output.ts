// AI Output DTO — Brief de cotización generado por el LLM (US-092 / AI-001). AC-04, EC-03; VR-04.
// Se valida con `safeParse` ANTES de persistir (consumido por GenerateQuoteBriefUseCase, PB-P0-010).
import { z } from 'zod';

export const QuoteBriefAIOutputSchema = z
  .object({
    brief: z.string().min(1),
    suggestedCategoryId: z.string().uuid().optional(),
  })
  .strict();

export type QuoteBriefAIOutput = z.infer<typeof QuoteBriefAIOutputSchema>;
