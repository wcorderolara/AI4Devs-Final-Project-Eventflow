// US-078 / BE-001 — Request DTO del listado admin de Events. Tech Spec §7 · Decisiones PO D3/D4.
//
// Query params del endpoint `GET /api/v1/admin/events`:
//
//   `status`             string | string[]     — multi-status (VR-04). Enum Prisma real.
//   `event_type_id`      UUID?                 — filtro exacto.
//   `event_date_from`    ISO date/date-time?   — límite inferior de rango.
//   `event_date_to`      ISO date/date-time?   — límite superior de rango.
//   `organizer_search`   string [1..100]?      — ILIKE substring sobre `email` + `fullName`.
//   `pageSize`           int 1..50, default 25 — VR-02.
//   `cursor`             base64url?            — cursor opaco keyset (Decisión PO D4).
//
// Refines: `event_date_from <= event_date_to` (VR-05) ⇒ `400 VALIDATION_ERROR`.
// `.strict()` (paridad US-074) rechaza claves adicionales.
//
// EventStatus se sincroniza con el enum real de Prisma (`draft | active | completed | cancelled`).
// La Tech Spec menciona `planning|in_progress` que NO existen en el schema; se documenta como
// deviation DEV-2 en el execution record.
import { z } from 'zod';
import { EventStatus } from '@prisma/client';

/** Enum canónico exportado desde Prisma para preservar sync con schema. */
export const AdminEventsStatusEnum = z.nativeEnum(EventStatus);
export type AdminEventsStatus = z.infer<typeof AdminEventsStatusEnum>;

const StatusInput = z
  .union([AdminEventsStatusEnum, z.array(AdminEventsStatusEnum)])
  .transform((v): AdminEventsStatus[] => (Array.isArray(v) ? v : [v]));

const PageSizeSchema = z.coerce.number().int().min(1).max(50).default(25);

const DateSchema = z.coerce.date();

/** `organizer_search` acepta cualquier string; se trima y colapsa a `undefined` si queda vacío. */
const OrganizerSearchSchema = z
  .string()
  .max(200)
  .transform((v) => v.trim())
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

/** Base ZodObject (sin refines) — consumible por `zod-to-openapi` en `openapi.ts`. */
export const AdminEventsQueryBaseSchema = z
  .object({
    status: StatusInput.optional(),
    event_type_id: z.string().uuid().optional(),
    event_date_from: DateSchema.optional(),
    event_date_to: DateSchema.optional(),
    organizer_search: OrganizerSearchSchema,
    pageSize: PageSizeSchema,
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export const AdminEventsQuerySchema = AdminEventsQueryBaseSchema.superRefine((d, ctx) => {
  if (
    d.event_date_from !== undefined &&
    d.event_date_to !== undefined &&
    d.event_date_from.getTime() > d.event_date_to.getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['event_date_from'],
      message: 'event_date_from must be <= event_date_to',
    });
  }
  if (d.organizer_search !== undefined && d.organizer_search.length > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizer_search'],
      message: 'organizer_search must be at most 100 characters',
    });
  }
});

export type AdminEventsQuery = z.infer<typeof AdminEventsQuerySchema>;
