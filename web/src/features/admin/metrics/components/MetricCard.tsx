'use client';

// US-079 (PB-P1-045) / FE-002 — Card genérica de métrica operativa.
// A11Y: región etiquetada por el título; breakdown opcional como `<dl>` con pares `<dt>`/`<dd>`.
//
// PB-P2-031: deja de mantener su propio markup y compone `MetricCard` + `DescriptionList` del
// design system. La API pública es la misma, de modo que los tres dashboards que la consumen
// (organizer, vendor y admin) se migran sin tocar ni una llamada. El desglose sigue siendo un
// `<dl>`: se conserva la semántica y se ganan los tokens y el tratamiento de foco del catálogo.
import type { ReactNode } from 'react';
import {
  DescriptionList,
  DescriptionListItem,
  MetricCard as SharedMetricCard,
} from '@/shared/design-system';

export interface MetricCardBreakdownItem {
  key: string;
  label: string;
  value: number;
}

interface Props {
  id: string;
  title: string;
  total: number;
  totalAriaLabel?: string;
  breakdown?: MetricCardBreakdownItem[];
  breakdownTitle?: string;
  footer?: ReactNode;
}

export function MetricCard({
  id,
  title,
  total,
  totalAriaLabel,
  breakdown,
  breakdownTitle,
  footer,
}: Props): React.JSX.Element {
  const hasBreakdown = breakdown !== undefined && breakdown.length > 0;

  return (
    <SharedMetricCard
      id={id}
      label={title}
      value={total}
      // El nombre accesible del número nunca es la cifra desnuda: sin unidad, `24` no dice nada.
      valueDescription={totalAriaLabel ?? `${title}: ${total}`}
      footer={footer}
    >
      {hasBreakdown ? (
        <>
          {breakdownTitle ? (
            <p className="mb-1 font-ui text-caption uppercase tracking-ef-wide text-muted">
              {breakdownTitle}
            </p>
          ) : null}
          <DescriptionList columns={2} compact>
            {breakdown.map((item) => (
              <DescriptionListItem key={item.key} term={item.label} numeric>
                {item.value}
              </DescriptionListItem>
            ))}
          </DescriptionList>
        </>
      ) : null}
    </SharedMetricCard>
  );
}
