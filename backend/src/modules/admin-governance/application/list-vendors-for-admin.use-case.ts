// ListVendorsForAdminUseCase (US-074 / BE-002). Tech Spec §7.
//
// Endpoint de LECTURA paginada para el panel admin `GET /api/v1/admin/vendors`. Compone un
// WHERE dinámico con los filtros combinados (Decisiones PO D2/D7) + cursor keyset
// `(created_at DESC, id DESC)` (Decisión PO D3 — paridad exacta con US-066/US-077 vía helper
// intra-módulo `admin-vendors-cursor.ts`).
//
// El UseCase NO aplica ningún filtro de visibilidad por defecto: el admin ve TODO (incluidos
// `pending`, `rejected`, `is_hidden=true` y — cuando el filtro `status` no se envía — también
// vendors soft-deleted vía `deleted_at IS NOT NULL`). El default operacional `status=pending`
// lo aplica el frontend (Decisión PO D5), no este UseCase; el backend permanece agnóstico y
// devuelve el conjunto según los filtros efectivos.
//
// Sin `$transaction`: consulta pura de lectura. Se usa `select` chain que reúne
// user + adminAction en una única query — sin N+1.
//
// Errores:
//   - `Us074InvalidCursorError` — cursor base64 malformado o payload inconsistente. Mapea a
//     `400 INVALID_CURSOR`. Reuso del código estable del catálogo (no se crea código nuevo).
import { Prisma, VendorProfileStatus, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { Us074InvalidCursorError } from '../domain/us074.errors.js';
import {
  decodeAdminVendorsCursor,
  encodeAdminVendorsCursor,
} from './admin-vendors-cursor.js';
import {
  toAdminVendorListItem,
  type AdminVendorListItem,
  type AdminVendorMapperInput,
} from './admin-vendor.mapper.js';
import type { AdminVendorsQuery } from '../interface/admin-vendors-query.dto.js';

export interface ListVendorsForAdminResult {
  items: AdminVendorListItem[];
  pagination: {
    nextCursor: string | null;
    pageSize: number;
  };
}

export class ListVendorsForAdminUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(filters: AdminVendorsQuery): Promise<ListVendorsForAdminResult> {
    const pageSize = filters.pageSize;

    const cursor = filters.cursor ? decodeAdminVendorsCursor(filters.cursor) : null;
    if (filters.cursor && !cursor) {
      throw new Us074InvalidCursorError();
    }

    // WHERE compuesto — sólo se agregan claves cuando el filtro fue provisto (undefined ⇒ sin
    // condición). El admin no ve soft-deleted por defecto (SEC-03 alinea con el resto del
    // dominio vendor: `deleted_at IS NOT NULL` = perfil eliminado por su dueño; no relevante
    // para moderación).
    const where: Prisma.VendorProfileWhereInput = {
      deletedAt: null,
    };

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status.map((s) => VendorProfileStatus[s]) };
    }
    if (filters.is_hidden !== undefined) {
      where.isHidden = filters.is_hidden;
    }
    if (filters.created_at_from || filters.created_at_to) {
      where.createdAt = {};
      if (filters.created_at_from) where.createdAt.gte = filters.created_at_from;
      if (filters.created_at_to) where.createdAt.lte = filters.created_at_to;
    }
    if (filters.business_name) {
      // ILIKE substring (Decisión PO D7) — Prisma `contains` + `mode: 'insensitive'` compila a
      // `column ILIKE '%pattern%'` en Postgres. Riesgo de degradación con volumen alto queda
      // documentado como deuda técnica (trigram post-MVP — Tech Spec §17).
      where.businessName = { contains: filters.business_name, mode: 'insensitive' };
    }

    if (cursor) {
      // Keyset stable: `created_at < c.createdAt OR (created_at = c.createdAt AND id < c.id)`.
      // Se envuelve en `AND` (via `where.AND`) para que Prisma componga correctamente con los
      // otros predicados (mismo patrón que US-077 `ListReviewsForAdminUseCase`).
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ];
    }

    const rows = (await this.prisma.vendorProfile.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: {
        id: true,
        businessName: true,
        slug: true,
        status: true,
        isHidden: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
        adminAction: {
          select: { action: true, adminUserId: true, createdAt: true, metadata: true },
        },
      },
    })) as AdminVendorMapperInput[];

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const items = page.map(toAdminVendorListItem);

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1]!;
      nextCursor = encodeAdminVendorsCursor({
        createdAt: new Date(last.createdAt),
        id: last.id,
      });
    }

    return {
      items,
      pagination: { nextCursor, pageSize },
    };
  }
}
