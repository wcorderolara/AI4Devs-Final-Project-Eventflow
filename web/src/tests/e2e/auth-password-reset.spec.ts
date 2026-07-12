import { expect, test } from '@playwright/test';

// US-004 / QA-003 — E2E del flujo de recuperación: /forgot-password (202 neutro con captcha) →
// /reset-password?token= (204) → /login con aviso de éxito (AC-01/AC-02); EC-01: token expirado
// → TokenExpiredBanner con CTA. Backend interceptado (patrón del repo).
test.use({ locale: 'es-419' });

test('AC-01/AC-02: forgot → reset → login con aviso de contraseña restablecida', async ({ page }) => {
  await page.route('**/auth/password/reset-request', (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { message: 'If the email exists, a password reset link has been sent.' },
        meta: { correlationId: 'req_e2e_forgot' },
      }),
    }),
  );
  await page.route('**/auth/password/reset', (route) => route.fulfill({ status: 204 }));

  // 1) Solicitud del enlace (captcha fake obligatorio).
  await page.goto('/forgot-password');
  await page.getByLabel('Correo electrónico').fill('ana@eventflow.demo');
  const submit = page.getByRole('button', { name: 'Enviar enlace' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('No soy un robot').check();
  await submit.click();
  await expect(page.getByText('Si el email existe, recibirás un enlace')).toBeVisible();

  // 2) El usuario abre el enlace del email simulado con el token vigente.
  await page.goto('/reset-password?token=e2e-token-vigente');
  await page.getByLabel('Nueva contraseña').fill('NuevaClave99');
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();

  // 3) Aterriza en /login con el aviso de éxito (AC-02).
  await page.waitForURL('**/login?reset=success');
  await expect(page.getByText('Tu contraseña fue restablecida')).toBeVisible();
});

test('EC-01: token expirado → TokenExpiredBanner con CTA a /forgot-password', async ({ page }) => {
  await page.route('**/auth/password/reset', (route) =>
    route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'GONE_TOKEN_EXPIRED', message: 'The reset link has expired.' },
        meta: { correlationId: 'req_e2e_expired' },
      }),
    }),
  );

  await page.goto('/reset-password?token=e2e-token-expirado');
  await page.getByLabel('Nueva contraseña').fill('NuevaClave99');
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();

  await expect(page.getByText('El enlace expiró')).toBeVisible();
  await page.getByRole('link', { name: 'Solicitar nuevo enlace' }).click();
  await page.waitForURL('**/forgot-password');
  expect(new URL(page.url()).pathname).toBe('/forgot-password');
});
