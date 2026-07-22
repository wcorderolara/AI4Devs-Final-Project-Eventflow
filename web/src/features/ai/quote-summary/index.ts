// Barrel — feature AI Quote Comparison Summary (US-022 + US-059 / PB-P2-001).
export { aiQuoteSummaryApi } from './api/aiApi';
export type {
  GenerateQuoteSummaryInput,
  GenerateQuoteSummaryResponse,
  LatestQuoteSummaryInput,
  QuoteSummaryItem,
} from './api/aiApi';
export {
  aiQuoteSummaryKeys,
  useGenerateAIQuoteSummary,
} from './hooks/useGenerateAIQuoteSummary';
export {
  aiLatestQuoteSummaryKeys,
  computeQuoteIdsMismatch,
  useLatestQuoteSummary,
} from './hooks/useLatestQuoteSummary';
export type {
  UseLatestQuoteSummaryParams,
  UseLatestQuoteSummaryResult,
} from './hooks/useLatestQuoteSummary';
export { AIComparisonSummary } from './components/AIComparisonSummary';
export type { AIComparisonSummaryProps } from './components/AIComparisonSummary';
