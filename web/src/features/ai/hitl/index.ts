// US-025 (PB-P1-016) — Barrel HITL para consumo desde vistas AI. Reexporta cliente, hooks y
// componente reusable `HITLActions`.
export { hitlApi } from './api/hitlApi';
export type { AIRecommendationResponseDto, ApplyBody } from './api/hitlApi';
export { useApplyAIRecommendation } from './hooks/useApplyAIRecommendation';
export { useDiscardAIRecommendation } from './hooks/useDiscardAIRecommendation';
export { HITLActions } from './components/HITLActions';
export type { HITLEditorProps } from './components/HITLActions';
