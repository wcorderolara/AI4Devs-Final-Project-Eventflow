// Mapper — filas del repositorio → shape de contrato del endpoint compare (US-057 / BE-003).
// Whitelisting: campos públicos del vendor y de la Quote. Nunca copia campos crudos.
import type { ComparableQuoteRow } from '../ports/quote-flow.repositories.js';
import type { ComparableQuoteItem } from '../dto/compare-quotes.us057.response.js';

export function toComparableQuoteItem(row: ComparableQuoteRow): ComparableQuoteItem {
  return {
    quote_id: row.quoteId,
    vendor: {
      profile_id: row.vendor.profileId,
      business_name: row.vendor.businessName,
      slug: row.vendor.slug,
      rating_avg: row.vendor.ratingAvg,
      reviews_count: row.vendor.reviewsCount,
    },
    status: row.status,
    total_price: row.totalPrice,
    breakdown: row.breakdown,
    valid_until: row.validUntil,
    conditions: row.conditions,
    is_preferred: row.isPreferred,
    created_at: row.createdAt,
  };
}
