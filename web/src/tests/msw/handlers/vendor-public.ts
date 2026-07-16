// MSW handlers — perfil público SEO del vendor (US-046 / FE-004).
// Cubre `GET /api/v1/public/vendors/:slug`:
//   - `banquetes-el-quetzal` → 200 con shape completo (portfolio + packages + reviews).
//   - `sin-reviews` → 200 sin reviews ni portfolio (empty states del UI).
//   - `slug-desconocido` → 404 VENDOR_NOT_FOUND.
//   - `slug-invalido` → 400 VALIDATION_ERROR (defensa en profundidad).
//   - `slug-rate-limited` → 429 RATE_LIMIT_EXCEEDED.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000046';

const RICH_VENDOR = {
  slug: 'banquetes-el-quetzal',
  businessName: 'Banquetes El Quetzal',
  bio: 'Servicio de banquetes premium para bodas y quinceañeras. Más de 20 años de experiencia.',
  location: { display: 'Ciudad de Guatemala, Guatemala', code: 'GT-GUA' },
  categories: [
    { code: 'catering', name: 'Catering' },
    { code: 'events', name: 'Eventos' },
  ],
  ratingAvg: 4.8,
  reviewsCount: 24,
  reviewsTotalPublished: 24,
  packages: [
    {
      packageName: 'Menú clásico',
      basePrice: '250.00',
      currencyCode: 'GTQ',
      description: 'Menú de 3 tiempos para 100 invitados.',
      serviceCategoryCode: 'catering',
    },
    {
      packageName: 'Menú premium',
      basePrice: '450.00',
      currencyCode: 'GTQ',
      description: 'Menú de 5 tiempos con maridaje.',
      serviceCategoryCode: 'catering',
    },
  ],
  portfolio: [
    {
      workLabel: 'boda-clasica',
      thumbnails: ['https://cdn.test/msw/1.jpg', 'https://cdn.test/msw/2.jpg'],
    },
    { workLabel: 'quince-anos', thumbnails: ['https://cdn.test/msw/3.jpg'] },
  ],
  reviews: Array.from({ length: 10 }, (_, i) => ({
    rating: 5 - (i % 2),
    comment: `Reseña pública de prueba ${i + 1}`,
    createdAt: new Date(Date.UTC(2026, 5, 15 - i)).toISOString(),
    reviewerDisplayName: i % 2 === 0 ? 'Juan P.' : 'María L.',
  })),
};

const EMPTY_VENDOR = {
  slug: 'sin-reviews',
  businessName: 'Sin Reseñas Aún',
  bio: 'Proveedor nuevo aún sin reseñas.',
  location: { display: 'Ciudad de México, México', code: 'MX-CDMX' },
  categories: [{ code: 'photography', name: 'Fotografía' }],
  ratingAvg: null,
  reviewsCount: 0,
  reviewsTotalPublished: 0,
  packages: [],
  portfolio: [],
  reviews: [],
};

export const vendorPublicHandlers = [
  http.get('*/api/v1/public/vendors/:slug', ({ params }) => {
    const slug = String(params.slug);

    if (slug === 'slug-invalido' || slug === 'BAD_SLUG') {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ field: 'params.slug', message: 'slug must match ^[a-z0-9-]+$' }],
            correlationId: CORRELATION,
          },
        },
        { status: 400 },
      );
    }

    if (slug === 'slug-rate-limited') {
      return HttpResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            correlationId: CORRELATION,
          },
        },
        { status: 429, headers: { 'Retry-After': '30' } },
      );
    }

    if (slug === RICH_VENDOR.slug) {
      return HttpResponse.json(
        { data: RICH_VENDOR, meta: { correlationId: CORRELATION, timestamp: new Date().toISOString() } },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
        },
      );
    }

    if (slug === EMPTY_VENDOR.slug) {
      return HttpResponse.json(
        { data: EMPTY_VENDOR, meta: { correlationId: CORRELATION, timestamp: new Date().toISOString() } },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
        },
      );
    }

    return HttpResponse.json(
      { error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found', correlationId: CORRELATION } },
      { status: 404 },
    );
  }),
];
