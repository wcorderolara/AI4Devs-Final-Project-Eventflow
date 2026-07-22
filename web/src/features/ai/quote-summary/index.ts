// Barrel — feature AI Quote Comparison Summary (US-022 / PB-P2-001).
export { aiQuoteSummaryApi } from './api/aiApi';
export type {
  GenerateQuoteSummaryInput,
  GenerateQuoteSummaryResponse,
  QuoteSummaryItem,
} from './api/aiApi';
export {
  aiQuoteSummaryKeys,
  useGenerateAIQuoteSummary,
} from './hooks/useGenerateAIQuoteSummary';
export { AIComparisonSummary } from './components/AIComparisonSummary';
export type { AIComparisonSummaryProps } from './components/AIComparisonSummary';
