// US-037 (PB-P1-021 / QA-006) — E2E Playwright del apply de sugerencia IA de presupuesto.
// Interceptación de rutas backend (patrón del repo, sin BD). Cubre AC-01, AC-02, AC-03, AC-05, AC-06.
// Requiere E2E_DEMO_READY=true; se saltea en CI base (misma política que US-016).
import { expect, test, type Page, type Route } from '@playwright/test';

test.use({ locale: 'en' });

const demoReady = process.env.E2E_DEMO_READY === 'true';
const eventId = process.env.E2E_DEMO_EVENT_ID ?? '00000000-0000-4000-8000-000000000001';
const REC_ID = '00000000-0000-4000-8000-000000000010';

function sessionEnvelope() {
  return {
    data: {
      id: 'a1b2c3d4-0000-4000-8000-000000000001',
      email: 'organizer@eventflow.demo',
      name: 'E2E organizer',
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'en',
      phone: null,
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_session' },
  };
}

function eventEnvelope() {
  return {
    data: {
      id: eventId,
      title: 'Demo wedding',
      status: 'active',
      currencyCode: 'GTQ',
      languageCode: 'en',
      eventTypeCode: 'wedding',
      guestsCount: 100,
      estimatedBudget: '10000',
      ownerId: 'a1b2c3d4-0000-4000-8000-000000000001',
    },
    meta: { correlationId: 'req_e2e_event' },
  };
}

function budgetSuggestionEnvelope() {
  return {
    data: {
      recommendationId: REC_ID,
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
      createdAt: '2026-07-14T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_ai_budget' },
  };
}

async function mockCommon(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionEnvelope()) }),
  );
  await page.route(`**/api/v1/events/${eventId}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(eventEnvelope()) }),
  );
  await page.route(`**/api/v1/events/${eventId}/ai/budget-suggestion`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(budgetSuggestionEnvelope()) }),
  );
}

test.describe('US-037 QA-006 — Apply AI budget (E2E)', () => {
  test.skip(!demoReady, 'Requires E2E_DEMO_READY=true');

  test('E2E-01: apply as-is → success toast + budget items in cache invalidation', async ({ page }) => {
    await mockCommon(page);
    await page.route(
      `**/api/v1/ai-recommendations/${REC_ID}/apply`,
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              recommendationId: REC_ID,
              type: 'budget_suggestion',
              status: 'accepted',
              eventId,
              vendorProfileId: null,
              quoteRequestId: null,
              input: {},
              output: {},
              aiMeta: null,
              createdAt: '2026-07-14T00:00:00.000Z',
            },
            meta: { correlationId: 'req_e2e_apply' },
          }),
        }),
    );
    await page.goto(`/organizer/events/${eventId}/ai/budget`);
    await page.getByRole('button', { name: /generate ai/i }).click();
    await page.getByRole('button', { name: /apply ai suggestion/i }).click();
    // Dialog abierto — click Apply.
    await page.getByRole('dialog').getByRole('button', { name: /^apply$/i }).click();
    await expect(page.getByText(/suggestion applied/i)).toBeVisible();
  });

  test('E2E-04: CATEGORY_INACTIVE → modal con CTAs deeplink', async ({ page }) => {
    await mockCommon(page);
    await page.route(
      `**/api/v1/ai-recommendations/${REC_ID}/apply`,
      (route: Route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'CATEGORY_INACTIVE',
              message: 'Some categories are inactive',
              details: [
                { field: 'inactive_categories', message: 'venue:Venue' },
              ],
            },
            meta: { correlationId: 'req_e2e_apply_err' },
          }),
        }),
    );
    await page.goto(`/organizer/events/${eventId}/ai/budget`);
    await page.getByRole('button', { name: /generate ai/i }).click();
    await page.getByRole('button', { name: /apply ai suggestion/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^apply$/i }).click();
    // Modal de error visible con lista y CTAs.
    await expect(page.getByRole('alertdialog', { name: /categories are no longer available/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /regenerate suggestion/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /apply manually/i })).toBeVisible();
  });
});
