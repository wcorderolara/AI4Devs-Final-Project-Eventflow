// Sanitizer/minimizador de `inputPayload` para persistencia (US-122 / BE-004, SEC-001, AC-06).
// Minimiza y redacta antes de persistir: remueve claves sensibles (secrets, tokens, cookies, API
// keys, credenciales, PII de contacto innecesaria) a cualquier profundidad, y acota el tamaño para
// no persistir full domain objects. No es un DLP empresarial: es una allowlist/denylist pragmática
// y testeable. Complementa el sanitizer previo a provider de US-097 (que actúa antes de generar).
import { AIRecommendationUnsafePayloadError } from '../domain/errors/ai-recommendation-persistence.errors.js';

/** Claves sensibles (case-insensitive, match por substring) removidas a cualquier profundidad. */
const SENSITIVE_KEY_PATTERNS: readonly string[] = [
  'password', 'passwd', 'secret', 'token', 'apikey', 'api_key', 'accesskey', 'authorization',
  'cookie', 'setcookie', 'sessionid', 'session_id', 'sid', 'jti', 'jwt', 'bearer',
  'creditcard', 'credit_card', 'cardnumber', 'cvv', 'ssn', 'fiscalid', 'fiscal_id', 'taxid', 'tax_id',
  'email', 'phone', 'mobile', 'address', 'privatenote', 'private_note',
];

/** Profundidad máxima de anidamiento persistido (minimización / anti full-domain-object). */
const MAX_DEPTH = 6;
/** Máximo de entradas por objeto/array persistido (evita snapshots gigantes). */
const MAX_ENTRIES = 100;

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return undefined; // poda anidamiento excesivo (minimización)

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ENTRIES).map((v) => sanitizeValue(v, depth + 1)).filter((v) => v !== undefined);
  }

  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_ENTRIES) break;
    if (isSensitiveKey(k)) continue; // redacción: se omite por completo
    const sanitized = sanitizeValue(v, depth + 1);
    if (sanitized !== undefined) {
      out[k] = sanitized;
      count += 1;
    }
  }
  return out;
}

/**
 * Sanitiza/minimiza el `inputPayload`. Devuelve un objeto seguro para persistir. Lanza
 * `AIRecommendationUnsafePayloadError` si el input no es un objeto plano sanitizable.
 */
export function sanitizeInputPayload(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AIRecommendationUnsafePayloadError('inputPayload must be a plain object');
  }
  return sanitizeValue(payload, 0) as Record<string, unknown>;
}

/** Expuesto para tests: indica si una clave sería redactada. */
export function isSensitivePayloadKey(key: string): boolean {
  return isSensitiveKey(key);
}
