// MSW handlers — vendor-directory (US-045 / FE-003).
// Cubre `GET /api/v1/vendors` con 200 (páginas 1 y 2 via cursor), 400 INVALID_FILTERS,
// 400 INVALID_CURSOR, 401. Los disparadores viven en el `categoryCode`.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000045';

const TRIGGER_INVALID_CATEGORY = 'msw-invalid-category';
const TRIGGER_UNAUTH = 'msw-unauth';
const TRIGGER_INVALID_CURSOR = 'msw-invalid-cursor';

interface VendorCardMock {
  id: string;
  slug: string;
  businessName: string;
  locationCode: string;
  categories: string[];
  ratingAvg: number | null;
  reviewsCount: number;
  priceRange: { min: string; max: string; currency: string } | null;
  thumbnailUrl: string | null;
}

const PAGE_1: VendorCardMock[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'banquetes-el-quetzal',
    businessName: 'Banquetes El Quetzal',
    locationCode: 'GT-GUA',
    categories: ['catering'],
    ratingAvg: 4.8,
    reviewsCount: 24,
    priceRange: { min: '200.00', max: '450.00', currency: 'GTQ' },
    thumbnailUrl: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'foto-estudio-aurora',
    businessName: 'Foto Estudio Aurora',
    locationCode: 'GT-GUA',
    categories: ['photography'],
    ratingAvg: 4.5,
    reviewsCount: 12,
    priceRange: { min: '300.00', max: '600.00', currency: 'GTQ' },
    thumbnailUrl: null,
  },
];

const PAGE_2: VendorCardMock[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    slug: 'floristeria-primavera',
    businessName: 'Floristería Primavera',
    locationCode: 'GT-GUA',
    categories: ['flowers'],
    ratingAvg: null,
    reviewsCount: 0,
    priceRange: null,
    thumbnailUrl: null,
  },
];

const NEXT_CURSOR = 'bXN3LWN1cnNvci1uZXh0';

export const vendorDirectoryHandlers = [
  http.get('*/api/v1/vendors', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('categoryCode');
    const cursor = url.searchParams.get('cursor');

    if (category === TRIGGER_UNAUTH) {
      return HttpResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Session required',
            correlationId: CORRELATION,
          },
        },
        { status: 401 },
      );
    }
    if (category === TRIGGER_INVALID_CATEGORY) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_FILTERS',
            message: 'Invalid search filters',
            details: [{ field: 'categoryCode', message: 'invalid' }],
            correlationId: CORRELATION,
          },
        },
        { status: 400 },
      );
    }
    if (cursor === TRIGGER_INVALID_CURSOR || cursor === 'not-a-cursor') {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CURSOR',
            message: 'Invalid pagination cursor',
            correlationId: CORRELATION,
          },
        },
        { status: 400 },
      );
    }

    if (cursor === NEXT_CURSOR) {
      return HttpResponse.json({
        data: { items: PAGE_2, page: { cursor: null, limit: 20, hasNext: false } },
        meta: { correlationId: CORRELATION, timestamp: new Date().toISOString() },
      });
    }

    return HttpResponse.json({
      data: { items: PAGE_1, page: { cursor: NEXT_CURSOR, limit: 20, hasNext: true } },
      meta: { correlationId: CORRELATION, timestamp: new Date().toISOString() },
    });
  }),
];
