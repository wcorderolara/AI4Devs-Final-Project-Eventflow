// US-086 (PB-P0-014) BE-003 — Contrato request/response del endpoint de reset surgical Demo.
// Doc 16 §39.2/§39.3. `ResetRequestSchema` valida el body opcional con `.strict()` (VR-01: campos
// desconocidos → 400). Los DTOs de respuesta se exportan para reuso por la futura UI admin
// (PB-P3-001 / US-140) y el harness QA E2E (PB-P2-016).
import { z } from 'zod';

/**
 * Body opcional del `POST /api/v1/admin/seed/reset`. `reason` documenta el motivo del reset y se
 * persiste en `AdminAction.metadata`. `.strict()` rechaza cualquier campo desconocido (VR-01).
 */
export const ResetRequestSchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export type ResetRequest = z.infer<typeof ResetRequestSchema>;

/** Respuesta `202 Accepted` del reset (Doc 16 §39.2). Conteos por entidad + metadatos agregados. */
export interface ResetReportDto {
  entitiesDeleted: Record<string, number>;
  entitiesReseeded: Record<string, number>;
  seedVersion: string;
  correlationId: string;
  durationMs: number;
}

/** Respuesta `200 OK` de `GET /api/v1/admin/seed/status` (Doc 16 §39.3). */
export interface SeedStatusResponseDto {
  lastRunAt: string | null;
  preset: 'minimal' | 'full' | null;
  recordCount: Record<string, number>;
}
