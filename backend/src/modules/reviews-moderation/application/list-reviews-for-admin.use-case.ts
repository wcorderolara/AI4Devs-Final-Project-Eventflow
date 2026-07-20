// ListReviewsForAdminUseCase (US-077 / BE-002). Tech Spec §7.
//
// Endpoint de LECTURA paginada para el panel admin `GET /api/v1/admin/reviews`. Compone un
// WHERE dinámico con los filtros combinados (Decisión PO D2) + cursor keyset
// `(created_at DESC, id DESC)` (Decisión PO D3 — paridad exacta con US-066 helper que se reusa
// verbatim vía `decodeVendorReviewsCursor` / `encodeVendorReviewsCursor`).
//
// El use case NO aplica anonimato (Decisión PO D4 · SEC-03): el admin ve PII completa. El
// mapper `toAdminReviewListItem` no filtra campos; la autorización se aplica en la ruta
// (`sessionAuth + roleMiddleware(['admin'])`) — cualquier consumidor no-admin nunca llega aquí.
//
// Errores propios:
//   - `Us066InvalidCursorError` (reuso — mismo shape del envelope 400 INVALID_CURSOR de US-066).
//     No se agrega un error nuevo por dominio para preservar el catálogo estable.
//
// Sin `$transaction`: consulta pura de lectura. Se usa un `include` chain que reúne
// author + vendor_profile + bookingIntent.event + adminAction en una única query — sin N+1.
import { Prisma, ReviewStatus, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { Us066InvalidCursorError } from '../domain/us066.errors.js';
import {
  decodeVendorReviewsCursor,
  encodeVendorReviewsCursor,
} from './vendor-reviews-cursor.js';
import {
  toAdminReviewListItem,
  type AdminReviewListItem,
  type AdminReviewMapperInput,
} from './admin-review.mapper.js';
import type { AdminReviewsQuery } from '../interface/admin-reviews-query.dto.js';

export interface ListReviewsForAdminResult {
  items: AdminReviewListItem[];
  pagination: {
    nextCursor: string | null;
    pageSize: number;
  };
}

export class ListReviewsForAdminUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(filters: AdminReviewsQuery): Promise<ListReviewsForAdminResult> {
    const pageSize = filters.pageSize;

    // Cursor keyset (paridad US-066): `(created_at, id)` estable en orden DESC/DESC.
    const cursor = filters.cursor ? decodeVendorReviewsCursor(filters.cursor) : null;
    if (filters.cursor && !cursor) {
      throw new Us066InvalidCursorError();
    }

    // WHERE compuesto — sólo se agrega la clave si el filtro fue provisto (undefined ⇒ sin
    // condición para ese campo). Prisma normaliza el AND cuando se combinan `where.*` con
    // `where.OR` (cursor).
    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
    };

    if (filters.status && filters.status.length > 0) {
      // El DTO ya restringe a los literales del enum Prisma — mapeo 1:1 directo.
      where.status = { in: filters.status.map((s) => ReviewStatus[s]) };
    }
    if (filters.vendor_id) {
      where.vendorProfileId = filters.vendor_id;
    }
    if (filters.created_at_from || filters.created_at_to) {
      where.createdAt = {};
      if (filters.created_at_from) where.createdAt.gte = filters.created_at_from;
      if (filters.created_at_to) where.createdAt.lte = filters.created_at_to;
    }
    if (filters.rating_min !== undefined || filters.rating_max !== undefined) {
      where.rating = {};
      if (filters.rating_min !== undefined) where.rating.gte = filters.rating_min;
      if (filters.rating_max !== undefined) where.rating.lte = filters.rating_max;
    }
    if (filters.has_admin_action === true) {
      where.adminActionId = { not: null };
    } else if (filters.has_admin_action === false) {
      where.adminActionId = null;
    }

    if (cursor) {
      // Keyset stable: `created_at < c.createdAt OR (created_at = c.createdAt AND id < c.id)`.
      // Se convierte a `AND` de arriba con Prisma reusando `OR` — Prisma compone `AND(where.*, OR(...))`.
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ];
    }

    const rows = (await this.prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, fullName: true, email: true } },
        vendorProfile: { select: { id: true, businessName: true, slug: true } },
        bookingIntent: {
          select: { event: { select: { id: true, title: true } } },
        },
        adminAction: {
          select: { action: true, adminUserId: true, createdAt: true, metadata: true },
        },
      },
    })) as AdminReviewMapperInput[];

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const items = page.map(toAdminReviewListItem);

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1]!;
      nextCursor = encodeVendorReviewsCursor({
        createdAt: last.createdAt,
        id: last.id,
      });
    }

    return {
      items,
      pagination: { nextCursor, pageSize },
    };
  }
}
