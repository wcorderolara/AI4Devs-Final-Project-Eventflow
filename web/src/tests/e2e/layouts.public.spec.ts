import { expect, test } from '@playwright/test';

// AC-09: anonymous en `/` ve el header público (marca, navegación de la landing, acciones de
// entrada) y el footer. El header dejó de ser una fila plana de enlaces al alinear la home con
// la screen Stitch «EventFlow - Inicio»: las anclas apuntan a secciones de la propia página y
// las acciones dependen de la sesión, resuelta en el servidor.
test('public layout muestra header con acciones anónimas y footer', async ({ page }) => {
  await page.goto('/');

  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'EventFlow, go home' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Create account' }).first()).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('la landing se sirve renderizada con un único h1 y las secciones ancladas', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('h1')).toHaveCount(1);
  for (const id of ['how-it-works', 'features', 'for-vendors']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('las anclas del header llevan a su sección', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('banner').getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.locator('#how-it-works')).toBeInViewport();
});

// El header vive también en `/vendors`. Con anclas relativas el destino sería
// `/vendors#features` —inexistente— y el visitante se quedaba encerrado en el directorio.
test('desde el directorio, el menú vuelve a la landing y aterriza en la sección', async ({
  page,
}) => {
  await page.goto('/vendors');

  await page.getByRole('banner').getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.locator('#features')).toBeInViewport();
});

test('el desplazamiento entre secciones es suave y respeta prefers-reduced-motion', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'smooth');

  await page.getByRole('banner').getByRole('link', { name: 'For vendors' }).click();
  await expect(page.locator('#for-vendors')).toBeInViewport();
});

test('con movimiento reducido el salto es inmediato', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');

  await context.close();
});

test('la navegación mobile abre, cierra con Escape y devuelve el foco al trigger', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Open menu' });
  await trigger.click();

  // Se asserta sobre el panel, no sobre la raíz del `Dialog`: esa raíz es un contenedor
  // `position: relative` de tamaño cero (el contenido va `fixed`), y Playwright la considera
  // oculta aunque el drawer se vea.
  const panel = page.locator('#public-mobile-nav');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Features' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

// El contenido principal no puede depender de JavaScript: es una superficie SEO.
test('la home conserva su contenido con JavaScript deshabilitado', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('#features')).toBeVisible();
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Create account' }).first(),
  ).toBeVisible();

  await context.close();
});

// El directorio dejó de ser un placeholder: sirve datos reales de `GET /public/vendors` y debe
// ser utilizable por un visitante anónimo (es el destino del CTA «Explorar proveedores»).
//
// El job de E2E no levanta backend ni base de datos, así que el listado sólo puede comprobarse
// cuando hay API detrás **y** proveedores aprobados en ella. Lo que NO depende de los datos —que
// la página exista, se renderice en servidor y ya no diga «Próximamente»— se verifica siempre;
// lo que sí depende se salta de forma explícita, para que un entorno sin datos no produzca un
// verde engañoso.
//
// La condición es «no hay ninguna tarjeta», no «hay un error»: sin backend la página muestra un
// aviso de error, pero con backend y base vacía muestra el estado vacío, y ninguno de los dos
// permite afirmar nada sobre el listado.
async function skipWithoutVendors(page: import('@playwright/test').Page): Promise<void> {
  const rendered = await page.locator('ul[aria-label] > li').count();
  test.skip(rendered === 0, 'requiere el backend con al menos un proveedor aprobado en la BD');
}

test('el directorio público se sirve renderizado y sin placeholder', async ({ page }) => {
  await page.goto('/vendors');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Coming soon')).toHaveCount(0);
  await expect(page.getByText('Próximamente')).toHaveCount(0);
  // El formulario de filtros no depende de la respuesta del API.
  await expect(page.getByRole('form')).toBeVisible();
});

test('el directorio lista proveedores sin requerir sesión', async ({ page }) => {
  await page.goto('/vendors');
  await skipWithoutVendors(page);

  // El listado viaja en el HTML inicial (superficie SEO).
  await expect(page.locator('ul[aria-label] > li').first()).toBeVisible();
});

test('el directorio funciona sin JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/vendors');
  await skipWithoutVendors(page);

  await expect(page.locator('ul[aria-label] > li').first()).toBeVisible();
  await context.close();
});

test('cada proveedor enlaza a su perfil público', async ({ page }) => {
  await page.goto('/vendors');
  await skipWithoutVendors(page);

  const firstProfileLink = page.locator('a[href^="/vendors/"]').first();
  await expect(firstProfileLink).toBeVisible();
  await firstProfileLink.click();
  await expect(page).toHaveURL(/\/vendors\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

// El apoyo visual del hero es un carrusel de cinco tipos de evento. Se comprueba contra la app
// real porque lo que importa aquí —que la imagen se sirva optimizada y que el layout no salte al
// cambiar de diapositiva— no se puede observar en jsdom.
test('el carrusel del hero arranca en la boda y sirve imágenes optimizadas', async ({ page }) => {
  await page.goto('/');

  const carousel = page.getByTestId('hero-carousel');
  await expect(carousel).toBeVisible();
  await expect(page.getByTestId('hero-carousel-slide-wedding')).toHaveAttribute(
    'aria-hidden',
    'false',
  );

  // Los originales pesan varios MB: si esto deja de pasar por el optimizador, la home se vuelve
  // inusable en conexiones lentas.
  const src = await carousel.locator('img').first().getAttribute('src');
  expect(src).toContain('/_next/image');
});

test('la paginación cambia imagen y tarjeta a la vez, sin mover el layout', async ({ page }) => {
  await page.goto('/');

  const carousel = page.getByTestId('hero-carousel');
  await carousel.scrollIntoViewIfNeeded();
  const before = await carousel.boundingBox();

  await page.getByTestId('hero-carousel-dot-corporate').click();

  await expect(page.getByTestId('hero-carousel-slide-corporate')).toHaveAttribute(
    'aria-hidden',
    'false',
  );
  await expect(page.getByTestId('hero-carousel-card')).toContainText('Better coordinated vendors');

  const after = await carousel.boundingBox();
  expect(Math.round(after!.height)).toBe(Math.round(before!.height));
  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
});

test('el carrusel avanza solo y se detiene al pasar el puntero', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('hero-carousel').scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);

  await expect(page.getByTestId('hero-carousel-slide-celebration')).toHaveAttribute(
    'aria-hidden',
    'false',
    { timeout: 9000 },
  );

  await page.getByTestId('hero-carousel').hover();
  const paused = await page
    .locator('[data-testid^="hero-carousel-slide-"][aria-hidden="false"]')
    .getAttribute('data-testid');
  await page.waitForTimeout(6500);
  await expect(
    page.locator('[data-testid^="hero-carousel-slide-"][aria-hidden="false"]'),
  ).toHaveAttribute('data-testid', paused!);
});

test('con movimiento reducido el carrusel no avanza solo', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByTestId('hero-carousel').scrollIntoViewIfNeeded();

  await page.waitForTimeout(6500);
  await expect(page.getByTestId('hero-carousel-slide-wedding')).toHaveAttribute(
    'aria-hidden',
    'false',
  );
  // Sin avance automático no hay nada que pausar: el control desaparece.
  await expect(page.getByTestId('hero-carousel-toggle')).toHaveCount(0);

  await context.close();
});

test('el carrusel no provoca desbordamiento horizontal en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
