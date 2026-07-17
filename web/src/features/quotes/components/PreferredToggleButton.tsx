'use client';

// PreferredToggleButton (US-058 / FE-001).
// Toggle accesible del flag `is_preferred` sobre una Quote específica.
//   - `role="button"` implícito + `aria-pressed` que refleja el estado actual (AC-01/02/03).
//   - `aria-label` dinámico: cambia según isPreferred + vendorName + status para lectores de
//     pantalla.
//   - Estado deshabilitado cuando la Quote no es preferable (status ≠ 'sent' o vencida) — el
//     botón sigue presente para preservar el layout de la tabla/cards, con `aria-disabled`.
//   - Errores del backend se mapean por código estable (`QUOTE_NOT_PREFERABLE`, `QUOTE_NOT_FOUND`,
//     ...) a mensajes i18n; el error pasa al `onError` para que la vista padre lo pinte.
//   - Idempotencia (AC-04) delegada al backend: hacer click con el valor actual devuelve 200
//     sin side-effects; el hook simplemente invalida el comparador.
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { usePreferQuote } from '../hooks/quotesQueries';
import type { PreferQuoteView } from '../api/quotesApi.types';

export interface PreferredToggleButtonProps {
  quoteId: string;
  vendorName: string;
  /** Estado actual (viene del comparador). El botón `aria-pressed` refleja este valor. */
  isPreferred: boolean;
  /** Si la Quote no es `sent` o venció, el botón queda deshabilitado (aria-disabled). */
  selectable: boolean;
  /**
   * Contexto de invalidación de TanStack Query — el hook invalida el comparador de la
   * (eventId, categoryCode) tras un toggle exitoso.
   */
  eventId?: string;
  categoryCode?: string;
  /** Callback cliente para pintar mensajes (banner/toast) — recibe el mensaje ya traducido. */
  onError?: (message: string) => void;
  onSuccess?: (view: PreferQuoteView) => void;
  /** Testability: inyecta un adapter para mocks unitarios sin depender del client global. */
  preferFn?: (input: { quoteId: string; isPreferred: boolean }) => Promise<PreferQuoteView>;
}

const KNOWN_ERROR_CODES = [
  'QUOTE_NOT_PREFERABLE',
  'QUOTE_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export function PreferredToggleButton(props: PreferredToggleButtonProps): JSX.Element {
  const { quoteId, vendorName, isPreferred, selectable, eventId, categoryCode, onError, onSuccess, preferFn } = props;
  const t = useTranslations('organizer.quote.preferred');
  const mutation = usePreferQuote({ eventId, categoryCode });

  const isPending = mutation.isPending;

  const handleClick = useCallback(async () => {
    if (!selectable || isPending) return;
    const next = !isPreferred;
    try {
      const view = preferFn
        ? await preferFn({ quoteId, isPreferred: next })
        : await mutation.mutateAsync({ quoteId, isPreferred: next });
      onSuccess?.(view);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      const key = isKnownErrorCode(code) ? code : 'UNEXPECTED';
      onError?.(t(`errors.${key}`));
    }
  }, [selectable, isPending, isPreferred, quoteId, mutation, preferFn, onSuccess, onError, t]);

  const label = isPreferred
    ? t('unmarkAria', { vendor: vendorName })
    : t('markAria', { vendor: vendorName });
  const text = isPreferred ? t('unmark') : t('mark');

  return (
    <button
      type="button"
      aria-pressed={isPreferred}
      aria-disabled={!selectable || isPending}
      aria-label={label}
      disabled={!selectable || isPending}
      data-preferred={isPreferred ? 'true' : 'false'}
      data-testid="preferred-toggle-button"
      onClick={handleClick}
      className={
        isPreferred
          ? 'inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      <span aria-hidden="true">{isPreferred ? '★' : '☆'}</span>
      <span>{isPending ? t('loading') : text}</span>
    </button>
  );
}
