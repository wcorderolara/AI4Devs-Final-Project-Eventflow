import { expect, test } from '@playwright/test';

// AC-10 / TS-17: forzar un error de render (`?throw=1`) renderiza un fallback accesible con copy i18n
// (botón de reintento + mensaje). Tolerante al locale del navegador.
test('error de render muestra fallback con botón de reintento y mensaje i18n', async ({ page }) => {
  await page.goto('/?throw=1');
  await expect(
    page.getByRole('button', { name: /retry|reintentar|tentar novamente/i }),
  ).toBeVisible();
  await expect(page.getByText(/unexpected error|salió mal|ha ido mal|deu errado/i)).toBeVisible();
});
