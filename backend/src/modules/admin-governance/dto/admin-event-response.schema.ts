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

/** US-078 §7 — counts detalle. `.strict()` para preservar contrato. */
export const AdminEventCountsSchema = z
  .object({
    tasks: z.number().int().min(0),
    tasksCompleted: z.number().int().min(0),
    quoteRequests: z.number().int().min(0),
    quoteRequestsActive: z.number().int().min(0),
    quotes: z.number().int().min(0),
    quotesAccepted: z.number().int().min(0),
    bookingIntents: z.number().int().min(0),
    bookingIntentsConfirmed: z.number().int().min(0),
    aiRecommendations: z.number().int().min(0),
  })
  .strict();

export const AdminEventBudgetSummarySchema = z
  .object({
    totalPlanned: z.string(),
    totalCommitted: z.string(),
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
    counts: AdminEventCountsSchema.optional(),
    budgetSummary: AdminEventBudgetSummarySchema.nullable().optional(),
  })
  .strict();

/**
 * US-078 §7 — item de listado admin (proyección resumida). Difiere del detail: no incluye
 * `notes`, `counts` ni `budgetSummary`.
 */
export const AdminEventListItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(['draft', 'active', 'completed', 'cancelled']),
    eventDate: z.string().nullable(),
    guestsCount: z.number().int().nullable(),
    estimatedBudget: z.string().nullable(),
    currency: z.string(),
    createdAt: z.string(),
    deletedAt: z.string().nullable(),
    owner: z
      .object({
        id: z.string().uuid(),
        email: z.string(),
        fullName: z.string().nullable(),
      })
      .strict(),
    eventType: z
      .object({
        id: z.string().uuid(),
        code: z.string(),
        label: z.string(),
      })
      .strict(),
  })
  .strict();

export const AdminEventsListResponseSchema = z
  .object({
    items: z.array(AdminEventListItemSchema),
    pagination: z
      .object({
        nextCursor: z.string().nullable(),
        pageSize: z.number().int().min(1).max(50),
      })
      .strict(),
  })
  .strict();

export const AdminEventIdOpenApiParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();
