// US-028 (PB-P1-018 / FE-002) — Mirror local del schema backend con tolerancia UX.
// Reglas:
//   * `title` trim + 2..200 (VR-04).
//   * `description` ≤ 2000 (VR-05); `null`/vacío → `null`.
//   * `due_date` opcional; el input `<input type="datetime-local">` da un string sin offset,
//     que el consumidor convierte a UTC ISO antes de enviar. La validación local rechaza
//     fechas del pasado con margen `-60s` (EC-04 UX).
//   * `category_code` opcional slug.
import { z } from 'zod';

export const CREATE_TASK_DUE_DATE_SKEW_MS = 60_000;

export const createEventTaskFormSchema = z.object({
  title: z
    .string()
    .refine((v) => v.trim().length >= 2 && v.trim().length <= 200, {
      message: 'title_length',
    }),
  description: z.string().max(2000, { message: 'description_max' }),
  dueDateLocal: z.string().refine(
    (v) => {
      if (!v) return true;
      const ms = Date.parse(v);
      if (!Number.isFinite(ms)) return false;
      return ms >= Date.now() - CREATE_TASK_DUE_DATE_SKEW_MS;
    },
    { message: 'due_date_invalid_or_past' },
  ),
  categoryCode: z.string(),
});

export type CreateEventTaskFormValues = z.infer<typeof createEventTaskFormSchema>;

/**
 * Convierte los valores del form al payload canónico del backend. Serializa `dueDateLocal`
 * (sin offset, hora local del navegador) a ISO-8601 UTC. Vacío → `null` en cada campo opcional.
 */
export function toCreatePayload(v: CreateEventTaskFormValues): {
  title: string;
  description: string | null;
  due_date: string | null;
  category_code: string | null;
} {
  const description = v.description && v.description.length > 0 ? v.description : null;
  const dueLocal = v.dueDateLocal && v.dueDateLocal.length > 0 ? v.dueDateLocal : null;
  const categoryCode = v.categoryCode && v.categoryCode.length > 0 ? v.categoryCode : null;
  return {
    title: v.title.trim(),
    description,
    due_date: dueLocal ? new Date(dueLocal).toISOString() : null,
    category_code: categoryCode,
  };
}
