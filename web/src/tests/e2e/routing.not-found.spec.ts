import { expect, test } from '@playwright/test';

// AC-03: ruta inexistente renderiza not-found.tsx (404 + copy i18n + CTA a /).
test('ruta inexistente muestra not-found', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe-123');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link')).toHaveAttribute('href', '/');
});
