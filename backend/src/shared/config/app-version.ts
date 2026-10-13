// Versión única de la aplicación (US-116 / AC-08 + US-113 / D-04): la reportan `GET /health`,
// `/health/ready` y el campo `version` de cada línea de log. Precedencia:
//   1. `APP_VERSION` (trim; no vacío) — variable de US-116 para CI/CD.
//   2. `SERVICE_VERSION` (trim; no vacío) — alias heredado del logger (US-113).
//   3. `package.json.version` — es lo que se usa hoy en EC2, donde ninguna de las dos se define.
//   4. Sentinel `'unknown'` (EC-04).
//
// Se cachea en memoria tras la primera invocación (versión estable durante la vida del proceso).
import pkg from '../../../package.json' with { type: 'json' };

export const UNKNOWN_VERSION = 'unknown';

let cached: string | null = null;

/** Reinicia el cache — expuesto sólo para tests. No usar en runtime. */
export function __resetAppVersionCache(): void {
  cached = null;
}

export function getAppVersion(): string {
  if (cached !== null) return cached;

  const pkgVersion = (pkg as { version?: unknown }).version;
  const candidates = [process.env.APP_VERSION, process.env.SERVICE_VERSION, pkgVersion];
  const resolved = candidates.find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  cached = resolved?.trim() ?? UNKNOWN_VERSION;
  return cached;
}
