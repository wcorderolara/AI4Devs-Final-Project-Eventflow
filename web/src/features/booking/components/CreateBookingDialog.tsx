'use client';

// CreateBookingDialog (US-060 / PB-P1-036 / FE-001). Modal accesible para que el organizer
// confirme la creación atómica del `BookingIntent` sobre una Quote vigente:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-describedby`.
//   - Focus trap básico (foco inicial en el checkbox del disclaimer — es el primer control
//     que el usuario debe operar), Tab/Shift+Tab acotados a los focusables, ESC cierra.
//   - Checkbox del disclaimer con `aria-describedby` conectado al texto legal i18n. La CTA
//     primaria está `aria-disabled` cuando `disclaimerAccepted === false` (server enforcement
//     duplicado; el backend responde `400 DISCLAIMER_REQUIRED` si se salta el frontend).
//   - Banner de error accesible (`role="alert"`) con mapeo i18n por código estable del backend
//     (`DISCLAIMER_REQUIRED`, `QUOTE_NOT_FOUND`, `QUOTE_NOT_ACCEPTABLE`, `QUOTE_EXPIRED`,
//     `BOOKING_INTENT_ALREADY_EXISTS`, `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`,
//     `RATE_LIMIT_EXCEEDED`). Códigos desconocidos caen a `UNEXPECTED`.
//
// La vista que lo consume (comparador de Quotes / detalle) es responsable del disparador
// (CTA "Crear intención de booking") y de propagar `onSuccess` para refrescar sus queries.
//
// Este componente NO acepta ni renderiza ningún dato de pago (FR-BOOKING-007, D8). El monto
// mostrado (opcional) es sólo informativo — se pasa como prop `quoteAmount` y `currencyCode`.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { organizerBookingsApi } from '../api/organizerBookingsApi';
import type { CreateBookingIntentView } from '../api/organizerBookingsApi.types';

const KNOWN_ERROR_CODES = [
  'DISCLAIMER_REQUIRED',
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'QUOTE_NOT_FOUND',
  'QUOTE_NOT_ACCEPTABLE',
  'QUOTE_EXPIRED',
  'BOOKING_INTENT_ALREADY_EXISTS',
  'RATE_LIMIT_EXCEEDED',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export interface CreateBookingDialogProps {
  quoteId: string;
  /** Monto mostrado en el resumen del dialog (informativo — se lee del comparador/detalle). */
  quoteAmount?: string;
  /** Código ISO de la moneda del evento heredada (informativo). */
  currencyCode?: string;
  /** Nombre del vendor mostrado en el resumen (informativo). */
  vendorName?: string;
  /** Se dispara al cerrar el dialog (ESC, botón "Cancelar" o tras onSuccess). */
  onClose: () => void;
  /** Callback tras la creación exitosa — la vista padre invalida sus queries aquí. */
  onSuccess?: (view: CreateBookingIntentView) => void;
  /**
   * Adapter opcional del cliente de API — permite inyectar un mock en tests unitarios sin
   * levantar MSW. En producción usa `organizerBookingsApi.create` por default.
   */
  createFn?: (input: { quoteId: string; disclaimerAccepted: boolean }) => Promise<CreateBookingIntentView>;
}

export function CreateBookingDialog(props: CreateBookingDialogProps): JSX.Element {
  const { quoteId, quoteAmount, currencyCode, vendorName, onClose, onSuccess, createFn } = props;
  const t = useTranslations('organizer.booking.create');
  const tError = useTranslations('organizer.booking.create.errors');

  const titleId = useId();
  const descId = useId();
  const disclaimerId = useId();
  const disclaimerHintId = useId();
  const summaryId = useId();
  const bannerId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const disclaimerRef = useRef<HTMLInputElement | null>(null);

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  // Foco inicial en el checkbox del disclaimer (es el primer control obligatorio del flujo).
  // ESC cierra; Tab/Shift+Tab acotados a los focusables del dialog (focus trap básico).
  useEffect(() => {
    disclaimerRef.current?.focus();
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
    if (!disclaimerAccepted) return; // defensa: la CTA ya está aria-disabled cuando false.
    setServerErrorCode(null);
    setIsSubmitting(true);
    try {
      const fn = createFn ?? organizerBookingsApi.create;
      const view = await fn({ quoteId, disclaimerAccepted: true });
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
  }, [isSubmitting, disclaimerAccepted, quoteId, createFn, onSuccess, onClose]);

  const bannerMessage = serverErrorCode
    ? isKnownErrorCode(serverErrorCode)
      ? tError(serverErrorCode)
      : tError('UNEXPECTED')
    : null;

  const describedBy = [descId, summaryId, bannerMessage ? bannerId : null].filter(Boolean).join(' ');

  const hasSummary = quoteAmount != null || vendorName != null;

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
            {vendorName != null && (
              <div className="flex justify-between">
                <dt className="font-medium text-neutral-700">{t('summary.vendor')}</dt>
                <dd className="text-neutral-900">{vendorName}</dd>
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

        <div className="mt-4 flex items-start gap-2">
          <input
            ref={disclaimerRef}
            id={disclaimerId}
            type="checkbox"
            checked={disclaimerAccepted}
            onChange={(e) => setDisclaimerAccepted(e.target.checked)}
            aria-describedby={disclaimerHintId}
            className="mt-1 h-4 w-4"
          />
          <div className="flex-1 text-sm">
            <label htmlFor={disclaimerId} className="font-medium text-neutral-900">
              {t('disclaimer.label')}
            </label>
            <p id={disclaimerHintId} className="mt-1 text-xs text-neutral-600">
              {t('disclaimer.hint')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
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
            aria-disabled={!disclaimerAccepted || isSubmitting}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('actions.submitting') : t('actions.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
