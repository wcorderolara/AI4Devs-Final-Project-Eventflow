'use client';

// DeleteImageDialog (US-048 / PB-P1-026 / FE-001).
// Confirmación destructiva sobre `ConfirmationDialog`: ESC cierra sin confirmar y el foco
// inicial va a "Cancelar" (D2 / A11Y). Textarea opcional para `deletion_reason` (label
// visible, contador de caracteres, límite 500 alineado con el backend).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, ConfirmationDialog } from '@/shared/design-system';
import { resolveErrorCode } from '@/shared/error-handling/errorCodeMessages';
import { useDeletePortfolioImage } from '../hooks/useDeletePortfolioImage';

const MAX_REASON = 500;

export interface DeleteImageDialogProps {
  isOpen: boolean;
  imageId: string;
  workLabel: string;
  onClose: () => void;
  onDeleted: (imageId: string) => void;
}

type ErrorCode =
  | 'ATTACHMENT_NOT_FOUND'
  | 'INVALID_DELETION_REASON'
  | 'PROFILE_HIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'UNEXPECTED';

const KNOWN_CODES: readonly ErrorCode[] = [
  'ATTACHMENT_NOT_FOUND',
  'INVALID_DELETION_REASON',
  'PROFILE_HIDDEN',
  'PROFILE_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
];

export function DeleteImageDialog(props: DeleteImageDialogProps): JSX.Element {
  const t = useTranslations('vendor.portfolio.delete');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ErrorCode | null>(null);
  const mutation = useDeletePortfolioImage();

  useEffect(() => {
    if (props.isOpen) {
      setReason('');
      setError(null);
    }
  }, [props.isOpen]);

  const onConfirm = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await mutation.mutateAsync({
        imageId: props.imageId,
        deletionReason: reason.trim().length > 0 ? reason.trim() : undefined,
      });
      props.onDeleted(props.imageId);
      props.onClose();
    } catch (err) {
      setError(resolveErrorCode(err, KNOWN_CODES));
    }
  }, [mutation, props, reason]);

  const remaining = MAX_REASON - reason.length;

  return (
    <ConfirmationDialog
      open={props.isOpen}
      onClose={props.onClose}
      title={t('title', { workLabel: props.workLabel })}
      description={t('description')}
      confirmLabel={t('actions.confirm')}
      cancelLabel={t('actions.cancel')}
      loadingLabel={t('actions.deleting')}
      variant="destructive"
      isLoading={mutation.isPending}
      onConfirm={onConfirm}
    >
      <label className="block text-sm font-medium text-neutral-800">
        <span>{t('reason.label')}</span>
        <textarea
          value={reason}
          onChange={(ev) => setReason(ev.target.value.slice(0, MAX_REASON))}
          placeholder={t('reason.placeholder')}
          maxLength={MAX_REASON}
          rows={3}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-1 text-xs text-neutral-500" aria-live="polite">
        {t('reason.remaining', { remaining })}
      </p>

      {error !== null && (
        <Alert variant="error" live className="mt-3">
          {t(`errors.${error}`)}
        </Alert>
      )}
    </ConfirmationDialog>
  );
}
