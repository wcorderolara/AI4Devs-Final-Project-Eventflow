// ReviewList — Server Component (US-046 / FE-003).
// Renderiza hasta 10 reviews published + indicador "10 de N" cuando `reviewsTotalPublished > 10`.
// El repository ya ordena por `createdAt DESC`. `reviewerDisplayName` viene pseudonimizado por
// el backend (BE-003). El texto se emite dentro de un elemento estándar — Next.js aplica
// auto-escape (SEC-06).
import { useTranslations } from 'next-intl';
import type { PublicVendorReviewDTO } from '../api/vendorPublicApi.types';

interface Props {
  reviews: PublicVendorReviewDTO[];
  reviewsTotalPublished: number;
}

function formatDate(iso: string, locale = 'es-419'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function ReviewList({ reviews, reviewsTotalPublished }: Props) {
  const t = useTranslations('publicVendor.reviews');

  if (reviews.length === 0) {
    return (
      <section aria-labelledby="reviews-heading" className="flex flex-col gap-2">
        <h2 id="reviews-heading" className="text-xl font-semibold text-neutral-900">
          {t('title')}
        </h2>
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      </section>
    );
  }

  const showTotal = reviewsTotalPublished > reviews.length;

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-4">
      <h2 id="reviews-heading" className="text-xl font-semibold text-neutral-900">
        {t('title')}
      </h2>
      {showTotal && (
        <p className="text-xs text-neutral-500">
          {t('summaryShown', { shown: reviews.length, total: reviewsTotalPublished })}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {reviews.map((review, idx) => (
          <li
            key={`${review.createdAt}-${idx}`}
            className="flex flex-col gap-1 rounded-md border border-neutral-200 p-3"
          >
            <div className="flex items-center gap-2 text-sm text-neutral-800">
              <span aria-hidden="true" className="font-semibold">
                {`★ ${review.rating}`}
              </span>
              <span className="font-medium">{review.reviewerDisplayName}</span>
              <span className="text-xs text-neutral-500">· {formatDate(review.createdAt)}</span>
            </div>
            {review.comment !== null && review.comment.length > 0 && (
              <p className="text-sm text-neutral-700">{review.comment}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
