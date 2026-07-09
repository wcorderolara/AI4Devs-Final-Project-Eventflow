// Helper success() — construye el success envelope canónico (US-093 / BE-004). ADR-API-002.
// Todos los controladores usan este helper; ninguno construye el envelope manualmente (VR-04).
import type { SuccessEnvelope, PaginationMeta } from './types.js';

export function success<T>(
  data: T,
  correlationId: string,
  pagination?: PaginationMeta,
): SuccessEnvelope<T> {
  const meta = { correlationId, timestamp: new Date().toISOString() };
  return pagination ? { data, pagination, meta } : { data, meta };
}
