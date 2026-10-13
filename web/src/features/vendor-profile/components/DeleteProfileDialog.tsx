'use client';

// DeleteProfileDialog (US-041 / FE-003, AC-05 / AC-09).
// Confirmación destructiva sobre `ConfirmationDialog`: foco inicial en Cancelar y cierre
// bloqueado mientras la mutación está en vuelo.
import { useTranslations } from 'next-intl';
import { Alert, ConfirmationDialog } from '@/shared/design-system';

interface DeleteProfileDialogProps {
  isOpen: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  errorMessage?: string | null;
}

export function DeleteProfileDialog({
  isOpen,
  submitting,
  onCancel,
  onConfirm,
  errorMessage = null,
}: DeleteProfileDialogProps): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return (
    <ConfirmationDialog
      open={isOpen}
      onClose={onCancel}
      title={t('title')}
      description={t('description')}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      loadingLabel={t('submitting')}
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
