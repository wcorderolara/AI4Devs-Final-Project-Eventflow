// US-079 (PB-P1-045) / FE-003 — Cliente admin de métricas.
// Alineado con el `Cache-Control: private, max-age=60` que emite el backend (Tech Spec §7 D3).
// El cliente TanStack sella el `staleTime` en 60_000 en el hook (`useAdminMetrics`).
import { httpGetData } from '@/shared/api-client';
import type { AdminMetricsDTO } from './adminMetricsApi.types';

export const adminMetricsApi = {
  async get(): Promise<AdminMetricsDTO> {
    return httpGetData<AdminMetricsDTO>('/admin/metrics');
  },
};
