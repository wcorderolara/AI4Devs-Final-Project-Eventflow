'use client';

// EventTypeDeleteDialog (US-076 / FE-002). Confirmación de soft delete con reason
// obligatorio [10..500] (VR-07). Sin hard delete físico (SEC-04). Al éxito, invalida
// la lista admin y las queries públicas de EventTypes (wizard de creación).
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useDeleteEventType } from '../hooks/adminEventTypesQueries';
import type { AdminEventTypeNode } from '../api/adminEventTypesApi.types';
import type { ApiError } from '@/shared/api-client';

const REASON_MIN = 10;
const REASON_MAX = 500;

interface Props {
  node: AdminEventTypeNode | null;
  onClose: () => void;
  onSuccess?: (node: AdminEventTypeNode) => void;
}

export function EventTypeDeleteDialog({ node, onClose, onSuccess }: Props): React.JSX.Element | null {
  const t = useTranslations('admin.event-type.delete');
  const tErrors = useTranslations('admin.event-type.errors');
  const titleId = useId();
  const reasonId = useId();
  const counterId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [reason, setReason] = useState('');
  const mutation = useDeleteEventType();

  useEffect(() => {
    if (node) {
      setReason('');
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (node && !dlg.open) dlg.showModal();
    if (!node && dlg.open) dlg.close();
  }, [node]);

  const close = useCallback(() => {
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const tooShort = reason.length > 0 && reason.length < REASON_MIN;
  const tooLong = reason.length > REASON_MAX;
  const canSubmit = !mutation.isPending && reason.length >= REASON_MIN && reason.length <= REASON_MAX;

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!node || !canSubmit) return;
      mutation.mutate(
        { id: node.id, reason },
        {
          onSuccess: (data) => {
            onSuccess?.(data);
            close();
          },
        },
      );
    },
    [node, canSubmit, mutation, reason, onSuccess, close],
  );

  if (!node) return null;
  const label = node.name_i18n['es-LATAM'] ?? node.label;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-testid="event-type-delete-dialog"
      className="rounded-lg p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <form method="dialog" onSubmit={onSubmit} className="flex w-[min(520px,90vw)] flex-col gap-4 p-6">
        <header>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {t('title', { name: label })}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">{t('description')}</p>
        </header>

        <div>
          <label htmlFor={reasonId} className="block text-sm font-medium text-neutral-800">
            {t('reasonLabel')}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={REASON_MIN}
            maxLength={REASON_MAX}
            rows={4}
            aria-describedby={counterId}
            aria-invalid={tooShort || tooLong || undefined}
            data-testid="event-type-delete-reason"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />
          <p id={counterId} className="mt-1 text-xs text-neutral-500">
            {t('counter', { current: reason.length, min: REASON_MIN, max: REASON_MAX })}
          </p>
        </div>

        {mutation.isError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {mapErrorCode(mutation.error, tErrors)}
          </div>
        ) : null}

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="event-type-delete-submit"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {mutation.isPending ? t('submitting') : t('submit')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function mapErrorCode(err: ApiError, tErrors: (k: string) => string): string {
  const code = (err as { code?: string })?.code ?? 'UNEXPECTED';
  const key = ERROR_KEYS[code] ?? 'unexpected';
  return tErrors(key);
}

const ERROR_KEYS: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  EVENT_TYPE_NOT_FOUND: 'notFound',
  EVENT_TYPE_IN_USE: 'eventTypeInUse',
  REASON_REQUIRED: 'reasonRequired',
  INVALID_REASON_LENGTH: 'reasonLength',
  VALIDATION_ERROR: 'validation',
};
