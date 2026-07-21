// US-078 / BE-002 — ListEventsForAdminUseCase. Tech Spec §7.
//
// Endpoint de LECTURA paginada para el panel admin `GET /api/v1/admin/events`. Compone un
// WHERE dinámico con filtros combinados (Decisión PO D3 — status multi, event_type_id, fechas,
// organizer_search) + cursor keyset `(event_date DESC, id DESC)` (Decisión PO D4 · paridad
// exacta con US-066/US-074/US-077 vía helper intra-módulo `admin-events-cursor.ts`).
//
// El UseCase NO aplica filtros de visibilidad por defecto: el admin ve TODO (incluidos eventos
// soft-deleted `deleted_at IS NOT NULL`). No hay AdminAction en list (Decisión PO D2), sólo en
// detail.
//
// Sin `$transaction`: consulta pura de lectura. `select` proyecta solo los campos requeridos
// por el mapper (sin `include`), evita over-fetch y elimina N+1 (user + eventType en la misma
// query).
//
// `organizer_search` filtra por `user.email` + `user.fullName` (ILIKE substring, case-insensitive).
// El schema Prisma NO expone `businessName` en `User` (vive en `VendorProfile`); los organizers
// no tienen perfil vendor, por eso el search se restringe a `email + fullName` (deviation DEV-3
// documentada en el execution record).
//
// Errores:
//   - `Us078InvalidCursorError` — cursor base64 malformado. Mapea a `400 INVALID_CURSOR`.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  decodeAdminEventsCursor,
  encodeAdminEventsCursor,
} from './admin-events-cursor.js';
import {
  toAdminEventListItem,
  type AdminEventListItem,
  type AdminEventListRow,
} from './admin-event-list.mapper.js';
import type { AdminEventsQuery } from '../interface/admin-events-query.dto.js';
import { Us078InvalidCursorError } from '../domain/us078.errors.js';

export interface ListEventsForAdminResult {
  items: AdminEventListItem[];
  pagination: {
    nextCursor: string | null;
    pageSize: number;
  };
}

const LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  eventDate: true,
  guestsCount: true,
  estimatedBudget: true,
  currency: true,
  createdAt: true,
  deletedAt: true,
  user: { select: { id: true, email: true, fullName: true } },
  eventType: { select: { id: true, code: true, label: true } },
} as const;

export class ListEventsForAdminUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(filters: AdminEventsQuery): Promise<ListEventsForAdminResult> {
    const pageSize = filters.pageSize;

    const cursor = filters.cursor ? decodeAdminEventsCursor(filters.cursor) : null;
    if (filters.cursor && !cursor) {
      throw new Us078InvalidCursorError();
    }

    const where: Prisma.EventWhereInput = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    if (filters.event_type_id) {
      where.eventTypeId = filters.event_type_id;
    }
    if (filters.event_date_from || filters.event_date_to) {
      where.eventDate = {};
      if (filters.event_date_from) where.eventDate.gte = filters.event_date_from;
      if (filters.event_date_to) where.eventDate.lte = filters.event_date_to;
    }
    if (filters.organizer_search) {
      const q = filters.organizer_search;
      where.user = {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    if (cursor) {
      // Keyset stable: `event_date < c.eventDate OR (event_date = c.eventDate AND id < c.id)`.
      // Cuando el cursor apunta a un evento sin fecha (`eventDate: null`), sólo comparamos por id.
      // Envuelto en `AND` para componer correctamente con los otros predicados.
      const cursorClause: Prisma.EventWhereInput =
        cursor.eventDate === null
          ? { AND: [{ eventDate: null }, { id: { lt: cursor.id } }] }
          : {
              OR: [
                { eventDate: { lt: cursor.eventDate } },
                { eventDate: cursor.eventDate, id: { lt: cursor.id } },
              ],
            };
      where.AND = Array.isArray(where.AND) ? [...where.AND, cursorClause] : [cursorClause];
    }

    const rows = (await this.prisma.event.findMany({
      where,
      orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: LIST_SELECT,
    })) as AdminEventListRow[];

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const items = page.map(toAdminEventListItem);

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1]!;
      nextCursor = encodeAdminEventsCursor({
        eventDate: last.eventDate ? new Date(last.eventDate) : null,
        id: last.id,
      });
    }

    return {
      items,
      pagination: { nextCursor, pageSize },
    };
  }
}
