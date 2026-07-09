// AI Output DTO — Plan de evento generado por el LLM (US-092 / AI-001). AC-04, EC-03; VR-04.
// Se valida con `safeParse` ANTES de persistir (consumido por GenerateEventPlanUseCase, PB-P0-010).
import { z } from 'zod';

export const EventPlanAIOutputSchema = z
  .object({
    summary: z.string().min(1),
    recommendedCategories: z.array(z.string().min(1)),
    suggestedTasks: z.array(
      z
        .object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().optional(),
          dueOffsetDays: z.number().int().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export type EventPlanAIOutput = z.infer<typeof EventPlanAIOutputSchema>;
