// MSW handlers — vendor reviews public listing (US-066 / PB-P1-039 / FE-003).
//
// Cubre `GET /api/v1/vendors/:id/reviews` con 200 happy path (25 reviews, dos páginas de
// 20+5) + errores del contrato §9:
//   - `400 VALIDATION_ERROR` cuando `pageSize` cae fuera del rango 1..50.
//   - `400 INVALID_CURSOR` cuando el `cursor` no decodifica.
//   - `404 VENDOR_NOT_FOUND` cuando `:id` empata el trigger sentinel.
//
// Los disparadores viven en el path `:id`: cualquier UUID que no matchee cae al happy path
// determinista con `HAPPY_VENDOR_ID` como valor por defecto de la summary.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000066';

const HAPPY_VENDOR_ID = 'ffffffff-0000-0000-0066-000000000200';
const VENDOR_NOT_FOUND_ID = 'ffffffff-0000-0000-0066-000000000404';
const INVALID_CURSOR_TOKEN = '!!!invalid-cursor!!!';

export const vendorReviewsMswTriggers = {
  HAPPY: HAPPY_VENDOR_ID,
  NOT_FOUND: VENDOR_NOT_FOUND_ID,
  INVALID_CURSOR_TOKEN,
} as const;

interface AnonymizedReview {
  id: string;
  rating: number;
  comment: string | null;
  eventTitle: string;
  createdAt: string;
  status?: 'published' | 'hidden' | 'removed';
}

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(code: string, message: string, details?: unknown) {
  const error: { code: string; message: string; correlationId: string; details?: unknown } = {
    code,
    message,
    correlationId: CORRELATION,
  };
  if (details !== undefined) error.details = details;
  return { error };
}

// Genera 25 reviews deterministas (created_at descendente, IDs estables) para probar la
// paridad de dos páginas: 20 en la primera + 5 en la segunda, cursor sólido, sin duplicados.
function generateFixtures(vendorId: string): AnonymizedReview[] {
  const base = Date.parse('2026-06-01T00:00:00.000Z');
  return Array.from({ length: 25 }, (_, index) => ({
    id: `00000000-0000-0000-0066-${String(index + 1).padStart(12, '0')}`,
    rating: (index % 5) + 1,
    comment: index % 3 === 0 ? null : `Reseña de ejemplo ${index + 1} para vendor ${vendorId.slice(0, 8)}.`,
    eventTitle: `Evento #${index + 1}`,
    createdAt: new Date(base - index * 24 * 3600 * 1000).toISOString(),
  }));
}

const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 50;
const PAGE_SIZE_DEFAULT = 20;

function parsePageSize(raw: string | null): number | { error: true } {
  if (raw === null) return PAGE_SIZE_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < PAGE_SIZE_MIN || n > PAGE_SIZE_MAX) {
    return { error: true };
  }
  return n;
}

export const vendorReviewsHandlers = [
  http.get('*/api/v1/vendors/:id/reviews', ({ params, request }) => {
    const vendorId = String(params.id ?? '');

    if (vendorId === VENDOR_NOT_FOUND_ID) {
      return HttpResponse.json(errorEnvelope('VENDOR_NOT_FOUND', 'Vendor not found'), { status: 404 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const pageSizeParsed = parsePageSize(url.searchParams.get('pageSize'));

    if (typeof pageSizeParsed !== 'number') {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid pageSize', [
          { field: 'query.pageSize', message: `must be integer in [${PAGE_SIZE_MIN}..${PAGE_SIZE_MAX}]` },
        ]),
        { status: 400 },
      );
    }

    if (cursor !== null && (cursor.length === 0 || cursor === INVALID_CURSOR_TOKEN)) {
      return HttpResponse.json(errorEnvelope('INVALID_CURSOR', 'Invalid cursor'), { status: 400 });
    }

    const pageSize = pageSizeParsed;
    const all = generateFixtures(vendorId);
    let startIndex = 0;
    if (cursor !== null) {
      // El cursor es opaco pero determinista: usamos su decoded length como offset (test-only).
      try {
        const decoded = atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
        const parsed = JSON.parse(decoded) as { i?: string };
        if (typeof parsed.i === 'string') {
          const found = all.findIndex((row) => row.id === parsed.i);
          if (found >= 0) startIndex = found + 1;
        }
      } catch {
        return HttpResponse.json(errorEnvelope('INVALID_CURSOR', 'Invalid cursor'), { status: 400 });
      }
    }

    const slice = all.slice(startIndex, startIndex + pageSize);
    const nextIndex = startIndex + slice.length;
    const nextCursor =
      nextIndex < all.length && slice.length > 0
        ? btoa(
            JSON.stringify({
              c: slice[slice.length - 1]!.createdAt,
              i: slice[slice.length - 1]!.id,
            }),
          )
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
        : null;

    return HttpResponse.json(
      envelope({
        vendor: {
          id: vendorId,
          businessName: 'Acme Catering',
          slug: 'acme-catering',
          status: 'approved',
          ratingAvg: 4.6,
          reviewsCount: all.length,
        },
        items: slice,
        pagination: { nextCursor, pageSize },
      }),
      { status: 200 },
    );
  }),
];
