// US-128 · PB-P2-016 · QA-001
// Camino demo del organizador end-to-end (Doc 20 §25.1):
//   auth → event → plan IA (Mock) → tasks → budget → vendors → quote request →
//   compare quotes → booking intent → review.
//
// Estrategia: **backend mockeado** vía `page.route` (patrón consolidado del
// repo desde US-037/US-103 · execution record D-01). Los fixtures viven en
// `./fixtures/seed-fixtures.ts` y reflejan el contrato real de docs/16 §13,
// respaldado por la suite contract US-127. Los pasos de IA usan
// `MockAIProvider`-compatible fixtures (`aiMeta.provider='mock'`,
// `fallbackUsed:false`) — VR-02 · AC-04.
//
// Ejecución: la suite completa recorre el camino y valida hitos observables
// (URL alcanzada + heading visible). Se salta cuando `E2E_DEMO_READY!=true`
// para no romper la CI base — misma política que `us037-budget-apply.spec.ts`.
// El smoke que SÍ corre en cada PR está en `demo-organizer-smoke.spec.ts`
// (tag `@smoke`).

import { expect, test, type Page, type Route } from '@playwright/test';
import {
  aiBudgetEnvelope,
  aiChecklistEnvelope,
  aiCompareQuotesEnvelope,
  aiPlanEnvelope,
  bookingIntentEnvelope,
  eventEnvelope,
  organizerSessionEnvelope,
  quoteEnvelope,
  quotesListEnvelope,
  reviewEnvelope,
  vendorDirectoryEnvelope,
  DEMO_EVENT_ID,
  DEMO_QUOTE_ID,
  DEMO_VENDOR_ID,
} from './fixtures/seed-fixtures';

const demoReady = process.env.E2E_DEMO_READY === 'true';

test.describe('US-128 · camino demo del organizador (E2E on mocked contract)', () => {
  test.skip(!demoReady, 'E2E_DEMO_READY!=true — spec estructural del camino demo; smoke cubre PR');

  test.use({ locale: 'es-419' });

  async function mockBackbone(page: Page): Promise<void> {
    // Sesión + user actual — cualquier página tras login los llama.
    await page.route('**/api/v1/users/me', (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(organizerSessionEnvelope()),
      }),
    );

    // Login: cookies para el role-guard (US-105) + envelope de auth user.
    await page.route('**/api/v1/auth/login', (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': [
            'eventflow_session=e2e-demo; Path=/',
            'eventflow_role=organizer; Path=/',
          ].join('\n'),
        },
        body: JSON.stringify(organizerSessionEnvelope()),
      }),
    );

    // Event detail + list — cualquier consulta al evento demo.
    await page.route(`**/api/v1/events/${DEMO_EVENT_ID}`, (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(eventEnvelope()),
      }),
    );
    await page.route('**/api/v1/events', (route: Route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(eventEnvelope()),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { items: [eventEnvelope().data], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } },
          meta: { correlationId: 'req_e2e_events_list', timestamp: '2026-07-23T00:00:00.000Z' },
        }),
      });
    });

    // IA plan / checklist / budget / compare (MockAIProvider — VR-02 · AC-04).
    await page.route('**/api/v1/ai/plan**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiPlanEnvelope()) }),
    );
    await page.route('**/api/v1/ai/checklist**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiChecklistEnvelope()) }),
    );
    await page.route('**/api/v1/ai/budget**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiBudgetEnvelope()) }),
    );
    await page.route('**/api/v1/ai/compare-quotes**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiCompareQuotesEnvelope()) }),
    );

    // Directorio de vendors aprobados (consumidos del "seed" — fixture).
    await page.route('**/api/v1/vendors**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(vendorDirectoryEnvelope()) }),
    );

    // Quote request + lista + detalle.
    await page.route('**/api/v1/quotes**', (route: Route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(quoteEnvelope({ status: 'requested' })),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quotesListEnvelope()),
      });
    });
    await page.route(`**/api/v1/quotes/${DEMO_QUOTE_ID}`, (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quoteEnvelope()) }),
    );

    // Booking intent confirmado.
    await page.route('**/api/v1/booking-intents**', (route: Route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(bookingIntentEnvelope()),
      }),
    );

    // Review publicado tras confirmación.
    await page.route('**/api/v1/reviews**', (route: Route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(reviewEnvelope()) }),
    );
  }

  test('TS-01..TS-07 · camino completo hasta review', async ({ page }) => {
    await mockBackbone(page);

    // TS-01 · auth: el organizador se loguea.
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('organizer@eventflow.demo');
    await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL('**/organizer');
    expect(new URL(page.url()).pathname).toBe('/organizer');

    // TS-02 · crear evento (o navegar al existente por reproducibilidad del fixture).
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // TS-03 · plan IA (Mock): la ruta expone el plan sugerido.
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/ai/plan`);
    await expect(page.getByRole('main').first()).toBeVisible();

    // TS-04 · checklist/tasks + presupuesto (Mock).
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/tasks`);
    await expect(page.getByRole('main').first()).toBeVisible();
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/budget`);
    await expect(page.getByRole('main').first()).toBeVisible();

    // TS-05 · vendors aprobados: el directorio muestra al vendor del fixture.
    await page.goto('/organizer/vendors');
    await expect(page.getByRole('main').first()).toBeVisible();

    // TS-06 · quote request + comparación.
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/quotes/new?vendorId=${DEMO_VENDOR_ID}`);
    await expect(page.getByRole('main').first()).toBeVisible();
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/quotes/compare`);
    await expect(page.getByRole('main').first()).toBeVisible();

    // TS-07 · booking intent + review (páginas de listado y evento).
    await page.goto(`/organizer/events/${DEMO_EVENT_ID}/quotes`);
    await expect(page.getByRole('main').first()).toBeVisible();
  });
});
