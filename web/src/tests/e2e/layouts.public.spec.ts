import { expect, test } from '@playwright/test';

// AC-09: anonymous en `/` ve PublicLayout con nav Directorio/Login/Register + footer.
test('public layout muestra nav y footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Directory' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});
