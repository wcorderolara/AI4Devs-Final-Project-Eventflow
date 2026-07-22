'use client';

// AIRegenerateDialog (US-026 / FE-001) — modal shared cross-cutting para regeneración IA.
// AC-01 flujo feliz + AC-03 feedback vacío permitido + AC-07 rate limit UX + AC-08 fallback +
// A11Y (`role="dialog"` + `aria-modal` + focus trap + counter `aria-live` + banner `role="alert"`).
//
// El dialog es agnóstico del `AIRecommendation.type` — sirve para cualquier feature (event_plan,
// checklist, budget, categories, brief, summary, task_priority). El caller pasa el
// `recommendationId` (padre) y recibe el `child` vía `onSuccess`.
//
// Patrón "destructive-safe": foco inicial en "Cancelar" (mismo diseño que `RejectQuoteDialog` de
// US-054) — el default no dispara la mutación.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import {
  aiRegenerateApi,
  type RegenerateAIRecommendationInput,
  type RegenerateAIRecommendationResponse,
} from '../api/aiApi';

const FEEDBACK_MAX = 500;

const KNOWN_ERROR_CODES = [
  'REGENERATION_LIMIT',
  'RATE_LIMIT_EXCEEDED',
  'AI_RATE_LIMITED',
  'AI_PROVIDER_ERROR',
  'AI_PROVIDER_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'RESOURCE_NOT_FOUND',
  'AI_RECOMMENDATION_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export interface AIRegenerateDialogProps {
  recommendationId: string;
  /** Se dispara al cerrar el dialog (por ESC, botón "Cancelar" o tras onSuccess). */
  onClose: () => void;
  /** Callback tras una regeneración exitosa — la vista padre invalida sus queries aquí. */
  onSuccess?: (child: RegenerateAIRecommendationResponse) => void;
  /**
   * Adapter opcional del cliente API — permite inyectar un mock en tests unitarios sin levantar
   * MSW. En producción usa `aiRegenerateApi.regenerate` por default.
   */
  regenerateFn?: (
    input: RegenerateAIRecommendationInput,
  ) => Promise<RegenerateAIRecommendationResponse>;
}

export function AIRegenerateDialog(props: AIRegenerateDialogProps): React.JSX.Element {
  const { recommendationId, onClose, onSuccess, regenerateFn } = props;
  const t = useTranslations('ai.regenerate');
  const tError = useTranslations('ai.regenerate.errors');

  const titleId = useId();
  const descId = useId();
  const feedbackId = useId();
  const feedbackHintId = useId();
  const feedbackCounterId = useId();
  const bannerId = useId();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  const feedbackTooLong = feedback.length > FEEDBACK_MAX;

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
    if (isSubmitting || feedbackTooLong) return;
    setServerErrorCode(null);
    setIsSubmitting(true);
    try {
      const fn = regenerateFn ?? aiRegenerateApi.regenerate;
      const child = await fn({ recommendationId, feedback: feedback.trim() || undefined });
      onSuccess?.(child);
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
  }, [
    isSubmitting,
    feedbackTooLong,
    regenerateFn,
    recommendationId,
    feedback,
    onSuccess,
    onClose,
  ]);

  const bannerMessage = serverErrorCode
    ? isKnownErrorCode(serverErrorCode)
      ? tError(serverErrorCode)
      : tError('UNEXPECTED')
    : null;

  const describedBy = [descId, bannerMessage ? bannerId : null].filter(Boolean).join(' ');
  const feedbackDescribedBy = [feedbackHintId, feedbackCounterId].join(' ');

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
          <label
            htmlFor={feedbackId}
            className="block text-sm font-medium text-neutral-900"
          >
            {t('feedback_label')}
          </label>
          <textarea
            id={feedbackId}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('feedback_placeholder')}
            rows={4}
            maxLength={FEEDBACK_MAX}
            aria-invalid={feedbackTooLong}
            aria-describedby={feedbackDescribedBy}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <p id={feedbackHintId} className="mt-1 text-xs text-neutral-500">
            {t('feedback_hint')}
          </p>
          <p
            id={feedbackCounterId}
            aria-live="polite"
            className="mt-1 text-xs text-neutral-500"
          >
            {t('feedback_counter', { count: feedback.length, max: FEEDBACK_MAX })}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || feedbackTooLong}
            className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting ? t('regenerating') : t('regenerate')}
          </button>
        </div>
      </div>
    </div>
  );
}
