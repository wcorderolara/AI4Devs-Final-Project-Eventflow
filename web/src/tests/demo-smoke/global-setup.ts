// US-146 · PB-P3-007 · QA-002 (precheck) + AI-001 (precondición) + OBS-001 (trazabilidad)
// Global setup del smoke real-URL:
//   1. Resuelve/valida la config (VR-01/VR-02). Sin config → skip limpio (dev local / PR normal).
//      Config presente pero inválida/incompleta → fail-fast (NT-02), sin falso verde.
//   2. Precheck `GET /health = 200` contra el backend Demo (VR-04 / EC-01 / NT-01). Si no responde
//      200, aborta ANTES de los flujos con un mensaje accionable (entorno no disponible → reset US-140).
// No emite secretos ni PII (SEC-03): las URLs se redactan a `protocol//host`.
import { request, type FullConfig } from '@playwright/test';
import { resolveDemoSmokeConfig, redactUrl } from './demo-smoke-config';

/** Timeout duro del precheck (evita cuelgues si el entorno público está caído). */
const HEALTH_TIMEOUT_MS = 15_000;

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const resolution = resolveDemoSmokeConfig(process.env);

  if (!resolution.configured) {
    // No configurado: los specs harán `test.skip(...)`. No es un fallo (instrucción: no forzar).
    console.warn(
      `[demo-smoke] Omitido: faltan variables ${resolution.missing.join(', ')}. ` +
        `El smoke real-URL se ejecuta con secretos en 'smoke.yml' post-deploy o localmente exportando DEMO_SMOKE_*.`,
    );
    return;
  }

  if (resolution.error || !resolution.config) {
    // Configurado a medias/ inválido → fail-fast (NT-02, VR-01/VR-02), sin falso verde.
    throw new Error(`[demo-smoke] Configuración inválida — ${resolution.error}`);
  }

  const { apiUrl, baseUrl } = resolution.config;

  // VR-04 / EC-01 / NT-01 — precheck de disponibilidad del backend antes de los flujos.
  const ctx = await request.newContext({ baseURL: apiUrl });
  let status = 0;
  let networkError: string | undefined;
  try {
    const response = await ctx.get('/health', { timeout: HEALTH_TIMEOUT_MS });
    status = response.status();
  } catch (err) {
    networkError = err instanceof Error ? err.message : String(err);
  } finally {
    await ctx.dispose();
  }

  if (status !== 200) {
    const detail = networkError ? `error de red: ${networkError}` : `respondió ${status} (esperado 200)`;
    throw new Error(
      `[demo-smoke] Entorno Demo no disponible (fail-fast, EC-01): GET /health en ${redactUrl(apiUrl)} ${detail}. ` +
        `Verifica el deploy del backend o ejecuta el reset del entorno Demo (US-140) y reintenta.`,
    );
  }

  console.log(
    `[demo-smoke] Precheck OK: GET /health = 200 en ${redactUrl(apiUrl)}. ` +
      `Frontend Demo: ${redactUrl(baseUrl)}. Iniciando flujos críticos…`,
  );
}
