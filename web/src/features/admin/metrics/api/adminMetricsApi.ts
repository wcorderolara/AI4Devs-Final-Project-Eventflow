// US-079 (PB-P1-045) / FE-003 — Cliente admin de métricas.
// Alineado con el `Cache-Control: private, max-age=60` que emite el backend (Tech Spec §7 D3).
// El cliente TanStack sella el `staleTime` en 60_000 en el hook (`useAdminMetrics`).
import { httpGet } from '@/shared/api-client';
import type { AdminMetricsDTO, AdminMetricsEnvelope } from './adminMetricsApi.types';

export const adminMetricsApi = {
  async get(): Promise<AdminMetricsDTO> {
    const envelope = await httpGet<AdminMetricsEnvelope>('/admin/metrics');
    return envelope.data;
  },
};
