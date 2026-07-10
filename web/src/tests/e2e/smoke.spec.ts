import { expect, test } from '@playwright/test';

// Smoke E2E (AC-06): `/` responde 200 y renderiza `<main>` + `<h1>` visibles.
test('home smoke', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
