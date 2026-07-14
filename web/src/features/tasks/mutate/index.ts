// US-029 (PB-P1-018) — Barrel público del módulo mutate.
export { TaskItemInlineEdit } from './components/TaskItemInlineEdit';
export { TaskStatusMenu } from './components/TaskStatusMenu';
export { DeleteTaskDialog } from './components/DeleteTaskDialog';
export {
  useUpdateEventTaskContent,
  useUpdateEventTaskStatus,
  useDeleteEventTask,
} from './hooks/useMutateEventTask';
export type {
  UpdateContentVariables,
  UpdateStatusVariables,
  DeleteVariables,
} from './hooks/useMutateEventTask';
export { tasksMutateApi } from './api/tasksMutateApi';
export {
  TASK_STATUS_TRANSITIONS,
  TERMINAL_TASK_STATUSES,
  allowedTransitionsFrom,
} from './domain/taskStatusTransitions';
export type { CanonicalTaskStatus } from './domain/taskStatusTransitions';
