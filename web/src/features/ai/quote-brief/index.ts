// Barrel de la feature AI Quote Brief (US-021).
export { AIBriefAutocompletePage } from './pages/AIBriefAutocompletePage';
export { AIBriefAutocomplete } from './components/AIBriefAutocomplete';
export { AIBriefField } from './components/AIBriefField';
export { useGenerateAIQuoteBrief, aiQuoteBriefKeys } from './hooks/useGenerateAIQuoteBrief';
export { aiQuoteBriefApi } from './api/aiApi';
export type {
  QuoteBriefOutput,
  QuoteBriefInput,
  GenerateQuoteBriefResponse,
} from './api/aiApi';
