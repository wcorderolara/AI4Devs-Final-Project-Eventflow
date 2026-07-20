// VendorReviewsSection — sección paginada de reseñas de un vendor (US-066 / PB-P1-039 / FE-002).
//
// Client component que compone `AverageRating` + lista paginada de `ReviewListItem` +
// "Cargar más". Usa `useInfiniteQuery` (`useVendorReviews`) con cursor keyset del backend.
//
// Estados accesibles:
//   - `isPending` inicial ⇒ skeleton de 3 cards.
//   - Datos vacíos ⇒ empty state con texto i18n (mismo copy que US-046 pero desde el namespace
//     del listado paginado — sin duplicación funcional).
//   - Error ⇒ banner `role="alert"` con retry.
//   - "Cargar más" tiene `aria-busy` cuando la fetch de la siguiente página está en vuelo.
'use client';

import { useTranslations } from 'next-intl';
import { useVendorReviews } from '../hooks/vendorReviewsQueries';
import { AverageRating } from './AverageRating';
import { ReviewListItem } from './ReviewListItem';
import type { VendorSummaryDTO } from '../api/vendorReviewsApi.types';

export interface VendorReviewsSectionProps {
  vendorId: string;
  /**
   * Summary preliminar del vendor (opcional). Cuando se provee, se renderiza inmediatamente sin
   * esperar al primer fetch — patrón típico cuando el server component ya obtuvo `ratingAvg`
   * y `reviewsCount` desde el endpoint público SEO (US-046).
   */
  initialVendor?: Pick<VendorSummaryDTO, 'ratingAvg' | 'reviewsCount'>;
  /** Tamaño de página; el backend acepta 1..50 (default 20). */
  pageSize?: number;
  /**
   * Cuando `true`, se renderiza el badge de `status` por review (visible sólo para admin —
   * el backend sólo emite `status` en la respuesta cuando el requester es admin, D3).
   */
  showStatusBadges?: boolean;
}

const SKELETON_COUNT = 3;

function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      className="h-24 animate-pulse rounded-md border border-neutral-200 bg-neutral-50"
    />
  );
}

export function VendorReviewsSection({
  vendorId,
  initialVendor,
  pageSize,
  showStatusBadges = false,
}: VendorReviewsSectionProps) {
  const t = useTranslations('vendor.profile.reviews');
  const query = useVendorReviews(vendorId, { pageSize });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const firstPage = pages[0];
  const summary = firstPage?.vendor ?? initialVendor;

  const headingId = 'vendor-reviews-heading';

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-xl font-semibold text-neutral-900">
          {t('title')}
        </h2>
        <AverageRating
          ratingAvg={summary?.ratingAvg ?? null}
          reviewsCount={summary?.reviewsCount ?? 0}
        />
      </div>

      {query.isPending && (
        <ul aria-label={t('loadingAria')} className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index}>
              <SkeletonRow />
            </li>
          ))}
        </ul>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-800">{t('errors.load')}</p>
          <button
            type="button"
            className="self-start rounded border border-rose-300 bg-white px-3 py-1 text-sm font-medium text-rose-800 hover:bg-rose-100"
            onClick={() => void query.refetch()}
          >
            {t('actions.retry')}
          </button>
        </div>
      )}

      {!query.isPending && !query.isError && items.length === 0 && (
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      )}

      {items.length > 0 && (
        <ul aria-label={t('listAria')} className="flex flex-col gap-3">
          {items.map((review) => (
            <li key={review.id}>
              <ReviewListItem review={review} showStatus={showStatusBadges} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <button
          type="button"
          className="self-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          aria-busy={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? t('actions.loadingMore') : t('actions.loadMore')}
        </button>
      )}
    </section>
  );
}
