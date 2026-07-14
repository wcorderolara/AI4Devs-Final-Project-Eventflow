// US-028 (PB-P1-018 / BE-003) — Port de creación manual de `EventTask`.
// Separado del port de lectura (US-027) para no acoplar la superficie de US-029/030 futuras.
// El repo maneja los valores server-controlled canónicos (`status='pending'`,
// `ai_generated=false`, `ai_recommendation_id=null`, `confirmed_at=null`, `deleted_at=null`).
import type { Prisma } from '@prisma/client';
import type { EventTaskRow } from '../../list/ports/event-task-list.repository.js';

export interface CreateEventTaskInput {
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  categoryCode: string | null;
  languageCode: 'es_LATAM' | 'es_ES' | 'pt' | 'en';
  createdByUserId: string;
}

export interface EventTaskCreateRepository {
  /**
   * Inserta la fila con valores canónicos server-controlled. Recibe `tx` obligatorio: el use case
   * lo abre para incluir el lock advisory + verificación de mutabilidad + insert atómicos.
   * Devuelve la fila en el shape que consume `TaskListItemMapper.toDto`.
   */
  create(input: CreateEventTaskInput, tx: Prisma.TransactionClient): Promise<EventTaskRow>;
}
