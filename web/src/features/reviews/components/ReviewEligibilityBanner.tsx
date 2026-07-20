'use client';

// ReviewEligibilityBanner (US-065 / PB-P1-038 / FE-002).
//
// Renderiza el banner informativo cuando la respuesta del backend es
// `403 REVIEW_NOT_ELIGIBLE`. Toma el `reason` desde `error.details[0].message` y muestra el
// copy localizado correspondiente (4 razones: `no_booking`, `event_not_completed`,
// `window_expired`, `already_reviewed`).
//
// Accesibilidad: `role="alert"` + `aria-live="polite"` — anuncia el motivo a lectores de
// pantalla cuando cambia. No usa colores como único canal de significado (icono + texto).
import { useTranslations } from 'next-intl';
import type { ReviewNotEligibleReason } from '../api/organizerReviewsApi.types';

export interface ReviewEligibilityBannerProps {
  reason: ReviewNotEligibleReason;
}

export function ReviewEligibilityBanner({ reason }: ReviewEligibilityBannerProps) {
  const t = useTranslations('organizer.review.eligibility');
  return (
    <div role="alert" aria-live="polite" data-testid="review-eligibility-banner" data-reason={reason}>
      <strong>{t('title')}</strong>
      <p>{t(reason)}</p>
    </div>
  );
}
