// Shared kernel — logger stub (US-090 / BE-004; US-108 / SEC-002). Doc 14 §7.1.
// Placeholder sobre `console`. El logger estructurado (JSON, correlationId, niveles) es
// responsabilidad de PB-P0-003 / US-091.
// Redacción central (US-108 / AC-07, SEC-07): TODO argumento se pasa por `redact()` antes de
// emitirse, de modo que ninguna clave sensible (cookie, set-cookie, authorization, sid, jti,
// *secret, *token, *password) pueda filtrarse a stdout aunque un módulo la incluya por error.
import { redact } from './redact.js';

function scrub(args: unknown[]): unknown[] {
  return args.map((arg) => redact(arg));
}

export const logger = {
  info: (...args: unknown[]): void => console.info(...scrub(args)),
  warn: (...args: unknown[]): void => console.warn(...scrub(args)),
  error: (...args: unknown[]): void => console.error(...scrub(args)),
  debug: (...args: unknown[]): void => console.debug(...scrub(args)),
};
