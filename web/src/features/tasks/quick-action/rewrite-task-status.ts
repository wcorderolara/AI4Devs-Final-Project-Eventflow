// US-030 (PB-P1-018 / FE-004) — Helper puro para reescribir el `status` de una tarea en la lista.
// No muta el input. Si `taskId` no existe, devuelve el array intacto (identidad).
import type { TaskListItemDTO, TaskListItemStatus } from '../list/api/tasksListApi.types';

export function rewriteTaskStatus(
  tasks: TaskListItemDTO[],
  taskId: string,
  status: TaskListItemStatus,
): TaskListItemDTO[] {
  let mutated = false;
  const next = tasks.map((t) => {
    if (t.id !== taskId) return t;
    mutated = true;
    return { ...t, status };
  });
  return mutated ? next : tasks;
}
