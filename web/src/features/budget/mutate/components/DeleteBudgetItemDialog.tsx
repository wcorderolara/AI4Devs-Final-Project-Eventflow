'use client';

// US-036 (PB-P1-020 / FE-007) — Modal de confirmación para eliminar un BudgetItem.
import { useTranslations } from 'next-intl';
import { Alert, ConfirmationDialog } from '@/shared/design-system';
import type { BudgetItemDto } from '@/features/budget/view/api/budgetApi';

export interface DeleteBudgetItemDialogProps {
  open: boolean;
  item: BudgetItemDto | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteBudgetItemDialog({
  open,
  item,
  submitting = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: DeleteBudgetItemDialogProps): React.JSX.Element {
  const t = useTranslations('budget.deleteItem');
  return (
    <ConfirmationDialog
      open={open && item !== null}
      onClose={onCancel}
      title={t('title')}
      description={t('body', { label: item?.label ?? '' })}
      confirmLabel={t('cta.delete')}
      cancelLabel={t('cta.cancel')}
      loadingLabel={t('cta.deleting')}
      variant="destructive"
      isLoading={submitting}
      onConfirm={onConfirm}
    >
      {errorMessage ? (
        <Alert variant="error" live>
          {errorMessage}
        </Alert>
      ) : null}
    </ConfirmationDialog>
  );
}
