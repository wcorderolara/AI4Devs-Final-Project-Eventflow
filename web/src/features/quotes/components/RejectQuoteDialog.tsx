'use client';

// RejectQuoteDialog (US-054 / FE-001). Modal accesible para que el organizer confirme el
// rechazo de una Quote:
//   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` / `aria-describedby`.
//   - Focus trap básico (foco inicial en el botón "Cancelar" — patrón "destructive-safe":
//     el default no destruye), Tab/Shift+Tab acotados a los focusables del dialog, ESC cierra.
//   - Textarea opcional para `reason` con contador live (`aria-live="polite"`), label asociado
//     por `htmlFor` y `aria-describedby` conectado a hint + counter + error.
//   - Banner de error accesible (`role="alert"`) con mapeo i18n por código estable del backend
//     (`INVALID_REJECTION_REASON`, `QUOTE_NOT_FOUND`, `QUOTE_NOT_REJECTABLE`, ...).
//
// La vista que lo consume (organizer quote-detail — US futura) es responsable del disparador
// (CTA "Rechazar") y de propagar el `onSuccess` para refrescar sus queries.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { quotesApi } from '../api/quotesApi';
import type { RejectQuoteView } from '../api/quotesApi.types';

const REASON_MAX = 500;

const KNOWN_ERROR_CODES = [
  'INVALID_REJECTION_REASON',
  'QUOTE_NOT_FOUND',
  'QUOTE_NOT_REJECTABLE',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export interface RejectQuoteDialogProps {
  quoteId: string;
  /** Se dispara al cerrar el dialog (por ESC, botón "Cancelar" o tras onSuccess). */
  onClose: () => void;
  /** Callback tras un rechazo exitoso — la vista padre invalida sus queries aquí. */
  onSuccess?: (view: RejectQuoteView) => void;
  /**
   * Adapter opcional del cliente de API — permite inyectar un mock en tests unitarios sin
   * levantar MSW. En producción usa `quotesApi.rejectQuote` por default.
   */
  rejectFn?: (input: { quoteId: string; reason?: string }) => Promise<RejectQuoteView>;
}

export function RejectQuoteDialog(props: RejectQuoteDialogProps): JSX.Element {
  const { quoteId, onClose, onSuccess, rejectFn } = props;
  const t = useTranslations('quotes.reject');
  const tError = useTranslations('quotes.reject.errors');

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

  // Foco inicial en "Cancelar" (default no destructivo — patrón destructive-safe).
  // ESC cierra el modal; Tab/Shift+Tab acotados a los focusables del dialog (focus trap).
  // Ambos listeners viven en `document` — evita el warning de a11y por atar handlers al
  // contenedor del dialog (el rol semántico ya lo cubre `role="dialog"`).
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
        'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      const fn = rejectFn ?? quotesApi.rejectQuote;
      const view = await fn({ quoteId, reason });
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
  }, [isSubmitting, reasonTooLong, quoteId, reason, rejectFn, onSuccess, onClose]);

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
