// Barrel — quotes feature (US-049 / PB-P1-030).
export { EventSnapshotCard } from './components/EventSnapshotCard';
export { VendorCardSummary } from './components/VendorCardSummary';
export { QuoteRequestForm } from './components/QuoteRequestForm';
export { QRLimitBadge, QR_LIMIT_REASON_ID } from './components/QRLimitBadge';
// US-057 (FE-002): comparador de Quotes por categoría.
export { QuoteComparator } from './components/QuoteComparator';
export { QuoteComparisonTable } from './components/QuoteComparisonTable';
export { QuoteComparisonCards } from './components/QuoteComparisonCards';
export { QuoteStatusIndicator } from './components/QuoteStatusIndicator';
export { quotesApi } from './api/quotesApi';
export {
  useCreateQuoteRequest,
  useActiveQrCount,
  useCompareQuotes,
  quotesKeys,
} from './hooks/quotesQueries';
export type {
  CreateQuoteRequestInput,
  CreateQuoteRequestView,
  CreateQuoteRequestDTO,
  QuoteRequestSource,
  ActiveQrCountInput,
  ActiveQrCountView,
  ActiveQrCountDTO,
  CompareQuotesInput,
  CompareQuotesView,
  CompareQuoteItemView,
  ComparableQuoteStatus,
} from './api/quotesApi.types';
