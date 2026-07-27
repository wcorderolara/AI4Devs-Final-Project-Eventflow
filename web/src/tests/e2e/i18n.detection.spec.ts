import { expect, test } from '@playwright/test';

// AC-06: sin cookie y con Accept-Language pt, la primera visita renderiza en portugués.
// `locale` fija el Accept-Language del navegador de forma fiable (Chromium ignora extraHTTPHeaders
// para el Accept-Language de navegación).
test.use({ locale: 'pt-BR' });

test('detección por Accept-Language renderiza en pt sin cookie', async ({ page }) => {
  await page.goto('/');
  // La landing dejó de ser un placeholder: se comprueba el titular real en portugués.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('plano acionável');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
});
