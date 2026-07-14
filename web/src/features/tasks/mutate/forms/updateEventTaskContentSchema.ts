// US-029 (PB-P1-018 / FE-001) — Mirror local del schema backend para inline edit.
// Los tres mini-form del `TaskItemInlineEdit` reusan los sub-schemas por campo. Cada campo tiene
// su propio mini-form (RHF) — no un save global. El servidor sigue siendo la fuente de verdad
// (400 con `details.field` refleja el error server-side).
import { z } from 'zod';

export const UPDATE_TASK_DUE_DATE_SKEW_MS = 60_000;

export const titleFieldSchema = z
  .string()
  .refine((v) => v.trim().length >= 2 && v.trim().length <= 200, { message: 'title_length' });

export const descriptionFieldSchema = z
  .string()
  .max(2000, { message: 'description_max' });

// `dueDateLocal`: string `datetime-local` (sin offset). Vacío = "no cambiar".
export const dueDateFieldSchema = z.string().refine(
  (v) => {
    if (!v) return true;
    const ms = Date.parse(v);
    if (!Number.isFinite(ms)) return false;
    return ms >= Date.now() - UPDATE_TASK_DUE_DATE_SKEW_MS;
  },
  { message: 'due_date_invalid_or_past' },
);

export const categoryFieldSchema = z.string();

export function toContentPayload(fields: {
  title?: string;
  description?: string | null;
  dueDateLocal?: string | null;
  categoryCode?: string | null;
}): {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  category_code?: string | null;
} {
  const out: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    category_code?: string | null;
  } = {};
  if (fields.title !== undefined) out.title = fields.title.trim();
  if (fields.description !== undefined) {
    out.description = fields.description === '' ? null : fields.description;
  }
  if (fields.dueDateLocal !== undefined) {
    out.due_date = fields.dueDateLocal ? new Date(fields.dueDateLocal).toISOString() : null;
  }
  if (fields.categoryCode !== undefined) {
    out.category_code =
      fields.categoryCode === '' || fields.categoryCode === null ? null : fields.categoryCode;
  }
  return out;
}
