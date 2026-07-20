// ListEventTypesUseCase (US-076 / BE-007). Tech Spec §7 List. AC-04 + AC-05.
//
// Ejecuta el listado del catálogo en dos variantes:
//   - admin  (`includeInactive=true`)  → todas las filas vivas (`deletedAt IS NULL`),
//                                         activas y desactivadas por soft delete.
//   - public (`includeInactive=false`) → solo activas (`is_active=true`).
//
// Response shape: array plano ordenado por `sort_order ASC, label ASC` (sin
// jerarquía — diferencia clave vs US-075). Retorna `EventTypeView[]` que es un
// superset del contrato previo `{code, label}` de US-009: los callers legacy
// (`EventTypeOption` en `web/src/features/events/api/eventsApi.types.ts`) siguen
// deserializando correctamente proyectando solo esos dos campos.
//
// Rendimiento (NFR-PERF-001 < 500ms p95): 1 query total, filtro sobre índice parcial
// `idx_event_types_active_sort`. El catálogo es "cold" y N ~6-20 filas — no requiere
// pagination servidor.
import { type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { toEventTypeView, type EventTypeView } from './event-type.view.js';

export class ListEventTypesUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(opts: { includeInactive?: boolean } = {}): Promise<EventTypeView[]> {
    const includeInactive = opts.includeInactive ?? false;
    const where = includeInactive
      ? { deletedAt: null }
      : { deletedAt: null, isActive: true };

    const rows = await this.prisma.eventType.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return rows.map(toEventTypeView);
  }
}
