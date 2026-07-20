'use client';

// ReviewForm (US-065 / PB-P1-038 / FE-002). Formulario del organizer para publicar una reseña
// verificada — Tech Spec §8.
//
// Composición:
//   - `<StarRating>` accesible (radiogroup + teclado + roving tabIndex).
//   - `<textarea>` opcional con label, `aria-describedby` a un contador de caracteres y a un
//     hint, `maxLength=2000` client-side.
//   - CTA "Publicar reseña" — `disabled` cuando `rating == null` o `isPending`.
//   - Banner de error accesible (`role="alert"`). `403 REVIEW_NOT_ELIGIBLE` delega al
//     `<ReviewEligibilityBanner>` con la `reason` recibida.
//
// Validación (paridad con backend Zod `.strict()`): rating int 1..5 + comment ≤ 2000 chars.
// El envío al backend siempre incluye `event_id + vendor_profile_id` (fijados por props).
import { useCallback, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { StarRating } from './StarRating';
import { ReviewEligibilityBanner } from './ReviewEligibilityBanner';
import { useCreateReview } from '../hooks/organizerReviewsQueries';
import type {
  CreateReviewErrorCode,
  CreateReviewView,
  ReviewNotEligibleReason,
} from '../api/organizerReviewsApi.types';

const COMMENT_MAX = 2000;
const KNOWN_ERROR_CODES: CreateReviewErrorCode[] = [
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'REVIEW_NOT_ELIGIBLE',
  'RATE_LIMIT_EXCEEDED',
];
const ELIGIBILITY_REASONS: readonly ReviewNotEligibleReason[] = [
  'no_booking',
  'event_not_completed',
  'window_expired',
  'already_reviewed',
] as const;

export interface ReviewFormProps {
  eventId: string;
  vendorProfileId: string;
  /** Slug del vendor — cuando se provee, tras éxito se invalida la ficha pública. */
  vendorSlug?: string;
  /** Callback tras `201 Created`. La UI padre suele hacer redirect + toast. */
  onSuccess?: (view: CreateReviewView) => void;
}

interface FormErrorState {
  code: CreateReviewErrorCode;
  eligibilityReason?: ReviewNotEligibleReason;
}

function toErrorState(err: ApiError): FormErrorState {
  const code = KNOWN_ERROR_CODES.includes(err.code as CreateReviewErrorCode)
    ? (err.code as CreateReviewErrorCode)
    : 'UNEXPECTED';
  if (code !== 'REVIEW_NOT_ELIGIBLE') return { code };
  const raw = extractReason(err);
  const reason = raw && ELIGIBILITY_REASONS.includes(raw as ReviewNotEligibleReason)
    ? (raw as ReviewNotEligibleReason)
    : undefined;
  return reason ? { code, eligibilityReason: reason } : { code };
}

function extractReason(err: ApiError): string | undefined {
  const details = (err.details ?? []) as Array<{ field?: string; message?: string }>;
  const detail = details.find((d) => d?.field === 'reason');
  return typeof detail?.message === 'string' ? detail.message : undefined;
}

export function ReviewForm({ eventId, vendorProfileId, vendorSlug, onSuccess }: ReviewFormProps) {
  const t = useTranslations('organizer.review.create');
  const labelId = useId();
  const commentId = useId();
  const commentHintId = useId();
  const commentCounterId = useId();
  const errorRegionId = useId();

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [formError, setFormError] = useState<FormErrorState | null>(null);

  const mutation = useCreateReview({ vendorSlug });

  const commentLength = comment.length;
  const isCommentTooLong = commentLength > COMMENT_MAX;
  const canSubmit = rating != null && !isCommentTooLong && !mutation.isPending;

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSubmit || rating == null) return;
      setFormError(null);
      const trimmed = comment.trim();
      mutation.mutate(
        {
          eventId,
          vendorProfileId,
          rating,
          ...(trimmed.length > 0 ? { comment: trimmed } : {}),
        },
        {
          onSuccess: (view) => {
            onSuccess?.(view);
          },
          onError: (err) => {
            if (err instanceof ApiError) {
              setFormError(toErrorState(err));
            } else {
              setFormError({ code: 'UNEXPECTED' });
            }
          },
        },
      );
    },
    [canSubmit, comment, eventId, mutation, onSuccess, rating, vendorProfileId],
  );

  const errorContent = useMemo(() => {
    if (!formError) return null;
    if (formError.code === 'REVIEW_NOT_ELIGIBLE' && formError.eligibilityReason) {
      return <ReviewEligibilityBanner reason={formError.eligibilityReason} />;
    }
    return (
      <div role="alert" data-testid="review-form-error" data-code={formError.code}>
        {t(`errors.${formError.code}`)}
      </div>
    );
  }, [formError, t]);

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={errorRegionId}>
      <div>
        <span id={labelId}>{t('ratingLabel')}</span>
        <StarRating
          labelId={labelId}
          value={rating}
          onChange={setRating}
          disabled={mutation.isPending}
        />
      </div>

      <div>
        <label htmlFor={commentId}>{t('commentLabel')}</label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={COMMENT_MAX}
          aria-describedby={`${commentHintId} ${commentCounterId}`}
          aria-invalid={isCommentTooLong || undefined}
          rows={5}
          disabled={mutation.isPending}
          data-testid="review-comment"
        />
        <span id={commentHintId}>{t('commentHint')}</span>
        <span id={commentCounterId} aria-live="polite">
          {t('commentCounter', { count: commentLength, max: COMMENT_MAX })}
        </span>
      </div>

      <div id={errorRegionId}>{errorContent}</div>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        data-testid="review-submit"
      >
        {mutation.isPending ? t('actions.submitting') : t('actions.submit')}
      </button>
    </form>
  );
}
