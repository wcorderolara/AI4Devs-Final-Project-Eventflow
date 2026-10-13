'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, ConfirmationDialog } from '@/shared/design-system';
import { useSeedReset } from '../hooks/useAdminSeed';
import type { SeedResetReportDTO } from '../api/adminSeedApi.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReset: (report: SeedResetReportDTO) => void;
}

const CONFIRM_TOKEN = 'RESET';

export function SeedResetDialog({ isOpen, onClose, onReset }: Props): React.JSX.Element {
  const t = useTranslations('admin.seed.reset');
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const mutation = useSeedReset();

  function close(): void {
    if (mutation.isPending) return;
    setConfirmText('');
    setReason('');
    mutation.reset();
    onClose();
  }

  async function confirm(): Promise<void> {
    if (confirmText !== CONFIRM_TOKEN || mutation.isPending) return;
    try {
      const report = await mutation.mutateAsync({ reason });
      onReset(report);
      setConfirmText('');
      setReason('');
      onClose();
    } catch {
      // el error se muestra dentro del dialog via mutation.error
    }
  }

  // `Enter` en el campo de confirmación envía el formulario (envío implícito: no hay botón
  // submit dentro, la acción vive en el pie del diálogo).
  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void confirm();
  }

  // EC-02/EC-03: mensaje neutro y localizado según el código del backend. Nunca renderizamos el
  // texto crudo del error (evita filtrar stack/SQL/PII); solo un mensaje controlado + correlationId.
  const errorMessage = mutation.error?.status === 409 ? t('errorInProgress') : t('error');
  const errorCorrelationId = mutation.error?.correlationId;

  return (
    <ConfirmationDialog
      open={isOpen}
      onClose={close}
      title={t('title')}
      description={t('warning')}
      confirmLabel={t('confirm')}
      cancelLabel={t('cancel')}
      loadingLabel={t('resetting')}
      variant="destructive"
      isLoading={mutation.isPending}
      confirmDisabled={confirmText !== CONFIRM_TOKEN}
      onConfirm={confirm}
    >
      <ul className="list-inside list-disc text-xs text-neutral-600">
        <li>{t('bullets.deletes')}</li>
        <li>{t('bullets.reseeds')}</li>
        <li>{t('bullets.audited')}</li>
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="flex flex-col text-xs font-medium text-neutral-700">
          {t('reasonLabel')}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('reasonPlaceholder')}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            disabled={mutation.isPending}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-neutral-700">
          {t('confirmLabel', { token: CONFIRM_TOKEN })}
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1 font-mono text-sm"
            disabled={mutation.isPending}
          />
        </label>

        {mutation.isError ? (
          <Alert variant="error" live>
            <p>{errorMessage}</p>
            {errorCorrelationId ? (
              <p className="mt-1 font-mono text-[0.7rem]">
                {t('correlationId', { id: errorCorrelationId })}
              </p>
            ) : null}
          </Alert>
        ) : null}
      </form>
    </ConfirmationDialog>
  );
}
