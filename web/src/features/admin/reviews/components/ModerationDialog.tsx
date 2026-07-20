'use client';

// ModerationDialog (US-067 / PB-P1-040 / FE-002). Modal accesible con focus trap nativo del
// <dialog> HTML, action selector (radio) + textarea reason con contador 10..500 (VR-03).
//
// Accesibilidad (Tech Spec §8, AC A11Y):
//   - `<dialog>` nativo + `showModal()` provee focus trap y trap-de-esc "for free".
//   - `aria-labelledby` apunta al título; textarea `aria-describedby` al contador.
//   - Cierre por Escape + botón "Cancelar"; sin backdrop-click destructivo (evita moderaciones
//     accidentales — Tech Spec §17 "Reason vacío 'spam'").
//   - Foco inicial en el primer radio; al cerrar, foco vuelve al trigger (el <dialog> nativo
//     restaura foco al `returnValue` handler; el trigger delega vía `dialogRef.current?.close()`).
//
// El submit ejecuta la mutation TanStack `useModerateReview` (US-067 FE-003).
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModerateReview } from '../hooks/adminReviewsQueries';
import type { ModerateAction } from '../api/adminReviewsApi.types';
import type { ApiError } from '@/shared/api-client';

const REASON_MIN = 10;
const REASON_MAX = 500;

export interface ModerationDialogReview {
  id: string;
  vendorId: string;
  vendorSlug?: string;
  currentStatus: 'published' | 'hidden' | 'removed';
  authorMasked?: string;
  ratingSnapshot?: number;
}

interface Props {
  review: ModerationDialogReview | null;
  onClose: () => void;
  onSuccess?: (status: 'hidden' | 'removed') => void;
}

/**
 * Devuelve las acciones permitidas para el status actual — Decisión PO D2 whitelist.
 * `removed` es final (SEC-03) → array vacío deshabilita el submit y muestra un banner.
 */
function allowedActions(status: 'published' | 'hidden' | 'removed'): ModerateAction[] {
  if (status === 'published') return ['hide', 'remove'];
  if (status === 'hidden') return ['remove'];
  return [];
}

export function ModerationDialog({ review, onClose, onSuccess }: Props): React.JSX.Element | null {
  const t = useTranslations('admin.review.moderate.dialog');
  const tActions = useTranslations('admin.review.moderate.actions');
  const tErrors = useTranslations('admin.review.moderate.errors');

  const titleId = useId();
  const reasonId = useId();
  const counterId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [action, setAction] = useState<ModerateAction>('hide');
  const [reason, setReason] = useState('');

  const mutation = useModerateReview({
    vendorId: review?.vendorId,
    vendorSlug: review?.vendorSlug,
  });

  const allowed = useMemo(
    () => (review ? allowedActions(review.currentStatus) : []),
    [review],
  );
  const disabled = allowed.length === 0;

  // Sincroniza `action` con las opciones válidas cuando cambia la review target (evita quedar
  // con `hide` cuando el status actual sólo permite `remove`).
  useEffect(() => {
    if (allowed.length === 0) return;
    if (!allowed.includes(action)) setAction(allowed[0]!);
  }, [allowed, action]);

  // Reset del reason al abrir con una review nueva.
  useEffect(() => {
    if (review) {
      setReason('');
      mutation.reset();
    }
    // `mutation` intencionalmente omitido para evitar loop de reset — sólo depende del id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.id]);

  // Abre/cierra el <dialog> nativo cuando la prop `review` cambia.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (review && !dlg.open) dlg.showModal();
    if (!review && dlg.open) dlg.close();
  }, [review]);

  const close = useCallback(() => {
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!review || disabled) return;
      if (reason.length < REASON_MIN || reason.length > REASON_MAX) return;
      mutation.mutate(
        { reviewId: review.id, action, reason },
        {
          onSuccess: (data) => {
            onSuccess?.(data.status);
            close();
          },
        },
      );
    },
    [review, disabled, reason, mutation, action, onSuccess, close],
  );

  if (!review) return null;

  const reasonTooShort = reason.length > 0 && reason.length < REASON_MIN;
  const reasonTooLong = reason.length > REASON_MAX;
  const canSubmit =
    !disabled && !mutation.isPending && reason.length >= REASON_MIN && reason.length <= REASON_MAX;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-testid="review-moderation-dialog"
      className="rounded-lg p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <form
        method="dialog"
        onSubmit={onSubmit}
        className="flex w-[min(560px,90vw)] flex-col gap-4 p-6"
      >
        <header>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {t('currentStatusLabel', { status: t(`currentStatus.${review.currentStatus}`) })}
          </p>
        </header>

        {disabled ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {t('finalRemovedNotice')}
          </div>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-800">{t('actionLegend')}</legend>
            {allowed.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="moderation-action"
                  value={a}
                  checked={action === a}
                  onChange={() => setAction(a)}
                  className="h-4 w-4"
                />
                <span>{tActions(a)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div>
          <label htmlFor={reasonId} className="block text-sm font-medium text-neutral-800">
            {t('reasonLabel')}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={disabled}
            minLength={REASON_MIN}
            maxLength={REASON_MAX}
            rows={4}
            aria-describedby={counterId}
            aria-invalid={reasonTooShort || reasonTooLong || undefined}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-neutral-100"
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
            data-testid="review-moderation-submit"
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
  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      return tErrors('unauthenticated');
    case 'FORBIDDEN':
      return tErrors('forbidden');
    case 'REVIEW_NOT_FOUND':
      return tErrors('notFound');
    case 'INVALID_TRANSITION':
      return tErrors('invalidTransition');
    case 'VALIDATION_ERROR':
      return tErrors('validation');
    default:
      return tErrors('unexpected');
  }
}
