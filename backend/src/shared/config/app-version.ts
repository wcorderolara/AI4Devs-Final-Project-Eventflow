// US-116 (PB-P2-013 / BE-001). Resolución de la versión de aplicación reportada
// por `GET /health` (AC-08). Precedencia:
//   1. `process.env.APP_VERSION` (trim; string no vacío).
//   2. `package.json.version` (import estático con `with { type: 'json' }` —
//      Node 22 nativo, sin `fs.readFileSync` en runtime).
//   3. Sentinel `'unknown'` (EC-04) — `APP_VERSION` y `package.json` indispon.
//
// Se cachea en memoria: `getAppVersion()` es puro tras la primera invocación
// (evita re-evaluar `process.env` en cada request de `/health`). El cache es
// invalidable sólo por reload del módulo — deseable para observabilidad estable.
//
// Nota: la versión del logger (`SERVICE_VERSION` en `shared/infrastructure/logger/service-version.ts`)
// resuelve una precedencia distinta (env `SERVICE_VERSION`, no `APP_VERSION`) y sirve
// otro propósito (mixin de cada log line). Se mantienen separadas por bounded context.
import pkg from '../../../package.json' with { type: 'json' };

/** Sentinel devuelto cuando ni env ni package.json aportan versión (EC-04). */
export const UNKNOWN_VERSION = 'unknown';

let cached: string | null = null;

/** Reinicia el cache — expuesto sólo para tests. No usar en runtime. */
export function __resetAppVersionCache(): void {
  cached = null;
}

export function getAppVersion(): string {
  if (cached !== null) return cached;

  const envVersion = process.env.APP_VERSION?.trim();
  if (envVersion && envVersion.length > 0) {
    cached = envVersion;
    return cached;
  }

  const pkgVersion = (pkg as { version?: unknown }).version;
  if (typeof pkgVersion === 'string' && pkgVersion.length > 0) {
    cached = pkgVersion;
    return cached;
  }

  cached = UNKNOWN_VERSION;
  return cached;
}
