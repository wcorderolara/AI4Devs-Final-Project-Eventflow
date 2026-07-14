// US-030 (PB-P1-018) — Barrel público del submódulo quick-action.
export { TaskStatusQuickToggle } from './TaskStatusQuickToggle';
export type { TaskStatusQuickToggleProps } from './TaskStatusQuickToggle';
export {
  computeQuickActions,
  type QuickAction,
  type QuickActionMatrixRow,
  type EventMutabilityStatus,
} from './compute-quick-actions';
export { quickActionErrorMap } from './quick-action-error-map';
export type { QuickActionErrorMapping, QuickActionToastVariant } from './quick-action-error-map';
export { rewriteTaskStatus } from './rewrite-task-status';
export {
  useQuickActionStatusMutation,
  extractErrorMapping,
} from './useQuickActionStatusMutation';
export type {
  QuickActionMutationVariables,
  QuickActionMutationContext,
  QuickActionMutationError,
} from './useQuickActionStatusMutation';
export { makeQuickActionTelemetry } from './telemetry';
export type {
  QuickActionTelemetryContext,
  QuickActionRequestedPayload,
  QuickActionSucceededPayload,
  QuickActionFailedPayload,
  QuickActionRolledBackPayload,
} from './telemetry';
