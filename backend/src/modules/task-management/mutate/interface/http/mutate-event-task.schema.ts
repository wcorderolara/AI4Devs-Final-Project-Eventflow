// US-029 (PB-P1-018 / BE-002) — Zod schemas + helper `extractIgnoredFields` para los tres
// endpoints del módulo mutate. Comparte los principios de US-028:
//   * `.strip()` al final del body (los campos server-controlled se descartan silenciosamente).
//   * `extractIgnoredFields` computa `body.ignoredFields` sobre el body crudo, ANTES del strip.
//   * Validaciones estrictas producen `400 VALIDATION_ERROR`.
// La validación condicional de `due_date` en el pasado la ejecuta el use case (depende de
// `currentStatus`), no el schema — el schema solo garantiza formato ISO-8601 con offset.
import { z } from 'zod';

/** Tolerancia de skew reloj cliente/servidor para `due_date` en el pasado (EC-08, VR-08). */
export const DUE_DATE_PAST_TOLERANCE_MS = 60_000;

/** Path params — UUID v4 estricto (VR-01, VR-02). */
export const taskMutationParamsSchema = z
  .object({ eventId: z.string().uuid(), taskId: z.string().uuid() })
  .strict();

/**
 * Set canónico de claves aceptadas por PATCH content (Tech Spec §7). Cualquier otra key es
 * server-controlled o desconocida y se descarta silenciosamente vía `.strip()`.
 */
export const ALLOWED_CONTENT_KEYS = [
  'title',
  'description',
  'due_date',
  'category_code',
] as const;

/**
 * Body schema tolerante para PATCH content:
 *   * Cada campo es OPCIONAL — la `.superRefine` valida ≥1 campo definido (EMPTY_PATCH).
 *   * `title`: string trim, 2..200 (VR-06).
 *   * `description`: string ≤ 2000, `null` explícito para vaciar (VR-07, EC-11).
 *   * `due_date`: ISO-8601 con offset, `null` para vaciar (VR-08).
 *   * `category_code`: slug 1..64, `null` para vaciar (VR-09, EC-05).
 *   * `.strip()` final — descarta cualquier otra key.
 * `EmptyPatchError` (400) proviene de la `superRefine` cuando el body queda vacío tras strip.
 */
export const updateEventTaskContentBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { message: 'title must be at least 2 characters' })
      .max(200, { message: 'title must be at most 200 characters' })
      .optional(),
    description: z
      .string()
      .max(2000, { message: 'description must be at most 2000 characters' })
      .nullable()
      .optional(),
    due_date: z
      .string()
      .datetime({ offset: true, message: 'due_date must be ISO-8601 with offset' })
      .nullable()
      .optional(),
    category_code: z
      .string()
      .min(1)
      .max(64)
      .nullable()
      .optional(),
  })
  .strip()
  .superRefine((val, ctx) => {
    // ≥1 clave editable presente (undefined → no editada). null cuenta como edición explícita.
    const hasAny =
      val.title !== undefined ||
      val.description !== undefined ||
      val.due_date !== undefined ||
      val.category_code !== undefined;
    if (!hasAny) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [], message: 'EMPTY_PATCH' });
    }
  });

/** Body schema para PATCH status (VR-10). El state machine se valida en el use case. */
export const updateEventTaskStatusBodySchema = z
  .object({
    status: z.enum(['pending', 'in_progress', 'done', 'skipped'], {
      errorMap: () => ({ message: 'status must be one of pending|in_progress|done|skipped' }),
    }),
  })
  .strip();

export type TaskMutationParams = z.infer<typeof taskMutationParamsSchema>;
export type UpdateEventTaskContentBody = z.infer<typeof updateEventTaskContentBodySchema>;
export type UpdateEventTaskStatusBody = z.infer<typeof updateEventTaskStatusBodySchema>;

/**
 * Devuelve los nombres de campo presentes en el body crudo que NO están en `allowedKeys`.
 * Se computa ANTES del `.strip()` para poder loguearlas como `body.ignoredFields` (EC-07, VR-12).
 * NO expone valores — solo nombres (SEC-05).
 */
export function extractIgnoredFields(rawBody: unknown, allowedKeys: readonly string[]): string[] {
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) return [];
  const allowed = new Set<string>(allowedKeys);
  const dropped: string[] = [];
  for (const key of Object.keys(rawBody as Record<string, unknown>)) {
    if (!allowed.has(key)) dropped.push(key);
  }
  return dropped;
}
