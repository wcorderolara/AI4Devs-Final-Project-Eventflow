// US-033 (PB-P1-019 / BE-003) — DTO canónico del agregado de progreso del checklist.
// D2/D4: `percentage` es entero half-up en `[0,100]`; `done`, `total_countable`, `skipped` son
// enteros ≥ 0; el agregado siempre está presente (incluso sin tareas: todos ceros — EC-01/02/03).
// El cálculo es server-side y único (VR-04): el frontend NUNCA recalcula el porcentaje.
import { z } from 'zod';

export const eventTaskProgressDto = z
  .object({
    percentage: z.number().int().min(0).max(100),
    done: z.number().int().min(0),
    total_countable: z.number().int().min(0),
    skipped: z.number().int().min(0),
  })
  .strict();

export type EventTaskProgressDto = z.infer<typeof eventTaskProgressDto>;
