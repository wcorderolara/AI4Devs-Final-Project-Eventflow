'use client';

// WorkGrid (US-043 / PB-P1-026 / FE-003, extendido en US-048 / FE-002).
// Agrupa las imágenes recientes por `work_label` y muestra el contador `N/10` con `aria-live`.
// Cada thumbnail incluye un CTA "Eliminar" (aria-label con work_label + índice) que abre
// `DeleteImageDialog` (US-048). Tras el DELETE, el listado se actualiza vía la callback
// `onDeleted` — el reset del estado remoto vive en la mutation hook (invalida query).
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PortfolioImageView } from '../api/vendorPortfolioApi.types';
import { DeleteImageDialog } from './DeleteImageDialog';

export interface WorkGridProps {
  images: readonly PortfolioImageView[];
  /**
   * Callback invocada tras un DELETE exitoso — la página propietaria del estado local se
   * encarga de filtrar el `id` fuera del arreglo. La invalidación de la query remota vive
   * en `useDeletePortfolioImage`.
   */
  onImageDeleted?: (imageId: string) => void;
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

interface DialogState {
  imageId: string;
  workLabel: string;
}

export function WorkGrid(props: WorkGridProps): JSX.Element {
  const t = useTranslations('vendor.portfolio');
  const groups = useMemo(() => groupByWorkLabel(props.images), [props.images]);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  if (groups.length === 0) {
    return <p className="text-sm text-neutral-500">{t('empty')}</p>;
  }

  const handleDeleted = (imageId: string): void => {
    props.onImageDeleted?.(imageId);
  };

  return (
    <>
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
              {group.images.map((img, index) => (
                <li
                  key={img.id}
                  className="flex flex-col gap-1 rounded bg-neutral-100 p-2 text-center text-xs text-neutral-600"
                  title={`${img.dimensions.width} × ${img.dimensions.height}`}
                >
                  <span>
                    {t('grid.imageAria', {
                      width: img.dimensions.width,
                      height: img.dimensions.height,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDialog({ imageId: img.id, workLabel: group.workLabel })}
                    aria-label={t('delete.trigger.aria', {
                      workLabel: group.workLabel,
                      index: index + 1,
                    })}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    {t('delete.trigger.label')}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {dialog !== null && (
        <DeleteImageDialog
          isOpen
          imageId={dialog.imageId}
          workLabel={dialog.workLabel}
          onClose={() => setDialog(null)}
          onDeleted={(imageId) => {
            handleDeleted(imageId);
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
