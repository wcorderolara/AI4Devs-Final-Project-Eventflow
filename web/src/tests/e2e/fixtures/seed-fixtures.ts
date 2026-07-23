// US-128 · PB-P2-016 · OPS-002 + AI-001
// Fixtures del "seed" E2E (patrón mocked-backend documentado en el execution
// record D-01). Cada objeto refleja la forma canónica del contrato REST del
// backend (docs/16 §13, respaldado por la suite contract US-127 · PB-P2-015)
// para que los mocks de `page.route` en los specs NO mientan respecto al
// backend real.
//
// Fuente de forma:
//   - Envelope `{ data, meta }` con `meta.correlationId` y `timestamp`.
//   - Enums (`role`, `status`, `preferredLanguage`) y campos requeridos
//     alineados a `web/src/tests/contract/schemas.ts:authUserSchema`.
//   - Payloads de IA con `aiMeta.provider = 'mock'` + `fallbackUsed: false`
//     — determinismo AC-04 · VR-02 · docs/20 §25.4.
//
// Convención de IDs: UUIDs deterministas `00000000-0000-4000-8000-<slot>`
// para que cualquier assertion textual sea estable entre corridas.

export const DEMO_ORGANIZER_ID = 'a1b2c3d4-0000-4000-8000-000000000001';
export const DEMO_EVENT_ID = '00000000-0000-4000-8000-000000000101';
export const DEMO_VENDOR_ID = '00000000-0000-4000-8000-000000000201';
export const DEMO_QUOTE_ID = '00000000-0000-4000-8000-000000000301';
export const DEMO_BOOKING_ID = '00000000-0000-4000-8000-000000000401';
export const DEMO_AI_PLAN_ID = '00000000-0000-4000-8000-000000000501';
export const DEMO_AI_BUDGET_ID = '00000000-0000-4000-8000-000000000502';
export const DEMO_AI_CHECKLIST_ID = '00000000-0000-4000-8000-000000000503';
export const DEMO_AI_COMPARE_ID = '00000000-0000-4000-8000-000000000504';

export const DEMO_CORRELATION_ID = 'req_e2e_demo';
export const DEMO_TIMESTAMP = '2026-07-23T00:00:00.000Z';

function meta(correlationId: string = DEMO_CORRELATION_ID) {
  return { correlationId, timestamp: DEMO_TIMESTAMP };
}

// -----------------------------------------------------------------------------
// Auth · organizer session (docs/16 §Auth · AuthUserResponse)
// -----------------------------------------------------------------------------

export function organizerSessionEnvelope() {
  return {
    data: {
      id: DEMO_ORGANIZER_ID,
      email: 'organizer@eventflow.demo',
      name: 'Demo Organizer',
      role: 'organizer' as const,
      status: 'active' as const,
      preferredLanguage: 'es-LATAM' as const,
      phone: null,
      createdAt: DEMO_TIMESTAMP,
      updatedAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_session'),
  };
}

// -----------------------------------------------------------------------------
// Event · crear + detalle
// -----------------------------------------------------------------------------

export function eventEnvelope(overrides: { title?: string; status?: string } = {}) {
  return {
    data: {
      id: DEMO_EVENT_ID,
      title: overrides.title ?? 'Demo Wedding',
      status: overrides.status ?? 'active',
      currencyCode: 'GTQ',
      languageCode: 'es-LATAM',
      eventTypeCode: 'wedding',
      guestsCount: 100,
      estimatedBudget: '10000',
      ownerId: DEMO_ORGANIZER_ID,
    },
    meta: meta('req_e2e_event'),
  };
}

// -----------------------------------------------------------------------------
// AI · plan / checklist / budget / comparación (MockAIProvider fixtures)
// -----------------------------------------------------------------------------
//
// aiMeta.provider='mock' + fallbackUsed=false satisfacen AC-04 · VR-02. Ver
// `backend/src/modules/ai-assistance/infrastructure/providers/mock-ai.provider.ts`
// para la contraparte real del backend.

export function aiPlanEnvelope() {
  return {
    data: {
      recommendationId: DEMO_AI_PLAN_ID,
      type: 'plan_suggestion',
      status: 'pending',
      output: {
        plan: [
          { phase: 'venue', description: 'Seleccionar salón', order: 1 },
          { phase: 'catering', description: 'Menú de 3 tiempos', order: 2 },
        ],
      },
      aiMeta: { provider: 'mock', fallbackUsed: false },
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_ai_plan'),
  };
}

export function aiChecklistEnvelope() {
  return {
    data: {
      recommendationId: DEMO_AI_CHECKLIST_ID,
      type: 'checklist_suggestion',
      status: 'pending',
      output: {
        items: [
          { id: 'chk-1', title: 'Reservar salón', dueOffsetDays: -60 },
          { id: 'chk-2', title: 'Contratar catering', dueOffsetDays: -45 },
        ],
      },
      aiMeta: { provider: 'mock', fallbackUsed: false },
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_ai_checklist'),
  };
}

export function aiBudgetEnvelope() {
  return {
    data: {
      recommendationId: DEMO_AI_BUDGET_ID,
      type: 'budget_suggestion',
      status: 'pending',
      output: {
        currency_code: 'GTQ',
        budget_estimated: 10000,
        categories: [
          { name: 'Venue', service_category_code: 'venue', percentage: 50, amount: 5000 },
          { name: 'Catering', service_category_code: 'catering', percentage: 50, amount: 5000 },
        ],
      },
      aiMeta: { provider: 'mock', fallbackUsed: false },
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_ai_budget'),
  };
}

export function aiCompareQuotesEnvelope() {
  return {
    data: {
      recommendationId: DEMO_AI_COMPARE_ID,
      type: 'quote_comparison',
      status: 'pending',
      output: {
        summary: 'Vendor A ofrece mejor precio; Vendor B mayor cobertura.',
        highlights: [
          { quoteId: DEMO_QUOTE_ID, score: 0.82, reasons: ['precio', 'experiencia'] },
        ],
      },
      aiMeta: { provider: 'mock', fallbackUsed: false },
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_ai_compare'),
  };
}

// -----------------------------------------------------------------------------
// Vendors · directorio + detalle público
// -----------------------------------------------------------------------------

export function vendorDirectoryEnvelope() {
  return {
    data: {
      items: [
        {
          id: DEMO_VENDOR_ID,
          slug: 'demo-vendor',
          businessName: 'Demo Vendor',
          serviceCategoryCode: 'venue',
          approved: true,
          rating: 4.8,
          reviewCount: 24,
        },
      ],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    },
    meta: meta('req_e2e_vendors'),
  };
}

// -----------------------------------------------------------------------------
// Quotes · request + lista + detalle
// -----------------------------------------------------------------------------

export function quoteEnvelope(overrides: { status?: string } = {}) {
  return {
    data: {
      id: DEMO_QUOTE_ID,
      eventId: DEMO_EVENT_ID,
      vendorId: DEMO_VENDOR_ID,
      status: overrides.status ?? 'sent',
      amount: '5000',
      currencyCode: 'GTQ',
      validUntil: '2026-08-23T00:00:00.000Z',
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_quote'),
  };
}

export function quotesListEnvelope() {
  return {
    data: {
      items: [quoteEnvelope().data],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    },
    meta: meta('req_e2e_quotes_list'),
  };
}

// -----------------------------------------------------------------------------
// Booking intent + review
// -----------------------------------------------------------------------------

export function bookingIntentEnvelope() {
  return {
    data: {
      id: DEMO_BOOKING_ID,
      eventId: DEMO_EVENT_ID,
      vendorId: DEMO_VENDOR_ID,
      quoteId: DEMO_QUOTE_ID,
      status: 'confirmed_intent',
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_booking'),
  };
}

export function reviewEnvelope() {
  return {
    data: {
      id: '00000000-0000-4000-8000-000000000601',
      eventId: DEMO_EVENT_ID,
      vendorId: DEMO_VENDOR_ID,
      bookingIntentId: DEMO_BOOKING_ID,
      rating: 5,
      title: 'Excelente servicio',
      body: 'Todo salió perfecto.',
      status: 'published',
      createdAt: DEMO_TIMESTAMP,
    },
    meta: meta('req_e2e_review'),
  };
}
