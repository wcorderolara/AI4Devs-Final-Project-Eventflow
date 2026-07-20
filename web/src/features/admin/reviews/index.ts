// Feature admin reviews — US-067 (PB-P1-040). Punto de entrada público.
export { adminReviewsApi } from './api/adminReviewsApi';
export type {
  ModerateReviewBodyDTO,
  ModeratedReviewDTO,
  ModerateAction,
  ModerateReviewErrorCode,
} from './api/adminReviewsApi.types';
export { useModerateReview, adminReviewsKeys } from './hooks/adminReviewsQueries';
export { AdminActionBadge } from './components/AdminActionBadge';
export { ModerationDialog } from './components/ModerationDialog';
export type { ModerationDialogReview } from './components/ModerationDialog';
export { ReviewModerationTable } from './components/ReviewModerationTable';
