'use client';

// US-079 (PB-P1-045) / FE-002 — Card especializada para métricas de IA.
// Muestra el total + breakdown por `recommendation_type` con success rate (`success_count /
// total_count`) para monitoreo de salud (Decisión PO D5).
// A11Y: `role="region"` + `<table>` con `<caption>` y headers `scope="col"`.
import { useTranslations } from 'next-intl';
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
  const captionId = `${id}-caption`;
  const rows = Object.entries(ai.by_type).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm md:col-span-2 lg:col-span-3"
    >
      <header className="flex items-baseline justify-between gap-4">
        <h3 id={headingId} className="text-sm font-semibold text-neutral-700">
          {title}
        </h3>
        <span
          className="text-2xl font-bold text-neutral-900"
          aria-label={t('totalAria', { total: ai.total_recommendations })}
        >
          {ai.total_recommendations}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">{t('empty')}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm" aria-describedby={captionId}>
            <caption id={captionId} className="sr-only">
              {t('tableCaption')}
            </caption>
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th scope="col" className="py-1 pr-3">
                  {t('col.type')}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t('col.total')}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t('col.success')}
                </th>
                <th scope="col" className="py-1 text-right">
                  {t('col.rate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([type, entry]) => (
                <tr key={type} className="border-b border-neutral-100 last:border-0">
                  <td className="py-1 pr-3 font-medium text-neutral-800">{type}</td>
                  <td className="py-1 pr-3 text-right text-neutral-900">{entry.total_count}</td>
                  <td className="py-1 pr-3 text-right text-neutral-900">{entry.success_count}</td>
                  <td className="py-1 text-right text-neutral-900">
                    {formatRate(entry.success_count, entry.total_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
