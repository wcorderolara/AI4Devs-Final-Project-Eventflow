'use client';

// CancelBookingDialog (US-062 / PB-P1-036 / FE-001). Modal accesible compartido organizer/vendor
// para cancelar un `BookingIntent`:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-describedby`.
//   - Focus trap básico (foco inicial en "Volver" — patrón destructive-safe; el default no cancela),
//     Tab/Shift+Tab acotados a los focusables del dialog, ESC cierra.
//   - Textarea OPCIONAL para `reason` (US-062 AC-03 permite cancelar sin razón) con contador
//     live 0..500 y `aria-describedby` conectado a hint + counter.
//   - Banner de error accesible (`role="alert"`) con mapeo i18n por código estable del backend
//     (`BOOKING_INTENT_NOT_FOUND`, `BOOKING_INTENT_NOT_CANCELLABLE`, `INVALID_CANCELLATION_REASON`,
//     `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`, `UNEXPECTED`).
//
// Rol-neutral: el mismo componente sirve al organizer y al vendor (el backend determina la
// contraparte para la notificación en base al rol de sesión). La vista padre pasa `role` para
// pintar labels específicos ("cancelar" en organizer vs "declinar" no aplica — mismos labels).
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { bookingsApi } from '../api/bookingsApi';
import type { CancelBookingIntentView } from '../api/bookingsApi.types';

const REASON_MAX = 500;

const KNOWN_ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_CANCELLATION_REASON',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'BOOKING_INTENT_NOT_FOUND',
  'BOOKING_INTENT_NOT_CANCELLABLE',
  'RATE_LIMIT_EXCEEDED',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export interface CancelBookingDialogProps {
  bookingIntentId: string;
  /** Se dispara al cerrar (ESC, botón "Volver" o tras onSuccess). */
  onClose: () => void;
  /** Callback tras cancelación exitosa. */
  onSuccess?: (view: CancelBookingIntentView) => void;
  /**
   * Adapter opcional del cliente de API — permite inyectar un mock en tests unitarios sin
   * levantar MSW. En producción usa `bookingsApi.cancel` por default.
   */
  cancelFn?: (input: { bookingIntentId: string; reason?: string }) => Promise<CancelBookingIntentView>;
}

export function CancelBookingDialog(props: CancelBookingDialogProps): JSX.Element {
  const { bookingIntentId, onClose, onSuccess, cancelFn } = props;
  const t = useTranslations('booking.cancel');
  const tError = useTranslations('booking.cancel.errors');

  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const reasonHintId = useId();
  const reasonCounterId = useId();
  const bannerId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  const reasonTooLong = reason.length > REASON_MAX;

  useEffect(() => {
    cancelBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = useCallback(async (): Promise<void> => {
    if (isSubmitting || reasonTooLong) return;
    setServerErrorCode(null);
    setIsSubmitting(true);
    try {
      const fn = cancelFn ?? bookingsApi.cancel;
      const view = await fn({ bookingIntentId, reason });
      onSuccess?.(view);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerErrorCode(err.code);
      } else {
        setServerErrorCode('UNEXPECTED');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, reasonTooLong, bookingIntentId, reason, cancelFn, onSuccess, onClose]);

  const bannerMessage = serverErrorCode
    ? isKnownErrorCode(serverErrorCode)
      ? tError(serverErrorCode)
      : tError('UNEXPECTED')
    : null;

  const describedBy = [descId, bannerMessage ? bannerId : null].filter(Boolean).join(' ');
  const reasonDescribedBy = [reasonHintId, reasonCounterId].join(' ');

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          {t('title')}
        </h2>
        <p id={descId} className="mt-2 text-sm text-neutral-600">
          {t('description')}
        </p>

        {bannerMessage != null && (
          <div
            id={bannerId}
            role="alert"
            aria-live="polite"
            className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {bannerMessage}
          </div>
        )}

        <div className="mt-4">
          <label htmlFor={reasonId} className="block text-sm font-medium text-neutral-900">
            {t('reasonLabel')}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            rows={4}
            maxLength={REASON_MAX}
            aria-invalid={reasonTooLong}
            aria-describedby={reasonDescribedBy}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <p id={reasonHintId} className="mt-1 text-xs text-neutral-500">
            {t('reasonHint')}
          </p>
          <p id={reasonCounterId} aria-live="polite" className="mt-1 text-xs text-neutral-500">
            {t('reasonCounter', { count: reason.length })}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || reasonTooLong}
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? t('actions.submitting') : t('actions.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
