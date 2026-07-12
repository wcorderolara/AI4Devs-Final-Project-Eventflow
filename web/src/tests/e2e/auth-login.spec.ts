import { expect, test, type Page } from '@playwright/test';

// US-003 / QA-004 — E2E de login: 3 roles → redirección a su layout (AC-01/AC-02) y captcha
// condicional (EC-02). Backend interceptado (patrón del repo: page.route).
test.use({ locale: 'es-419' });

function envelope(role: 'organizer' | 'vendor' | 'admin') {
  return {
    data: {
      id: 'a1b2c3d4-0000-4000-8000-000000000001',
      email: `${role}@eventflow.demo`,
      name: `E2E ${role}`,
      role,
      status: 'active',
      preferredLanguage: 'es-LATAM',
      phone: null,
      createdAt: '2026-07-10T00:00:00.000Z',
      updatedAt: '2026-07-10T00:00:00.000Z',
    },
    meta: { correlationId: 'req_e2e_login' },
  };
}

async function mockAuth(page: Page, role: 'organizer' | 'vendor' | 'admin'): Promise<void> {
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        // Cookies para el UX role guard: presencia de sesión + rol whitelisted (US-105).
        'set-cookie': [`eventflow_session=e2e-${role}; Path=/`, `eventflow_role=${role}; Path=/`].join('\n'),
      },
      body: JSON.stringify(envelope(role)),
    }),
  );
  await page.route('**/users/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(role)) }),
  );
}

for (const role of ['organizer', 'vendor', 'admin'] as const) {
  test(`AC-01/AC-02: login como ${role} aterriza en /${role}`, async ({ page }) => {
    await mockAuth(page, role);
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(`${role}@eventflow.demo`);
    await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL(`**/${role}`);
    expect(new URL(page.url()).pathname).toBe(`/${role}`);
  });
}

test('EC-02: captcha condicional aparece tras CAPTCHA_REQUIRED y permite reintentar', async ({ page }) => {
  let calls = 0;
  await page.route('**/auth/login', (route) => {
    calls += 1;
    if (calls === 1) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'CAPTCHA_REQUIRED', message: 'Captcha verification is required.' },
          meta: { correlationId: 'req_e2e_captcha' },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': 'eventflow_session=e2e-cond; Path=/' },
      body: JSON.stringify(envelope('organizer')),
    });
  });
  await page.route('**/users/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope('organizer')) }),
  );

  await page.goto('/login');
  // El widget NO está presente antes de que el backend lo exija (condicional N=3).
  await expect(page.getByLabel('No soy un robot')).toHaveCount(0);

  await page.getByLabel('Correo electrónico').fill('organizer@eventflow.demo');
  await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('alert').first()).toContainText('completa la verificación');
  const widget = page.getByLabel('No soy un robot');
  await expect(widget).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();

  await widget.check();
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('**/organizer');
  expect(new URL(page.url()).pathname).toBe('/organizer');
});
