import { expect, test } from '@playwright/test';

// US-002 / QA-004 — E2E del flujo vendor: /register?role=vendor → form comercial → fake captcha
// → 201 + cookie → aterrizaje en /vendor/onboarding con CTA "Completar mi perfil" (AC-01, AC-02).
test.use({ locale: 'es-419' });

const vendorEnvelope = {
  data: {
    id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
    email: 'vendor-e2e@eventflow.test',
    name: 'Catering Luna',
    role: 'vendor',
    status: 'active',
    preferredLanguage: 'es-LATAM',
    phone: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
  meta: { correlationId: 'req_e2e_vendor', timestamp: '2026-07-10T00:00:00.000Z' },
};

test('AC-01/AC-02: registro vendor aterriza en /vendor/onboarding con CTA de perfil', async ({ page }) => {
  await page.route('**/auth/register', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      headers: { 'set-cookie': 'eventflow_session=e2e-vendor-session; Path=/' },
      body: JSON.stringify(vendorEnvelope),
    }),
  );
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'u2', email: 'vendor-e2e@eventflow.test', name: 'Catering Luna', role: 'vendor', status: 'active', preferredLanguage: 'es-LATAM', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
        meta: { correlationId: 'req_e2e_me' },
      }),
    }),
  );

  await page.goto('/register?role=vendor');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crea tu cuenta de proveedor');

  await page.getByLabel('Nombre comercial').fill('Catering Luna');
  await page.getByLabel('Correo electrónico').fill('vendor-e2e@eventflow.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
  await page.getByLabel('Acepto los términos y la política de privacidad').check();
  await page.getByLabel('No soy un robot').check();

  await page.getByRole('button', { name: 'Crear mi cuenta de proveedor' }).click();
  await page.waitForURL('**/vendor/onboarding');
  expect(new URL(page.url()).pathname).toBe('/vendor/onboarding');
  await expect(page.getByRole('link', { name: 'Completar mi perfil' })).toBeVisible();
});
