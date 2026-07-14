// Barrel de la feature AI Budget Suggestion (US-019).
export { AIBudgetSuggestionPage } from './pages/AIBudgetSuggestionPage';
export { AIBudgetSuggestion } from './components/AIBudgetSuggestion';
export { AIBudgetViewer } from './components/AIBudgetViewer';
export { useGenerateAIBudget, aiBudgetSuggestionKeys } from './hooks/useGenerateAIBudget';
export { aiBudgetSuggestionApi } from './api/aiApi';
export type {
  BudgetSuggestionCategory,
  BudgetSuggestionInput,
  BudgetSuggestionOutput,
  GenerateBudgetSuggestionResponse,
} from './api/aiApi';
