// MSW handlers — vendor-profile / US-042 FE-003.
// Simulan `POST /api/v1/vendors/me/categories` cubriendo 200 (repending), 200 noop, 400
// INVALID_CATEGORIES/INVALID_CATEGORY, 409 CATEGORY_CHANGE_LIMIT / PROFILE_HIDDEN, 401, 403, 404.
// El request body dispara distintas ramas mediante marcadores UUID especiales — sirve para
// tests de UI que no necesitan una BD detrás.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000042';
const PROFILE_ID = '11111111-1111-1111-1111-111111111111';
const VENDOR_USER_ID = '22222222-2222-2222-2222-222222222222';

const UUID_LIMIT_REACHED = '00000000-0000-0000-0000-000000000091';
const UUID_INVALID_CATEGORY = '00000000-0000-0000-0000-000000000092';
const UUID_HIDDEN = '00000000-0000-0000-0000-000000000093';
const UUID_UNAUTH = '00000000-0000-0000-0000-000000000094';
const UUID_FORBIDDEN = '00000000-0000-0000-0000-000000000095';
const UUID_NOT_FOUND = '00000000-0000-0000-0000-000000000096';
const UUID_NOOP = '00000000-0000-0000-0000-000000000097';

function baseProfile(status = 'approved') {
  return {
    id: PROFILE_ID,
    vendor_user_id: VENDOR_USER_ID,
    business_name: 'Vendor MSW',
    bio: 'Vendor demo bio con suficiente longitud para pasar validación de 50 caracteres mínimos.',
    location_id: '33333333-3333-3333-3333-333333333333',
    languages_supported: ['es-LATAM'],
    categories: [{ id: '44444444-4444-4444-4444-444444444444', name: 'Catering' }],
    slug: 'vendor-msw',
    status,
    created_at: '2026-07-15T12:00:00.000Z',
  };
}

interface ChangeCategoriesBody {
  service_category_ids: string[];
}

export const vendorProfileHandlers = [
  http.post('*/api/v1/vendors/me/categories', async ({ request }) => {
    const body = (await request.json()) as ChangeCategoriesBody | null;
    const ids = body?.service_category_ids ?? [];

    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CATEGORIES',
            message: 'service_category_ids must contain between 1 and 5 distinct UUIDs',
            correlationId: CORRELATION,
          },
        },
        { status: 400 },
      );
    }

    if (ids.includes(UUID_UNAUTH)) {
      return HttpResponse.json(
        { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Session required', correlationId: CORRELATION } },
        { status: 401 },
      );
    }
    if (ids.includes(UUID_FORBIDDEN)) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only vendors', correlationId: CORRELATION } },
        { status: 403 },
      );
    }
    if (ids.includes(UUID_NOT_FOUND)) {
      return HttpResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Vendor profile not found', correlationId: CORRELATION } },
        { status: 404 },
      );
    }
    if (ids.includes(UUID_HIDDEN)) {
      return HttpResponse.json(
        { error: { code: 'PROFILE_HIDDEN', message: 'Profile hidden', correlationId: CORRELATION } },
        { status: 409 },
      );
    }
    if (ids.includes(UUID_LIMIT_REACHED)) {
      return HttpResponse.json(
        { error: { code: 'CATEGORY_CHANGE_LIMIT', message: 'Limit reached', correlationId: CORRELATION } },
        { status: 409 },
      );
    }
    if (ids.includes(UUID_INVALID_CATEGORY)) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Unknown or inactive category',
            details: [{ field: 'service_category_ids', message: UUID_INVALID_CATEGORY }],
            correlationId: CORRELATION,
          },
        },
        { status: 400 },
      );
    }

    if (ids.length === 1 && ids[0] === UUID_NOOP) {
      const profile = baseProfile('approved');
      return HttpResponse.json(
        {
          data: {
            profile,
            repending: false,
            noop: true,
            category_change_count: 1,
            requires_admin_review: false,
            status: 'approved',
            last_category_change_at: null,
          },
          meta: { correlationId: CORRELATION, timestamp: '2026-07-15T12:00:00.000Z' },
        },
        { status: 200 },
      );
    }

    const profile = baseProfile('pending');
    profile.categories = ids.map((id, idx) => ({ id, name: `Cat ${idx + 1}` }));
    return HttpResponse.json(
      {
        data: {
          profile,
          repending: true,
          noop: false,
          category_change_count: 1,
          requires_admin_review: true,
          status: 'pending',
          last_category_change_at: '2026-07-15T12:00:00.000Z',
        },
        meta: { correlationId: CORRELATION, timestamp: '2026-07-15T12:00:00.000Z' },
      },
      { status: 200 },
    );
  }),
];

export const vendorProfileHandlerTestIds = {
  UUID_LIMIT_REACHED,
  UUID_INVALID_CATEGORY,
  UUID_HIDDEN,
  UUID_UNAUTH,
  UUID_FORBIDDEN,
  UUID_NOT_FOUND,
  UUID_NOOP,
};
