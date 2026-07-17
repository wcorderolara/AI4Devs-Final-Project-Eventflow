'use client';

// ConfirmBookingDialog (US-061 / PB-P1-036 / FE-001). Modal accesible para que el vendor
// confirme un `BookingIntent`:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-describedby`.
//   - Focus trap básico (foco inicial en "Cancelar" — patrón destructive-safe: el default no
//     dispara la mutación), Tab/Shift+Tab acotados a los focusables del dialog, ESC cierra.
//   - Texto disclaimer FR-BOOKING-006 con `aria-describedby` (no requiere checkbox — el vendor
//     confirma explícitamente vía la CTA "Confirmar"). El backend NO valida disclaimer server-side
//     en este endpoint (D8) porque la aceptación ya fue formalizada en US-060 por el organizer.
//   - Banner de error accesible (`role="alert"`) con mapeo i18n por código estable del backend
//     (`BOOKING_INTENT_NOT_FOUND`, `BOOKING_INTENT_NOT_CONFIRMABLE`, `AUTHENTICATION_REQUIRED`,
//     `FORBIDDEN`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `UNEXPECTED`).
//
// La vista que lo consume (detalle del BookingIntent del vendor) es responsable del disparador
// (CTA "Confirmar BookingIntent") y de propagar `onSuccess` para refrescar sus queries.
//
// Este componente NO acepta ni renderiza ningún dato de pago (FR-BOOKING-007, D8). El monto/
// moneda mostrados son sólo informativos — se pasan como props `quoteAmount` y `currencyCode`.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { vendorBookingsApi } from '../api/vendorBookingsApi';
import type { ConfirmBookingIntentView } from '../api/vendorBookingsApi.types';

const KNOWN_ERROR_CODES = [
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'BOOKING_INTENT_NOT_FOUND',
  'BOOKING_INTENT_NOT_CONFIRMABLE',
  'RATE_LIMIT_EXCEEDED',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export interface ConfirmBookingDialogProps {
  bookingIntentId: string;
  /** Monto mostrado en el resumen (informativo). */
  quoteAmount?: string;
  /** Código ISO de la moneda del evento (informativo). */
  currencyCode?: string;
  /** Nombre del organizer / evento mostrado en el resumen (informativo). */
  eventTitle?: string;
  /** Se dispara al cerrar el dialog (ESC, botón "Cancelar" o tras onSuccess). */
  onClose: () => void;
  /** Callback tras la confirmación exitosa — la vista padre invalida sus queries aquí. */
  onSuccess?: (view: ConfirmBookingIntentView) => void;
  /**
   * Adapter opcional del cliente de API — permite inyectar un mock en tests unitarios sin
   * levantar MSW. En producción usa `vendorBookingsApi.confirm` por default.
   */
  confirmFn?: (input: { bookingIntentId: string }) => Promise<ConfirmBookingIntentView>;
}

export function ConfirmBookingDialog(props: ConfirmBookingDialogProps): JSX.Element {
  const { bookingIntentId, quoteAmount, currencyCode, eventTitle, onClose, onSuccess, confirmFn } = props;
  const t = useTranslations('vendor.booking.confirm');
  const tError = useTranslations('vendor.booking.confirm.errors');

  const titleId = useId();
  const descId = useId();
  const disclaimerId = useId();
  const summaryId = useId();
  const bannerId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  // Foco inicial en "Cancelar" (destructive-safe). ESC cierra; focus trap Tab/Shift+Tab.
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
        'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    if (isSubmitting) return;
    setServerErrorCode(null);
    setIsSubmitting(true);
    try {
      const fn = confirmFn ?? vendorBookingsApi.confirm;
      const view = await fn({ bookingIntentId });
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
  }, [isSubmitting, bookingIntentId, confirmFn, onSuccess, onClose]);

  const bannerMessage = serverErrorCode
    ? isKnownErrorCode(serverErrorCode)
      ? tError(serverErrorCode)
      : tError('UNEXPECTED')
    : null;

  const describedBy = [descId, summaryId, disclaimerId, bannerMessage ? bannerId : null]
    .filter(Boolean)
    .join(' ');

  const hasSummary = quoteAmount != null || eventTitle != null;

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

        {hasSummary && (
          <dl id={summaryId} className="mt-3 space-y-1 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
            {eventTitle != null && (
              <div className="flex justify-between">
                <dt className="font-medium text-neutral-700">{t('summary.event')}</dt>
                <dd className="text-neutral-900">{eventTitle}</dd>
              </div>
            )}
            {quoteAmount != null && (
              <div className="flex justify-between">
                <dt className="font-medium text-neutral-700">{t('summary.amount')}</dt>
                <dd className="text-neutral-900">
                  {quoteAmount}
                  {currencyCode ? ` ${currencyCode}` : null}
                </dd>
              </div>
            )}
          </dl>
        )}

        <p id={disclaimerId} className="mt-3 rounded-md border border-neutral-200 bg-amber-50 p-3 text-xs text-amber-900">
          {t('disclaimer')}
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
            disabled={isSubmitting}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? t('actions.submitting') : t('actions.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
