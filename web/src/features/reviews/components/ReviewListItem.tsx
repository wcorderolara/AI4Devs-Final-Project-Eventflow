// ReviewListItem — card individual de una reseña (US-066 / PB-P1-039 / FE-002).
//
// Presentacional. Muestra rating (estrellas + numérico), título del evento, fecha relativa y
// (si existe) el comentario del organizer. Cumple el contrato de anonimato (D2 / AC-03): NO
// muestra nombre del organizer, ni ID de usuario, ni ID del evento — el backend garantiza que
// esos campos ni siquiera llegan al DTO.
//
// El bloque `<article aria-labelledby>` da a los screen readers un ancla nombrada (event title
// + rating) sin que la card tenga que ser un `role="button"` (es lectura pura). Estrellas
// puramente decorativas (`aria-hidden`); el texto accesible del rating vive en el label.
'use client';

import { useTranslations, useFormatter } from 'next-intl';
import type { AnonymizedReviewDTO } from '../api/vendorReviewsApi.types';

export interface ReviewListItemProps {
  review: AnonymizedReviewDTO;
  /** Si `true`, muestra el badge del `status` (visible sólo para admin — el backend lo emite condicional). */
  showStatus?: boolean;
}

const MAX_STARS = 5;

function StarsInline({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(MAX_STARS, Math.round(rating)));
  return (
    <span aria-hidden="true" className="text-amber-500">
      {'★'.repeat(filled)}
      <span className="text-neutral-300">{'☆'.repeat(MAX_STARS - filled)}</span>
    </span>
  );
}

export function ReviewListItem({ review, showStatus = false }: ReviewListItemProps) {
  const t = useTranslations('vendor.profile.reviews.item');
  const format = useFormatter();

  const titleId = `review-title-${review.id}`;
  const ratingLabel = t('ariaRating', { rating: review.rating, max: MAX_STARS });
  const parsedDate = new Date(review.createdAt);
  const dateText = Number.isNaN(parsedDate.getTime())
    ? review.createdAt
    : format.dateTime(parsedDate, { year: 'numeric', month: 'short', day: '2-digit' });

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          role="img"
          aria-label={ratingLabel}
          className="inline-flex items-center gap-2 text-base"
        >
          <StarsInline rating={review.rating} />
          <span className="text-sm font-semibold text-neutral-900" aria-hidden="true">
            {review.rating.toFixed(1)}
          </span>
        </span>
        <h3 id={titleId} className="text-sm font-medium text-neutral-800">
          {review.eventTitle}
        </h3>
        <time
          dateTime={review.createdAt}
          className="text-xs text-neutral-500"
        >
          · {dateText}
        </time>
        {showStatus && review.status !== undefined && (
          <span className="ml-auto inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {t(`status.${review.status}`)}
          </span>
        )}
      </header>
      {review.comment !== null && review.comment.trim().length > 0 && (
        <p className="whitespace-pre-line text-sm text-neutral-700">{review.comment}</p>
      )}
    </article>
  );
}
