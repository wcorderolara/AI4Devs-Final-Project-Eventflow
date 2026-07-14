'use client';

// US-031 (PB-P1-017 / FE-002) — Barra sticky con conteo, acciones y submit del bulk.
// Deshabilita el botón "Confirmar" cuando N=0 o N>50 (VR-03 client-side, EC-07). Spinner durante
// el submit. Conserva contraste WCAG AA vía clases utilitarias del design system del proyecto
// (los estilos concretos viven en el design system; aquí sólo se aplican `data-*` semánticos).
import { useTranslations } from 'next-intl';
import { useConfirmAITasksBulk } from '../hooks/useConfirmAITasksBulk';
import type { ConfirmAITasksBulkResponse } from '../api/tasksBulkApi';

const BULK_CONFIRM_MAX_IDS = 50;

interface Props {
  eventId: string;
  selectedIds: Set<string>;
  visibleIds: string[];
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onSuccess: (response: ConfirmAITasksBulkResponse) => void;
  onSubmit?: (taskIds: string[]) => void;
}

export function BulkConfirmBar({
  eventId,
  selectedIds,
  visibleIds,
  onSelectAllVisible,
  onClearSelection,
  onSuccess,
  onSubmit,
}: Props): JSX.Element {
  const t = useTranslations('tasks.bulkConfirm');
  const mutation = useConfirmAITasksBulk({ eventId });

  const count = selectedIds.size;
  const overLimit = count > BULK_CONFIRM_MAX_IDS;
  const disabled = count === 0 || overLimit || mutation.isPending;

  const handleConfirm = (): void => {
    if (disabled) return;
    const taskIds = Array.from(selectedIds);
    onSubmit?.(taskIds);
    mutation.mutate(
      { taskIds },
      {
        onSuccess: (response) => onSuccess(response),
      },
    );
  };

  return (
    <div
      role="region"
      aria-label={t('sectionTitle')}
      data-sticky="bottom"
      data-testid="bulk-confirm-bar"
    >
      <p role="status" aria-live="polite">
        {t('selectionCount', { count })}
      </p>
      {overLimit ? <p role="alert">{t('limitReached')}</p> : null}
      <button
        type="button"
        onClick={onSelectAllVisible}
        disabled={visibleIds.length === 0}
      >
        {t('selectAllVisible')}
      </button>
      <button type="button" onClick={onClearSelection} disabled={count === 0}>
        {t('clearSelection')}
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={disabled}
        aria-busy={mutation.isPending}
      >
        {mutation.isPending ? t('confirming') : t('confirmSelected', { count })}
      </button>
    </div>
  );
}
