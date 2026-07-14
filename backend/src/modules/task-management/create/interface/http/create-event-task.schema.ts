// US-028 (PB-P1-018 / BE-001) — Zod schemas y helper `extractIgnoredFields` para la creación
// manual de EventTask. El body es tolerante: campos server-controlled y desconocidos se
// descartan silenciosamente vía `.strip()` (AC-03, EC-11, VR-09) y se loguean en
// `body.ignoredFields` (§14). Las validaciones estrictas (title, description, due_date,
// category_code) sí devuelven `400 VALIDATION` (VR-04..08).
import { z } from 'zod';

/**
 * Claves controladas por el servidor. Si el cliente las envía, se descartan silenciosamente
 * y se emiten en `body.ignoredFields`. Coincide con AC-03 + VR-09.
 */
export const SERVER_CONTROLLED_TASK_KEYS = [
  'ai_generated',
  'ai_recommendation_id',
  'status',
  'id',
  'created_by_user_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'confirmed_at',
  'language_code',
] as const;

/** Claves aceptadas explícitamente por el body schema. Cualquier otra key se descarta. */
export const ALLOWED_BODY_KEYS = [
  'title',
  'description',
  'due_date',
  'category_code',
] as const;

/** Tolerancia de skew reloj cliente/servidor para `due_date` en el pasado (EC-04 / VR-07). */
export const DUE_DATE_PAST_TOLERANCE_MS = 60_000;

/** Path params — UUID v4 estricto (VR-01, NT-01). Body Zod `.strip()` para tolerancia. */
export const createEventTaskParamsSchema = z
  .object({ eventId: z.string().uuid() })
  .strict();

/**
 * Body schema tolerante:
 *   - `title` requerido, trim, 2..200 (VR-04). Whitespace-only rechazado por el trim + min(2).
 *   - `description` opcional, ≤ 2000 (VR-05); acepta `null` y ausente → normalizado a `null`.
 *   - `due_date` opcional, ISO-8601 con offset (VR-06); `null`/ausente admitidos. Si presente,
 *     `Date.parse(v) >= now() - 60s` (VR-07 con skew).
 *   - `category_code` opcional, slug 1..64; `null`/ausente admitidos.
 *   - `.strip()` al final: campos extras (incluidos los server-controlled) se descartan.
 */
export const createEventTaskBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { message: 'title must be at least 2 characters' })
      .max(200, { message: 'title must be at most 200 characters' }),
    description: z
      .string()
      .max(2000, { message: 'description must be at most 2000 characters' })
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? null : v)),
    due_date: z
      .string()
      .datetime({ offset: true, message: 'due_date must be ISO-8601 with offset' })
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? null : v))
      .refine(
        (v) => v === null || Date.parse(v) >= Date.now() - DUE_DATE_PAST_TOLERANCE_MS,
        { message: 'DUE_DATE_IN_PAST' },
      ),
    category_code: z
      .string()
      .min(1)
      .max(64)
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? null : v)),
  })
  .strip();

export type CreateEventTaskParams = z.infer<typeof createEventTaskParamsSchema>;
export type CreateEventTaskBody = z.infer<typeof createEventTaskBodySchema>;

/**
 * Devuelve la lista de keys presentes en el body crudo que NO están en `ALLOWED_BODY_KEYS`
 * (server-controlled, tipográficas o desconocidas). Se computa ANTES del `.strip()` para poder
 * loguearlas en `body.ignoredFields` (AC-03, EC-11).
 *
 * No revela los valores — solo los nombres de campo (SEC-06 lo pide para PII, aquí también por
 * higiene: los valores desconocidos pueden contener datos arbitrarios).
 */
export function extractIgnoredFields(rawBody: unknown): string[] {
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) return [];
  const allowed = new Set<string>(ALLOWED_BODY_KEYS);
  const dropped: string[] = [];
  for (const key of Object.keys(rawBody as Record<string, unknown>)) {
    if (!allowed.has(key)) dropped.push(key);
  }
  return dropped;
}
