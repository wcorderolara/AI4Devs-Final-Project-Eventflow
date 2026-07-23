// US-113 (PB-P2-010 / BE-001 / D-04). Helper de resolución de `SERVICE_VERSION`
// para el logger Pino. Prioridad:
//   1. `env.SERVICE_VERSION` (env var explícita del operador).
//   2. `package.json.version` del backend (import estático con `with { type:
//      'json' }` — soportado por Node 22 nativamente, sin `fs.readFileSync`).
//   3. Fallback `'0.0.0'` (versión centinela — implica misconfiguración; el env
//      guard debería haber fallado antes, pero se mantiene defensivo).
//
// El import estático se resuelve al momento del bundle/carga del módulo — cero
// costo runtime tras la primera resolución.
import { config } from '../../../config/env.js';
import pkg from '../../../../package.json' with { type: 'json' };

/** Sentinel devuelto si ni env ni package.json aportan versión. */
export const FALLBACK_VERSION = '0.0.0';

export function resolveServiceVersion(): string {
  if (config.SERVICE_VERSION && config.SERVICE_VERSION.length > 0) {
    return config.SERVICE_VERSION;
  }
  const pkgVersion = (pkg as { version?: unknown }).version;
  if (typeof pkgVersion === 'string' && pkgVersion.length > 0) {
    return pkgVersion;
  }
  return FALLBACK_VERSION;
}
