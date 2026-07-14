// Helper success() — construye el success envelope canónico (US-093 / BE-004). ADR-API-002.
// Todos los controladores usan este helper; ninguno construye el envelope manualmente (VR-04).
//
// US-033 (PB-P1-019 / BE-004) — Se acepta un parámetro opcional `progress` para exponer
// agregados aditivos (por ejemplo, `progress` del checklist en `GET /events/:id/tasks`) sin
// romper el envelope canónico. `undefined` ⇒ el campo se omite del payload.
import type { SuccessEnvelope, PaginationMeta } from './types.js';

export function success<T>(
  data: T,
  correlationId: string,
  pagination?: PaginationMeta,
  progress?: unknown,
): SuccessEnvelope<T> {
  const meta = { correlationId, timestamp: new Date().toISOString() };
  const envelope: SuccessEnvelope<T> = { data, meta };
  if (pagination) envelope.pagination = pagination;
  if (progress !== undefined) envelope.progress = progress;
  return envelope;
}
