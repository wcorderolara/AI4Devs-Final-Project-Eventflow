// US-146 · PB-P3-007 · QA-003..007 + AI-001 + OBS-001
// Smoke de los flujos críticos de la demo contra la URL pública Demo real (frontend Amplify +
// backend App Runner). NO usa mocks de frontend (AC-01): ejerce la app desplegada de extremo a
// extremo con un usuario sembrado cuyas credenciales llegan por secretos (VR-02).
//
// Flujos (AC-02): (1) login (TS-01), (2) listado de eventos (TS-02), (3) generación IA con Mock
// determinista (TS-03), (4) comparador de cotizaciones (TS-04). El precheck `GET /health` (VR-04)
// y la validación de config (VR-01/VR-02) viven en `global-setup.ts`.
//
// Determinismo del paso de IA (AC-03): el entorno Demo debe operar con IA en modo Mock
// (`LLM_PROVIDER=mock` / `AI_USE_MOCK_FALLBACK=true` — runbook US-144). El frontend nunca llama
// directo al LLM (docs/20 §6.5); el smoke solo verifica que la recomendación se renderiza.
//
// Sin configuración `DEMO_SMOKE_*` la suite hace `test.skip` limpio (dev local / PR normal): no
// produce falso verde ni falso rojo. Se ejecuta con secretos en `smoke.yml` post-deploy.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { resolveDemoSmokeConfig } from './demo-smoke-config';

const resolution = resolveDemoSmokeConfig(process.env);
const config = resolution.config;

// Identificador de correlación de la corrida (OBS-001): permite cruzar el smoke con los logs del
// backend en CloudWatch. Estable por corrida; sin secretos ni PII.
const runId = process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? 'local';
const CORRELATION_ID = `e2e-demo-smoke-${runId}`;

test.describe.serial('US-146 · smoke de flujos críticos contra la Demo URL', () => {
  // Se salta limpiamente si no hay configuración (globalSetup ya avisó por consola).
  test.skip(!config, 'DEMO_SMOKE_* no configurado — el smoke real-URL corre en smoke.yml (post-deploy).');
  test.use({ locale: 'es-419' });

  let context: BrowserContext;
  let page: Page;
  /** Ruta del primer evento sembrado descubierta por UI (evita IDs hardcodeados frágiles). */
  let eventPath: string | undefined;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      baseURL: config!.baseUrl,
      locale: 'es-419',
      // OBS-001: propaga el correlationId a cada request del backend (trazabilidad sin secretos).
      extraHTTPHeaders: { 'x-correlation-id': CORRELATION_ID },
    });
    page = await context.newPage();
    // eslint-disable-next-line no-console
    console.log(`[demo-smoke] Inicio de corrida · correlationId=${CORRELATION_ID}`);
  });

  test.afterAll(async () => {
    await context?.close();
    // eslint-disable-next-line no-console
    console.log(`[demo-smoke] Fin de corrida · correlationId=${CORRELATION_ID}`);
  });

  // TS-01 (AC-02 · SEC-01): login con usuario sembrado usando el flujo real (cookies HTTP-only).
  test('TS-01 · login con usuario sembrado redirige al dashboard', async () => {
    const response = await page.goto('/login');
    expect(response?.status(), 'la página de login debe responder 200').toBe(200);

    await page.getByLabel('Correo electrónico').fill(config!.organizerEmail);
    await page.getByLabel('Contraseña', { exact: true }).fill(config!.organizerPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // El role-guard del organizer aterriza en `/organizer` tras autenticación válida.
    await page.waitForURL('**/organizer**', { timeout: 30_000 });
    await expect(page.getByRole('main')).toBeVisible();
  });

  // TS-02 (AC-02): el listado de eventos sembrados es visible; captura la ruta del primer evento.
  test('TS-02 · listado de eventos visible tras login', async () => {
    await page.goto('/organizer');
    await expect(page.getByRole('main')).toBeVisible();

    // Descubre el primer enlace a un evento (patrón `/organizer/events/<id>`), sin IDs hardcodeados.
    const eventLink = page.locator('a[href*="/organizer/events/"]').first();
    await expect(
      eventLink,
      'no hay eventos sembrados visibles — ejecuta el reset del entorno Demo (US-140) y reintenta (EC-02/NT-03)',
    ).toBeVisible({ timeout: 20_000 });

    const href = await eventLink.getAttribute('href');
    expect(href, 'el enlace de evento debe tener href').toBeTruthy();
    // Normaliza a `/organizer/events/<id>` (recorta subrutas si el href apuntara más profundo).
    const match = href!.match(/\/organizer\/events\/[^/?#]+/);
    eventPath = match ? match[0] : href!;
  });

  // TS-03 (AC-02 · AC-03): el paso de generación IA (Mock determinista) retorna una recomendación.
  test('TS-03 · generación IA con Mock retorna una recomendación revisable', async () => {
    test.skip(!eventPath, 'sin evento sembrado descubierto en TS-02');
    await page.goto(`${eventPath}/ai/plan`);
    await expect(page.getByRole('main').first()).toBeVisible();

    // La recomendación se renderiza (heading de la vista de plan IA). El determinismo lo garantiza
    // el modo Mock del backend (precondición AI-001); el smoke verifica que el flujo responde.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
  });

  // TS-04 (AC-02): el comparador renderiza cotizaciones sembradas.
  test('TS-04 · comparador de cotizaciones renderiza cotizaciones sembradas', async () => {
    test.skip(!eventPath, 'sin evento sembrado descubierto en TS-02');
    await page.goto(`${eventPath}/quotes/compare`);
    await expect(
      page.getByRole('main').first(),
      'el comparador no renderizó — verifica cotizaciones sembradas o ejecuta el reset (US-140)',
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
