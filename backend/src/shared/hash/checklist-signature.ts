// US-024 (PB-P2-002) / BE-001 — Signature determinística del estado de un checklist.
//
// Se utiliza como clave estable del `TaskPriorityCacheService`: dos requests con el mismo conjunto
// de tareas elegibles (mismo id, status y updated_at) producen la misma signature ⇒ cache hit
// dentro del TTL. Cualquier mutación observable (nueva tarea, cambio de status, edición que
// actualiza `updated_at`) produce una signature distinta ⇒ cache miss (AC-05).
//
// El orden de entrada no importa: los triples `id|status|updated_at.toISOString()` se ordenan
// antes de hashear para que la salida sea invariante ante reordenamientos del reader.
import { createHash } from 'node:crypto';

export interface ChecklistSignatureTask {
  id: string;
  status: string;
  updatedAt: Date;
}

/**
 * Calcula `sha256:<hex>` a partir de los tríos ordenados `id|status|updated_at.toISOString()`.
 * Retorna una signature canónica para inputs vacíos (`sha256:empty`) para diferenciarla del hash
 * de una lista con un único triple potencialmente vacío.
 */
export function computeChecklistSignature(tasks: readonly ChecklistSignatureTask[]): string {
  if (tasks.length === 0) return 'sha256:empty';
  const triples = tasks
    .map((t) => `${t.id}|${t.status}|${t.updatedAt.toISOString()}`)
    .sort();
  const digest = createHash('sha256').update(triples.join('\n'), 'utf8').digest('hex');
  return `sha256:${digest}`;
}
