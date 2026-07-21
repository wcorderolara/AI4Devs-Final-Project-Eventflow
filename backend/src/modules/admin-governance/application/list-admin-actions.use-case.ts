// US-080 / BE-002 — ListAdminActionsUseCase. Tech Spec §7.
//
// Endpoint de LECTURA paginada del log inmutable `AdminAction` para el visor admin
// `GET /api/v1/admin/admin-actions`. Compone un WHERE dinámico con filtros combinados
// (Decisión PO D2 — admin_id, target_type, target_id, action, rango de fechas) + cursor
// keyset `(created_at DESC, id DESC)` (paridad ADR-ARCH-001 · helper intra-módulo
// `admin-actions-cursor.ts`).
//
// Sin `$transaction`: consulta pura de lectura. `select` proyecta solo los campos requeridos
// por el mapper (sin `include`) — evita over-fetch y N+1 (adminUser en la misma query).
//
// IMPORTANTE (Decisión PO D6 · AC-04): este UseCase NO crea AdminAction al ejecutar. El
// listado del audit log debe permanecer append-only externo y evitar loops infinitos. Solo
// se emite un log estructurado `admin.admin_actions.viewed` con el conteo de filtros
// aplicados (sin PII y sin valores).
//
// Errores:
//   - `Us080InvalidCursorError` — cursor base64 malformado ⇒ `400 INVALID_CURSOR`.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  decodeAdminActionsCursor,
  encodeAdminActionsCursor,
} from './admin-actions-cursor.js';
import {
  toAdminActionListItem,
  type AdminActionListItem,
  type AdminActionListRow,
} from './admin-action-list.mapper.js';
import type { AdminActionsQuery } from '../interface/admin-actions-query.dto.js';
import { Us080InvalidCursorError } from '../domain/us080.errors.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';

export interface ListAdminActionsResult {
  items: AdminActionListItem[];
  pagination: {
    nextCursor: string | null;
    pageSize: number;
  };
}

const LIST_SELECT = {
  id: true,
  adminUserId: true,
  targetEntity: true,
  targetId: true,
  action: true,
  metadata: true,
  createdAt: true,
  adminUser: { select: { id: true, email: true, fullName: true } },
} as const;

function countFilters(filters: AdminActionsQuery): number {
  let n = 0;
  if (filters.admin_id) n++;
  if (filters.target_type) n++;
  if (filters.target_id) n++;
  if (filters.action) n++;
  if (filters.created_at_from) n++;
  if (filters.created_at_to) n++;
  return n;
}

export class ListAdminActionsUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(filters: AdminActionsQuery): Promise<ListAdminActionsResult> {
    const pageSize = filters.pageSize;

    const cursor = filters.cursor ? decodeAdminActionsCursor(filters.cursor) : null;
    if (filters.cursor && !cursor) {
      throw new Us080InvalidCursorError();
    }

    const where: Prisma.AdminActionWhereInput = {};

    if (filters.admin_id) {
      where.adminUserId = filters.admin_id;
    }
    if (filters.target_type) {
      where.targetEntity = filters.target_type;
    }
    if (filters.target_id) {
      where.targetId = filters.target_id;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.created_at_from || filters.created_at_to) {
      where.createdAt = {};
      if (filters.created_at_from) where.createdAt.gte = filters.created_at_from;
      if (filters.created_at_to) where.createdAt.lte = filters.created_at_to;
    }

    if (cursor) {
      // Keyset stable: `created_at < c.createdAt OR (created_at = c.createdAt AND id < c.id)`.
      // Envuelto en `AND` para componer correctamente con los otros predicados.
      const cursorClause: Prisma.AdminActionWhereInput = {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      };
      where.AND = Array.isArray(where.AND) ? [...where.AND, cursorClause] : [cursorClause];
    }

    const rows = (await this.prisma.adminAction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: LIST_SELECT,
    })) as AdminActionListRow[];

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const items = page.map(toAdminActionListItem);

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1]!;
      nextCursor = encodeAdminActionsCursor({
        createdAt: new Date(last.createdAt),
        id: last.id,
      });
    }

    // AC-04 / Decisión PO D6: log estructurado (nivel `info`), NO AdminAction.
    logger.info({
      event: 'admin.admin_actions.viewed',
      filterCount: countFilters(filters),
      pageSize,
      returned: items.length,
      hasMore,
    });

    return {
      items,
      pagination: { nextCursor, pageSize },
    };
  }
}
