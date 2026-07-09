// Redacción de datos sensibles en logs (US-108 / SEC-002). AC-07; SEC-07; §12 Sensitive Data Handling.
// Recorre en profundidad estructuras de log y reemplaza el VALOR de claves sensibles por
// `[REDACTED]`. Cubre `cookie`, `set-cookie`, `authorization`, `sid`, `jti`, cualquier `*secret`
// (SESSION_SECRET, COOKIE_SECRET, CAPTCHA_SECRET…), `*token` (session/reset/captcha…) y `*password`.
// Nunca muta la entrada: devuelve una copia redactada. Es defensivo/centralizado — el logger lo
// aplica a todo lo que se emite, de modo que ningún módulo pueda filtrar secretos por accidente.

export const REDACTED = '[REDACTED]';

/** Profundidad máxima de recorrido (evita coste en payloads anidados anómalos). */
const MAX_DEPTH = 8;

/**
 * ¿La clave transporta un secreto/credencial? Normaliza separadores (`-`, `_`, `.`) y compara.
 * Reglas: claves exactas (cookie, set-cookie, authorization, sid, jti, passwordHash) o que
 * CONTENGAN `secret` / `token` / `password` (sessionSecret, RECAPTCHA_SECRET_KEY, captchaToken,
 * newPassword…). Se usa `includes` (no `endsWith`) para cubrir sufijos como `_SECRET_KEY` (US-109).
 */
export function isSensitiveKey(key: string): boolean {
  const n = key.toLowerCase().replace(/[-_.]/g, '');
  if (['cookie', 'setcookie', 'authorization', 'sid', 'jti', 'passwordhash'].includes(n)) {
    return true;
  }
  return n.includes('secret') || n.includes('token') || n.includes('password');
}

/**
 * Devuelve una copia de `value` con los valores de claves sensibles redactados. Objetos, arrays y
 * primitivos se preservan estructuralmente; referencias circulares y exceso de profundidad se
 * cortan de forma segura.
 */
export function redact<T>(value: T): T {
  return redactInternal(value, 0, new WeakSet<object>()) as T;
}

function redactInternal(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, depth + 1, seen));
  }

  // Error: se preserva mensaje/stack como strings (no sensibles); no se enumeran props internas.
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactInternal(val, depth + 1, seen);
  }
  return out;
}
