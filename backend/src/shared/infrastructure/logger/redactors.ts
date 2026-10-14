// Redactor único de logs (US-108 / SEC-002 + US-113 / PB-P2-010 D3). El logger lo aplica en
// `formatters.log` sobre CADA línea emitida, de modo que ningún módulo pueda filtrar secretos
// aunque los incluya por error. Nunca muta la entrada: devuelve una copia.
//
//   * `redactSecrets(obj)` — siempre, sin depender de `NODE_ENV` (AC-03, SEC-07). Ver `isSensitiveKey`.
//   * `redactPII(obj, env, includePII)` — PII_KEYS; sólo se omite en development + LOG_INCLUDE_PII.
//   * `redactHeaders(headers)` — headers HTTP sensibles, primer nivel (AC-07, SEC-03).
//
// Recorrido hasta MAX_DEPTH; más profundo se trunca (nunca se emite un subárbol sin redactar).
// Los `Error` se serializan como `{ name, message, stack }`.

/** Claves de secretos exactas (comparación normalizada: minúsculas y sin `-`, `_`, `.`). */
export const SECRET_KEYS: ReadonlySet<string> = new Set([
  'password',
  'pwd',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
  'session',
  'sid',
  'jti',
  'refresh_token',
  'access_token',
  'jwt',
  'bearer',
]);

/** Toda clave que CONTENGA alguno de estos fragmentos es secreta (SESSION_SECRET, captchaToken, newPassword…). */
const SECRET_FRAGMENTS = ['secret', 'token', 'password'] as const;

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

const MAX_DEPTH = 8;

export const REDACTED = '[REDACTED]';
export const CIRCULAR = '[CIRCULAR]';
export const TRUNCATED = '[TRUNCATED]';

type Env = 'development' | 'test' | 'production';

const normalize = (key: string): string => key.toLowerCase().replace(/[-_.]/g, '');
const NORMALIZED_SECRET_KEYS: ReadonlySet<string> = new Set([...SECRET_KEYS].map(normalize));

/** ¿La clave transporta un secreto/credencial? */
export function isSensitiveKey(key: string): boolean {
  const n = normalize(key);
  return NORMALIZED_SECRET_KEYS.has(n) || SECRET_FRAGMENTS.some((f) => n.includes(f));
}

const isPIIKey = (key: string): boolean => PII_KEYS.has(key.toLowerCase());

export function redactSecrets(input: unknown): unknown {
  return redactWhere(input, isSensitiveKey, 0, new WeakSet());
}

/** En `development` + `includePII=true` no redacta (debug local — VR-03). */
export function redactPII(input: unknown, env: Env, includePII: boolean): unknown {
  if (env === 'development' && includePII) return input;
  return redactWhere(input, isPIIKey, 0, new WeakSet());
}

/** Acepta el shape laxo de `req.headers` de Express. */
export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = HEADER_KEYS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

function redactWhere(
  value: unknown,
  isRedacted: (key: string) => boolean,
  depth: number,
  ancestors: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return TRUNCATED;
  if (ancestors.has(value)) return CIRCULAR;
  if (value instanceof Date) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  ancestors.add(value);
  let out: unknown;
  if (Array.isArray(value)) {
    out = value.map((item) => redactWhere(item, isRedacted, depth + 1, ancestors));
  } else {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      obj[key] = isRedacted(key) ? REDACTED : redactWhere(val, isRedacted, depth + 1, ancestors);
    }
    out = obj;
  }
  // Sólo los ancestros cuentan como ciclo: una misma referencia en dos ramas hermanas se emite.
  ancestors.delete(value);
  return out;
}
