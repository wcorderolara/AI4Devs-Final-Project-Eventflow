'use client';

// US-079 (PB-P1-045) / FE-002 — Card especializada para métricas de IA.
// Muestra el total + breakdown por `recommendation_type` con success rate (`success_count /
// total_count`) para monitoreo de salud (Decisión PO D5).
// A11Y: `role="region"` + `<table>` con `<caption>` y headers `scope="col"`.
//
// PB-P2-033: la card pasa a `Card` y la tabla a las primitivas `Table` del design system.
import { useTranslations } from 'next-intl';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
import type { AdminMetricsAI } from '../api/adminMetricsApi.types';

interface Props {
  id: string;
  title: string;
  ai: AdminMetricsAI;
}

function formatRate(success: number, total: number): string {
  if (total === 0) return '—';
  const pct = Math.round((success / total) * 100);
  return `${pct}%`;
}

export function AIMetricsCard({ id, title, ai }: Props): React.JSX.Element {
  const t = useTranslations('admin.metrics.sections.aiCard');
  const headingId = `${id}-title`;
  const rows = Object.entries(ai.by_type).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Card
      as="section"
      padding="sm"
      aria-labelledby={headingId}
      className="md:col-span-2 lg:col-span-3"
    >
      <header className="flex items-baseline justify-between gap-4">
        <h3 id={headingId} className="font-ui text-label font-semibold text-secondary">
          {title}
        </h3>
        <span
          className="font-heading text-h3 font-semibold tabular-nums text-primary"
          aria-label={t('totalAria', { total: ai.total_recommendations })}
        >
          {ai.total_recommendations}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="mt-3 font-body text-body-sm text-secondary">{t('empty')}</p>
      ) : (
        // El `<caption>` que renderiza `Table` ya describe la tabla: el `aria-describedby`
        // manual que apuntaba a ese mismo caption era redundante.
        <Table caption={t('tableCaption')} density="compact" containerClassName="mt-3">
          <TableHead>
            <TableRow>
              <TableHeaderCell density="compact">{t('col.type')}</TableHeaderCell>
              <TableHeaderCell density="compact" align="numeric">
                {t('col.total')}
              </TableHeaderCell>
              <TableHeaderCell density="compact" align="numeric">
                {t('col.success')}
              </TableHeaderCell>
              <TableHeaderCell density="compact" align="numeric">
                {t('col.rate')}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(([type, entry]) => (
              <TableRow key={type}>
                <TableCell density="compact" header>
                  {type}
                </TableCell>
                <TableCell density="compact" align="numeric">
                  {entry.total_count}
                </TableCell>
                <TableCell density="compact" align="numeric">
                  {entry.success_count}
                </TableCell>
                <TableCell density="compact" align="numeric">
                  {formatRate(entry.success_count, entry.total_count)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
