// US-016 / DOC-001 — Zod schema del `AdminEventReadResponse` para el snapshot OpenAPI (US-098).
// Mirrors `AdminEventReadView` (§7 DTOs). No es consumido por el runtime de la app; sirve como
// fuente única del contrato en la documentación.
import { z } from 'zod';

export const AdminEventOwnerSchema = z
  .object({
    id: z.string().uuid(),
    displayName: z.string(),
  })
  .strict();

export const AdminEventReadResponseSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    eventTypeCode: z.enum(['wedding', 'xv', 'baptism', 'baby_shower', 'birthday', 'corporate']),
    name: z.string(),
    eventDate: z.string(),
    guestsCount: z.number().int(),
    locationId: z.string(),
    estimatedBudget: z.string(),
    currencyCode: z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD']),
    languageCode: z.enum(['es-LATAM', 'es-ES', 'pt', 'en']),
    status: z.enum(['draft', 'active', 'completed', 'cancelled']),
    notes: z.string().nullable(),
    autoCompleted: z.boolean(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().nullable(),
    deleted: z.boolean(),
    owner: AdminEventOwnerSchema,
  })
  .strict();

export const AdminEventIdOpenApiParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
