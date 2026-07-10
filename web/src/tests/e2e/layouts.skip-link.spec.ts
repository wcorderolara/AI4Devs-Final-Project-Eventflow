import { expect, test } from '@playwright/test';

// AC-07/AC-10: el skip-link es el primer elemento focusable y lleva a #main-content.
test('skip-link se enfoca con Tab', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main-content');
});
