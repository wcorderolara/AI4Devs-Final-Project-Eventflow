// US-030 (PB-P1-018 / FE-002) — Mapeo puro `ApiError` → clave i18n + variante de Toast.
// Reglas canónicas (Tech Spec §8 + §12):
//   * 409 INVALID_TRANSITION → `tasks.status.error.invalid_transition` + toast=error.
//   * 409 EVENT_NOT_MUTABLE → `tasks.status.error.event_not_mutable`   + toast=warning.
//   * 404 NOT_FOUND         → `tasks.status.error.not_found_or_forbidden` + toast=error (no-revelación).
//   * 403 FORBIDDEN         → `tasks.status.error.not_found_or_forbidden` (MISMO i18nKey que 404).
//   * 5xx                   → `tasks.status.error.transient` + toast=transient + includeRetry.
//   * default (red, timeout, unknown) → `tasks.status.error.transient` + includeRetry.
import type { ApiError } from '@/shared/api-client';

export type QuickActionToastVariant = 'info' | 'warning' | 'error' | 'transient';

export interface QuickActionErrorMapping {
  i18nKey: string;
  toastVariant: QuickActionToastVariant;
  includeRetry: boolean;
  errorCode: string;
}

interface ErrorLike {
  code?: string;
  status?: number;
}

export function quickActionErrorMap(error: unknown): QuickActionErrorMapping {
  const err = (error as ErrorLike) ?? {};
  const code = typeof err.code === 'string' ? err.code : 'UNKNOWN';
  const status = typeof err.status === 'number' ? err.status : 0;

  if (code === 'INVALID_TRANSITION') {
    return {
      i18nKey: 'tasks.status.error.invalid_transition',
      toastVariant: 'error',
      includeRetry: false,
      errorCode: 'INVALID_TRANSITION',
    };
  }
  if (code === 'EVENT_NOT_MUTABLE') {
    return {
      i18nKey: 'tasks.status.error.event_not_mutable',
      toastVariant: 'warning',
      includeRetry: false,
      errorCode: 'EVENT_NOT_MUTABLE',
    };
  }
  if (status === 404) {
    return {
      i18nKey: 'tasks.status.error.not_found_or_forbidden',
      toastVariant: 'error',
      includeRetry: false,
      errorCode: 'NOT_FOUND',
    };
  }
  if (status === 403) {
    return {
      i18nKey: 'tasks.status.error.not_found_or_forbidden',
      toastVariant: 'error',
      includeRetry: false,
      errorCode: 'FORBIDDEN',
    };
  }
  if (status >= 500 && status < 600) {
    return {
      i18nKey: 'tasks.status.error.transient',
      toastVariant: 'transient',
      includeRetry: true,
      errorCode: `HTTP_${status}`,
    };
  }
  return {
    i18nKey: 'tasks.status.error.transient',
    toastVariant: 'transient',
    includeRetry: true,
    errorCode: code || 'UNKNOWN',
  };
}

/** Type helper para consumir el mapping también desde el módulo de tests. */
export type { ApiError };
