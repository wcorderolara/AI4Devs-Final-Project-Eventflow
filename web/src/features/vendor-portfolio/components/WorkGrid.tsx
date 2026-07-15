'use client';

// WorkGrid (US-043 / PB-P1-026 / FE-003).
// Agrupa las imágenes recientes por `work_label` y muestra el contador `N/10` con `aria-live`
// para anunciar cambios a lectores de pantalla. El listado remoto lo entrega una US futura;
// este componente opera sobre las vistas mantenidas en memoria por la página (agregadas por
// cada upload exitoso).
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { PortfolioImageView } from '../api/vendorPortfolioApi.types';

export interface WorkGridProps {
  images: readonly PortfolioImageView[];
}

interface WorkGroup {
  workLabel: string;
  images: PortfolioImageView[];
  count: number;
}

function groupByWorkLabel(images: readonly PortfolioImageView[]): WorkGroup[] {
  const map = new Map<string, WorkGroup>();
  for (const img of images) {
    const key = img.workLabel.toLowerCase();
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.images.push(img);
      existing.count += 1;
    } else {
      map.set(key, { workLabel: img.workLabel, images: [img], count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.workLabel.localeCompare(b.workLabel));
}

export function WorkGrid(props: WorkGridProps): JSX.Element {
  const t = useTranslations('vendor.portfolio');
  const groups = useMemo(() => groupByWorkLabel(props.images), [props.images]);

  if (groups.length === 0) {
    return <p className="text-sm text-neutral-500">{t('empty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-4" aria-label={t('grid.label')}>
      {groups.map((group) => (
        <li key={group.workLabel} className="rounded border border-neutral-200 p-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold">{group.workLabel}</h3>
            <span aria-live="polite" className="text-sm text-neutral-600">
              {t('grid.counter', { current: group.count, max: 10 })}
            </span>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {group.images.map((img) => (
              <li
                key={img.id}
                className="rounded bg-neutral-100 px-2 py-3 text-center text-xs text-neutral-600"
                title={`${img.dimensions.width} × ${img.dimensions.height}`}
              >
                {t('grid.imageAria', { width: img.dimensions.width, height: img.dimensions.height })}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
