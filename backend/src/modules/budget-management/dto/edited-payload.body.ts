// US-037 (PB-P1-021 / BE-001) — Zod schemas del body `editedPayload` para el apply de
// `budget_suggestion`. Mirror del shape canónico `OUTPUT_SCHEMAS.budget_suggestion` (US-097):
// `{ currencyCode, items: [{ category, estimatedAmount }] }`, con `label` opcional agregado
// para permitir edición del texto por el usuario (Tech Spec §6 nota 4 / D3).
// El `AIRecommendationsController.apply` (US-025) valida el body genérico
// (`{ editedOutput?: unknown }`); esta strategy (US-037) revalida con este schema.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';

/** Ítem editable — reflexivo del canónico + `label` opcional. `estimatedAmount` como decimal string. */
export const editedBudgetItemSchema = z
  .object({
    category: z.string().min(1),
    estimatedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    label: z.string().min(1).max(120).optional(),
  })
  .strict();

/** Payload editado — reusa el shape canónico. `items.min(1)` rechaza vacío (VR-05 / EC-05). */
export const editedBudgetPayloadSchema = z
  .object({
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    items: z.array(editedBudgetItemSchema).min(1),
  })
  .strict();

export type EditedBudgetItem = z.infer<typeof editedBudgetItemSchema>;
export type EditedBudgetPayload = z.infer<typeof editedBudgetPayloadSchema>;
