import { expect, test } from '@playwright/test';

// AC-09: un usuario anónimo en una ruta de autenticación ve el layout de auth, nunca el shell
// autenticado (sin sidebar de navegación de rol).
//
// `/login` dejó de usar la tarjeta centrada de `(auth)`: su composición es el shell a dos columnas
// `AuthSplitShell` (referencia Stitch «Iniciar Sesión (Foco)»). El resto de rutas del grupo
// `(auth)` conserva la tarjeta, así que la cobertura de `.auth-card` se mantiene sobre `/register`.
test('auth layout muestra card y no sidebar', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('.auth-card')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Events' })).toHaveCount(0);
});

test('/login usa el shell a dos columnas y tampoco monta el shell autenticado', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('.auth-card')).toHaveCount(0);
  // Landmark principal + panel complementario del shell de login.
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.getByRole('complementary')).toBeAttached();
  await expect(page.getByRole('link', { name: 'Events' })).toHaveCount(0);
});
