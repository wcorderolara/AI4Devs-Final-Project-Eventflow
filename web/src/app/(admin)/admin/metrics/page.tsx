// US-079 (PB-P1-045) / FE-001 — Página admin `/admin/metrics`. Server Component que monta el
// shell client `MetricsDashboard`; el fetch, cache TanStack y estado local viven en el cliente.
import { MetricsDashboard } from '@/features/admin/metrics';

export default function AdminMetricsPage(): React.JSX.Element {
  return <MetricsDashboard />;
}
