import { expect, test } from '@playwright/test';

// AC-05: anonymous puede acceder a (public) y (auth) sin redirect a /login.
const publicPaths = ['/', '/vendors', '/login', '/register', '/forgot-password', '/403'];

for (const path of publicPaths) {
  test(`anonymous accede a ${path} (200, sin redirect a /login)`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(path);
  });
}
