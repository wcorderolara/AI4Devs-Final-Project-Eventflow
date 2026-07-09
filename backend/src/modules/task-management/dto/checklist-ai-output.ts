// AI Output DTO — Checklist generado por el LLM (US-092 / AI-001). AC-04, EC-03; VR-04.
// Se valida con `safeParse` ANTES de persistir (consumido por GenerateChecklistUseCase, PB-P0-010).
import { z } from 'zod';

export const ChecklistAIOutputSchema = z
  .object({
    items: z.array(
      z
        .object({
          title: z.string().min(1),
          description: z.string().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        })
        .strict(),
    ),
  })
  .strict();

export type ChecklistAIOutput = z.infer<typeof ChecklistAIOutputSchema>;
