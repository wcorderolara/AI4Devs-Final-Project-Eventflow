// US-080 / DOC-001 — Zod schema del `AdminActionsListResponse` para el snapshot OpenAPI.
// Mirrors `AdminActionListItem` (§7 DTOs). No es consumido por el runtime de la app;
// sirve como fuente única del contrato en la documentación.
import { z } from 'zod';

export const AdminActionListItemAdminSchema = z
  .object({
    id: z.string().uuid().nullable(),
    businessName: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();

export const AdminActionListItemSchema = z
  .object({
    id: z.string().uuid(),
    admin: AdminActionListItemAdminSchema,
    target_type: z.string(),
    target_id: z.string().uuid(),
    action: z.string(),
    reason: z.string().nullable(),
    // `payload` es un Json arbitrario; `record(z.unknown())` mantiene compatibilidad OpenAPI
    // sin restringir el shape del metadata heterogéneo del audit log.
    payload: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.string(),
  })
  .strict();

export const AdminActionsListResponseSchema = z
  .object({
    items: z.array(AdminActionListItemSchema),
    pagination: z
      .object({
        nextCursor: z.string().nullable(),
        pageSize: z.number().int().min(1).max(50),
      })
      .strict(),
  })
  .strict();
