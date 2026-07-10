import { expect, test } from '@playwright/test';

// AC-09: anonymous en `/login` ve AuthLayout (card) sin sidebar.
test('auth layout muestra card y no sidebar', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('.auth-card')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Events' })).toHaveCount(0);
});
