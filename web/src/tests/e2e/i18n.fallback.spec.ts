import { expect, test } from '@playwright/test';

// AC-07: sin cookie y con un locale no soportado, cae a es-LATAM.
test.use({ locale: 'fr-FR' });

test('locale no soportado cae a es-LATAM', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bienvenido a EventFlow')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
});
