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
// US-058 (FE-001): toggle accesible del flag `is_preferred`.
export { PreferredToggleButton } from './components/PreferredToggleButton';
// Panel de cotizaciones del dashboard del evento (tab «Quotes»).
export { EventQuotesPanel, type EventQuotesPanelProps } from './components/EventQuotesPanel';
export { quotesApi } from './api/quotesApi';
export {
  useCreateQuoteRequest,
  useActiveQrCount,
  useCompareQuotes,
  useEventQuoteRequests,
  usePreferQuote,
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
  ListEventQuoteRequestsInput,
  ListEventQuoteRequestsView,
  EventQuoteRequestDTO,
  QuoteRequestStatus,
  CompareQuoteItemView,
  ComparableQuoteStatus,
  PreferQuoteInput,
  PreferQuoteView,
} from './api/quotesApi.types';
