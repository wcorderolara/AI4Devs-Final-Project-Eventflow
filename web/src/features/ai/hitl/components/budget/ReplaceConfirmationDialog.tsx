'use client';

// US-037 (PB-P1-021 / FE-004) — Modal de confirmación D2. Se muestra ANTES de invocar apply
// cuando el preview detecta `replaced_items_count > 0`. Copy localizado con conteo.
import { useTranslations } from 'next-intl';
import { ConfirmationDialog } from '@/shared/design-system';

export interface ReplaceConfirmationDialogProps {
  open: boolean;
  replaceCount: number;
  affectedCategories?: string[];
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReplaceConfirmationDialog({
  open,
  replaceCount,
  affectedCategories = [],
  submitting = false,
  onCancel,
  onConfirm,
}: ReplaceConfirmationDialogProps): JSX.Element {
  const t = useTranslations('ai.budgetApply.replaceConfirm');
  return (
    <ConfirmationDialog
      open={open}
      onClose={onCancel}
      title={t('title')}
      description={t('body', {
        count: replaceCount,
        categories: affectedCategories.join(', ') || t('anyCategory'),
      })}
      confirmLabel={t('cta.confirm')}
      cancelLabel={t('cta.cancel')}
      loadingLabel={t('cta.confirming')}
      variant="destructive"
      isLoading={submitting}
      onConfirm={onConfirm}
    >
      <p className="font-body text-caption text-secondary">{t('manualPreserved')}</p>
    </ConfirmationDialog>
  );
}
