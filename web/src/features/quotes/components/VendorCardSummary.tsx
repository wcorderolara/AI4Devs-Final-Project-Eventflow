// VendorCardSummary — mini-card del vendor target (US-049 / FE-002).
// Muestra el nombre del vendor y su categoría/rating para dar contexto en la página de "Nueva
// solicitud". No es link; el vendor target se recibe como prop del server component padre.
import { useTranslations } from 'next-intl';

export interface VendorCardSummaryProps {
  businessName: string;
  categoryLabel?: string | null;
  ratingAvg?: number | null;
  reviewsCount?: number | null;
}

export function VendorCardSummary(props: VendorCardSummaryProps): JSX.Element {
  const t = useTranslations('quotes.create.vendorSummary');
  const rating = props.ratingAvg != null ? props.ratingAvg.toFixed(1) : null;

  return (
    <aside
      aria-labelledby="vendor-summary-title"
      className="rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 id="vendor-summary-title" className="text-sm font-semibold text-neutral-700">
        {t('heading')}
      </h2>
      <p className="mt-2 text-base font-medium text-neutral-900">{props.businessName}</p>
      {props.categoryLabel != null && (
        <p className="mt-1 text-sm text-neutral-600">{props.categoryLabel}</p>
      )}
      {rating != null && (
        <p className="mt-2 text-sm text-neutral-700" aria-label={t('ratingAria', { rating })}>
          <span aria-hidden="true">{'★'}</span> {rating}
          {props.reviewsCount != null && (
            <span className="ml-1 text-neutral-500">{`(${props.reviewsCount})`}</span>
          )}
        </p>
      )}
    </aside>
  );
}
