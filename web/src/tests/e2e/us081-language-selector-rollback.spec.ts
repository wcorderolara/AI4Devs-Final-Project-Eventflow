import { expect, test, type Page } from '@playwright/test';

// US-081 QA-004 — E2E de optimistic rollback (AC-03).
// Authenticated cambia idioma; PATCH /users/me/preferred-language responde 500 → la UI vuelve al
// locale anterior + cookie revertida + toast/alert visible con mensaje i18n.
test.use({ locale: 'es-419' });

function envelope() {
  return {
    data: {
      id: 'a1b2c3d4-0000-4000-8000-000000000001',
      email: 'organizer@eventflow.demo',
      name: 'E2E organizer',
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'es-LATAM',
      phone: null,
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_us081' },
  };
}

async function mockAuthenticated(page: Page): Promise<void> {
  await page.route('**/users/me', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(envelope()),
      });
    }
    return route.continue();
  });
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'eventflow_locale', value: 'es-LATAM', url: 'http://localhost:3000' },
    { name: 'eventflow_session', value: 'e2e-organizer', url: 'http://localhost:3000' },
    { name: 'eventflow_role', value: 'organizer', url: 'http://localhost:3000' },
  ]);
});

test('AC-03: PATCH 500 revierte la cookie y muestra alerta i18n', async ({ page, context }) => {
  await mockAuthenticated(page);
  await page.route('**/users/me/preferred-language', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'INTERNAL', message: 'boom' },
        meta: { correlationId: 'req_e2e_us081_fail' },
      }),
    }),
  );

  await page.goto('/organizer');
  // Abrir el selector — está en el Topbar del área autenticada.
  await page.getByRole('button', { name: 'Cambiar idioma' }).click();
  await page.getByRole('option', { name: /English/ }).click();

  // Alerta de rollback visible con texto i18n en es-LATAM (el que estaba activo antes del intento).
  // Se usa `data-testid` en lugar de `getByRole('alert')` porque Next monta un route announcer
  // global con `role="alert"` que también matchea (strict-mode violation en Playwright).
  const alert = page.getByTestId('language-selector-error');
  await expect(alert).toContainText('No se pudo guardar tu preferencia');

  // Cookie revertida al locale previo.
  const cookies = await context.cookies();
  const localeCookie = cookies.find((c) => c.name === 'eventflow_locale');
  expect(localeCookie?.value).toBe('es-LATAM');
});
