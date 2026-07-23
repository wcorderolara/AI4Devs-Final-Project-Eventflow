// US-113 (PB-P2-010 / BE-003). Redactores por conjuntos fijos declarados por
// el Tech Spec §7 D3 + SEC-01..SEC-04 de la User Story. NO reemplazan al
// heurístico `redact()` existente (usado por el stub console-based legacy);
// ambos coexisten (Deviation D-05 del execution record).
//
// Contrato:
//   * `redactSecrets(obj)`  — reemplaza VALORES de las claves de SECRET_KEYS
//     (12 campos) por `[REDACTED]`. Case-insensitive. Aplica SIEMPRE — no
//     depende de `NODE_ENV` (AC-03).
//   * `redactPII(obj, env, includePII)` — reemplaza VALORES de las claves de
//     PII_KEYS (7 campos) por `[REDACTED]`. En `NODE_ENV=development` +
//     `LOG_INCLUDE_PII=true` NO redacta (para debug local). En cualquier otro
//     env, redacta (AC-04, SEC-02).
//   * `redactHeaders(headers)` — reemplaza VALORES de los headers HTTP
//     sensibles (5 headers) por `[REDACTED]`. Aplica SIEMPRE — independiente
//     del `NODE_ENV` (AC-07, SEC-03).
//
// Semántica de profundidad (SEC-04):
//   * Recursivo hasta `MAX_DEPTH = 5`. Excedido → se preserva el subárbol tal
//     cual (evita loops sin descartar información legítima poco profunda).
//
// El logger de Pino invoca `redactSecrets` + `redactPII` en su `formatters.log`
// (BE-004). El middleware `request-logger` invoca `redactHeaders` sobre
// `req.headers` antes de pasarlos al context del log line.

/** Conjunto fijo de claves de secretos (D3 · SEC-01) — case-insensitive. */
export const SECRET_KEYS: ReadonlySet<string> = new Set([
  'password',
  'pwd',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'session',
  'refresh_token',
  'access_token',
  'jwt',
  'bearer',
]);

/** Conjunto fijo de claves de PII (D3 · SEC-02) — case-insensitive. */
export const PII_KEYS: ReadonlySet<string> = new Set([
  'email',
  'phone',
  'phonenumber',
  'taxid',
  'address',
  'ip',
  'ipaddress',
]);

/** Conjunto fijo de headers HTTP sensibles (D3 · SEC-03) — case-insensitive. */
export const HEADER_KEYS: ReadonlySet<string> = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-session-token',
]);

/** Profundidad máxima de recursión (SEC-04). */
const MAX_DEPTH = 5;

/** Marcador emitido en lugar del valor sensible. */
export const REDACTED = '[REDACTED]';

/** Marcador emitido cuando el serializer detecta una referencia circular (EC-04). */
export const CIRCULAR = '[CIRCULAR]';

type Env = 'development' | 'test' | 'production';

/**
 * Redacta VALORES de claves listadas en SECRET_KEYS. Case-insensitive.
 * Aplica siempre (no depende de env).
 */
export function redactSecrets(input: unknown): unknown {
  return redactByKeys(input, SECRET_KEYS, 0, new WeakSet());
}

/**
 * Redacta VALORES de claves listadas en PII_KEYS. En `development` +
 * `includePII=true` retorna el input SIN redactar (para debug local — VR-03).
 * En cualquier otro caso, redacta.
 */
export function redactPII(
  input: unknown,
  env: Env,
  includePII: boolean,
): unknown {
  if (env === 'development' && includePII) return input;
  return redactByKeys(input, PII_KEYS, 0, new WeakSet());
}

/**
 * Redacta VALORES de headers HTTP listados en HEADER_KEYS. Case-insensitive.
 * Aplica SIEMPRE — independiente del env (SEC-03). Retorna una copia; nunca
 * muta el objeto original.
 *
 * Acepta el shape lax de `req.headers` de Express (`Record<string, string |
 * string[] | undefined>`).
 */
export function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = HEADER_KEYS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

function redactByKeys(
  value: unknown,
  keys: ReadonlySet<string>,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth > MAX_DEPTH) return value; // preserva subárbol; no descarta datos legítimos.
  if (seen.has(value as object)) return CIRCULAR;
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.map((item) => redactByKeys(item, keys, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (keys.has(key.toLowerCase())) {
      out[key] = REDACTED;
    } else {
      out[key] = redactByKeys(val, keys, depth + 1, seen);
    }
  }
  return out;
}
