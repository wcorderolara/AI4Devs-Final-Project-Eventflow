import { expect, test } from '@playwright/test';

// Smoke E2E (AC-06): `/` responde 200 y renderiza `<main>` + `<h1>` visibles.
// US-128 (PB-P2-016 · QA-002): tag `@smoke` para que `npm run test:e2e:smoke`
// lo incluya como parte del subset rápido que corre en cada PR (AC-05).
test('home smoke @smoke', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
