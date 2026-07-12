import { expect, test } from '@playwright/test';

// US-001 / QA-004 — E2E del flujo de registro con fake captcha (provider mock) y backend
// interceptado (patrón del repo: `page.route`, como data-layer.*.spec.ts). Verifica AC-01:
// completar el formulario → captcha resuelto → 201 + cookie de sesión → aterrizaje en /organizer.

// Copy en es-LATAM (AC-02): `locale` fija el Accept-Language de navegación (patrón i18n.detection).
test.use({ locale: 'es-419' });

const registerEnvelope = {
  data: {
    id: '3f2c1a4e-9b7d-4e2a-8c5f-1d0e6a7b8c9d',
    email: 'e2e@eventflow.test',
    name: 'E2E Organizer',
    role: 'organizer',
    status: 'active',
    preferredLanguage: 'es-LATAM',
    phone: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
  meta: { correlationId: 'req_e2e_register', timestamp: '2026-07-10T00:00:00.000Z' },
};

test('AC-01: registro de organizador completo aterriza en /organizer', async ({ page }) => {
  await page.route('**/auth/register', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      // La cookie de sesión viaja por Set-Cookie (HttpOnly la valida el backend real; aquí
      // habilita el UX role guard de /organizer, que solo verifica presencia).
      headers: { 'set-cookie': 'eventflow_session=e2e-session; Path=/' },
      body: JSON.stringify(registerEnvelope),
    }),
  );
  await page.route('**/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'u1', email: 'e2e@eventflow.test', name: 'E2E Organizer', role: 'organizer', status: 'active', preferredLanguage: 'es-LATAM', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
        meta: { correlationId: 'req_e2e_me' },
      }),
    }),
  );

  await page.goto('/register');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crea tu cuenta de organizador');

  await page.getByLabel('Nombre completo').fill('E2E Organizer');
  await page.getByLabel('Correo electrónico').fill('e2e@eventflow.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
  await page.getByLabel('Acepto los términos y la política de privacidad').check();

  // Fake captcha (provider mock): el submit permanece deshabilitado hasta resolverlo (EC-01).
  const submit = page.getByRole('button', { name: 'Crear mi cuenta' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('No soy un robot').check();
  await expect(submit).toBeEnabled();

  await submit.click();
  await page.waitForURL('**/organizer');
  expect(new URL(page.url()).pathname).toBe('/organizer');
});

test('EC-01: captcha inválido en backend → banner y widget reiniciado', async ({ page }) => {
  await page.route('**/auth/register', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'CAPTCHA_INVALID', message: 'Security verification failed.' },
        meta: { correlationId: 'req_e2e_captcha' },
      }),
    }),
  );

  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill('E2E Organizer');
  await page.getByLabel('Correo electrónico').fill('e2e@eventflow.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('segura12345');
  await page.getByLabel('Acepto los términos y la política de privacidad').check();
  await page.getByLabel('No soy un robot').check();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();

  // `.first()`: Next agrega su propio route announcer con role="alert" (strict mode).
  await expect(page.getByRole('alert').first()).toContainText('Verificación de seguridad fallida');
  await expect(page.getByLabel('No soy un robot')).not.toBeChecked();
  expect(new URL(page.url()).pathname).toBe('/register');
});
