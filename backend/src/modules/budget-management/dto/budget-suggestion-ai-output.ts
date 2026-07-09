// AI Output DTO — Sugerencia de presupuesto generada por el LLM (US-092 / AI-001). AC-04, EC-03; VR-04.
// Se valida con `safeParse` ANTES de persistir (consumido por GenerateBudgetSuggestionUseCase, PB-P0-010).
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';

export const BudgetSuggestionAIOutputSchema = z
  .object({
    items: z.array(
      z
        .object({
          category: z.string().min(1),
          estimatedAmount: z.number().nonnegative(),
          currency: z.enum(SUPPORTED_CURRENCIES),
        })
        .strict(),
    ),
  })
  .strict();

export type BudgetSuggestionAIOutput = z.infer<typeof BudgetSuggestionAIOutputSchema>;
