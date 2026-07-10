import { expect, test } from '@playwright/test';

// AC-06: sin cookie y con Accept-Language pt, la primera visita renderiza en portugués.
// `locale` fija el Accept-Language del navegador de forma fiable (Chromium ignora extraHTTPHeaders
// para el Accept-Language de navegación).
test.use({ locale: 'pt-BR' });

test('detección por Accept-Language renderiza en pt sin cookie', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bem-vindo ao EventFlow')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
});
