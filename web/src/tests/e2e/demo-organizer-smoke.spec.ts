// US-128 · PB-P2-016 · QA-002 (smoke)
// Smoke del inicio del camino demo: `/` responde, `/login` renderiza y el
// organizer puede autenticarse aterrizando en `/organizer` con la sesión
// mockeada del "seed" (`fixtures/seed-fixtures.ts`).
//
// Es el subset que corre en cada PR via `npm run test:e2e:smoke` (tag
// `@smoke`) — protege el "demo readiness" mínimo: si login está roto la
// demo no puede empezar (AC-05 · Doc 20 §22). El resto del camino demo
// vive en `demo-organizer.spec.ts` (opt-in via `E2E_DEMO_READY`).

import { expect, test, type Page, type Route } from '@playwright/test';
import { organizerSessionEnvelope } from './fixtures/seed-fixtures';

test.use({ locale: 'es-419' });

async function mockAuth(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'set-cookie': [
          'eventflow_session=e2e-demo-smoke; Path=/',
          'eventflow_role=organizer; Path=/',
        ].join('\n'),
      },
      body: JSON.stringify(organizerSessionEnvelope()),
    }),
  );
  await page.route('**/api/v1/users/me', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(organizerSessionEnvelope()),
    }),
  );
}

test('demo readiness · organizer login redirige a /organizer @smoke', async ({ page }) => {
  await mockAuth(page);

  const response = await page.goto('/login');
  expect(response?.status()).toBe(200);

  await page.getByLabel('Correo electrónico').fill('organizer@eventflow.demo');
  await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.waitForURL('**/organizer');
  expect(new URL(page.url()).pathname).toBe('/organizer');
});
