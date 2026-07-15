// US-025 (PB-P1-016) — Barrel HITL para consumo desde vistas AI. Reexporta cliente, hooks y
// componente reusable `HITLActions`.
export { hitlApi } from './api/hitlApi';
export type { AIRecommendationResponseDto, ApplyBody } from './api/hitlApi';
export { useApplyAIRecommendation } from './hooks/useApplyAIRecommendation';
export { useDiscardAIRecommendation } from './hooks/useDiscardAIRecommendation';
export { HITLActions } from './components/HITLActions';
export type { HITLEditorProps } from './components/HITLActions';
// US-037 (PB-P1-021) — Budget-apply HITL: hook wrapper + 3 dialogs + container orquestador.
export {
  useApplyBudgetSuggestion,
  classifyBudgetApplyError,
  extractInactiveCategories,
} from './hooks/useApplyBudgetSuggestion';
export type {
  EditedBudgetItem,
  EditedBudgetPayload,
  BudgetApplyErrorKind,
  InactiveCategoryDetail,
} from './hooks/useApplyBudgetSuggestion';
export {
  ApplyAIBudgetDialog,
  ReplaceConfirmationDialog,
  CategoryInactiveErrorDialog,
  BudgetApplyContainer,
} from './components/budget';
export type {
  BudgetItemPreview,
  ApplyAIBudgetDialogProps,
  ReplaceConfirmationDialogProps,
  CategoryInactiveErrorDialogProps,
  BudgetApplyContainerProps,
} from './components/budget';
