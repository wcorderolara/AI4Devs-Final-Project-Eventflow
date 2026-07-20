// GetVendorReviewsUseCase (US-066 / BE-002 + BE-005). Tech Spec §7 UseCase.
//
// Listado sólo-lectura de reviews de un vendor con cursor pagination keyset
// `(created_at DESC, id DESC)` (D1). Contrato:
//
//   - Anónimo / organizer / vendor: sólo vendor `approved` + sólo reviews `status='published'`
//     (D3). Vendor no `approved` ⇒ `404 VENDOR_NOT_FOUND` uniforme (D5 / SEC-04).
//   - Admin: cualquier `vendor.status` + reviews de todos los `status` (`published | hidden |
//     removed`), y la respuesta incluye el campo `status` para cada item (D3 / AC-05).
//
// Cursor: `{createdAt, id}` en base64url (BE-004, `vendor-reviews-cursor.ts`). El predicado
// de página es keyset:
//
//   `created_at < c.created_at OR (created_at = c.created_at AND id < c.id)`
//
// que empata la tupla estable `(created_at DESC, id DESC)` sin sort en memoria (soportado por
// el índice parcial `idx_reviews_vendor_published_created` creado en DB-001).
//
// Anti N+1 (BE-005): `bookingIntent: { select: { event: { select: { title: true } } } }` — un
// solo JOIN chained (Review→BookingIntent→Event), sin fetch adicional por review. El `select`
// interno del review limita las columnas cargadas a las de la vista anonimizada
// (`id, rating, comment, createdAt, status, bookingIntent.event.title`) — hace imposible que
// el mapper (BE-001) emita PII por accidente. Se navega a través de `bookingIntent.eventId`
// (denormalizado en US-060 BE-003) porque `Review` no tiene relación directa con `Event`.
import { Prisma, type PrismaClient } from '@prisma/client';
import { ReviewStatus } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  encodeVendorReviewsCursor,
  decodeVendorReviewsCursor,
  type VendorReviewsCursor,
} from './vendor-reviews-cursor.js';
import {
  toAnonymizedReview,
  type AnonymizedReviewRow,
} from './anonymized-review.mapper.js';
import {
  VendorNotFoundForReviewsError,
  Us066InvalidCursorError,
} from '../domain/us066.errors.js';
import type {
  AnonymizedReview,
  ListVendorReviewsResponse,
  VendorSummary,
} from '../interface/list-vendor-reviews.response.js';

export type GetVendorReviewsCurrentUser =
  | { id: string; role: 'organizer' | 'vendor' | 'admin' | string }
  | null;

export interface GetVendorReviewsInput {
  currentUser: GetVendorReviewsCurrentUser;
  vendorId: string;
  cursor?: string;
  pageSize: number;
}

export class GetVendorReviewsUseCase {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async execute(input: GetVendorReviewsInput): Promise<ListVendorReviewsResponse> {
    const { currentUser, vendorId, cursor: cursorToken, pageSize } = input;
    const isAdmin = currentUser?.role === 'admin';

    // 1) Vendor lookup + gating por rol (D5 uniforme 404). US-047 (PB-P1-041 / AC-04):
    // `is_hidden=true` sobre un vendor `approved` lo saca del directorio público — el listado
    // de reviews sigue el mismo criterio de visibilidad; admin ve todo (`sees-all` D3 US-066).
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        businessName: true,
        slug: true,
        status: true,
        isHidden: true,
        ratingAvg: true,
        reviewsCount: true,
      },
    });
    if (!vendor) throw new VendorNotFoundForReviewsError();
    if (!isAdmin && (vendor.status !== 'approved' || vendor.isHidden)) {
      throw new VendorNotFoundForReviewsError();
    }

    // 2) Cursor decode. `Us066InvalidCursorError` → 400 INVALID_CURSOR (EC-03).
    let cursor: VendorReviewsCursor | null = null;
    if (cursorToken !== undefined) {
      cursor = decodeVendorReviewsCursor(cursorToken);
      if (cursor === null) throw new Us066InvalidCursorError();
    }

    // 3) Predicado — filtro por vendor + admin override + keyset del cursor.
    const where: Prisma.ReviewWhereInput = {
      vendorProfileId: vendorId,
      // Soft-delete siempre activo (SEC-01: deleted_at IS NOT NULL nunca visible, ni para admin
      // por este endpoint — el catálogo de moderación de soft-deletes vive en otro endpoint).
      deletedAt: null,
      ...(isAdmin ? {} : { status: ReviewStatus.published }),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };

    // 4) Query. `take: pageSize + 1` detecta `hasMore` sin COUNT adicional.
    const rows = await this.prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        status: true,
        bookingIntent: { select: { event: { select: { title: true } } } },
      },
    });

    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    const items: AnonymizedReview[] = pageRows.map((row) =>
      toAnonymizedReview(row as AnonymizedReviewRow, { includeStatus: isAdmin }),
    );

    const nextCursor =
      hasMore && pageRows.length > 0
        ? encodeVendorReviewsCursor({
            createdAt: pageRows[pageRows.length - 1]!.createdAt,
            id: pageRows[pageRows.length - 1]!.id,
          })
        : null;

    const summary: VendorSummary = {
      id: vendor.id,
      businessName: vendor.businessName,
      slug: vendor.slug ?? '',
      status: vendor.status,
      ratingAvg: vendor.ratingAvg === null ? null : Number(vendor.ratingAvg),
      reviewsCount: vendor.reviewsCount,
    };

    return {
      vendor: summary,
      items,
      pagination: { nextCursor, pageSize },
    };
  }
}
