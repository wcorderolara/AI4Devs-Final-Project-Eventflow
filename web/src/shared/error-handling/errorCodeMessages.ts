// Mapeo de códigos de error de la API a claves i18n. Cada componente declara su catálogo de
// códigos conocidos; cualquier otro código (o un error sin `code`) cae en `UNEXPECTED`.

export const UNEXPECTED_ERROR_CODE = 'UNEXPECTED';

/** `true` si `code` pertenece al catálogo `known`. */
export function isKnownErrorCode<C extends string>(code: unknown, known: readonly C[]): code is C {
  return typeof code === 'string' && (known as readonly string[]).includes(code);
}

/** Código del error (cualquier objeto con `code`, p. ej. `ApiError`) si es conocido; si no, `UNEXPECTED`. */
export function resolveErrorCode<C extends string>(
  err: unknown,
  known: readonly C[],
): C | typeof UNEXPECTED_ERROR_CODE {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (isKnownErrorCode(code, known)) return code;
  }
  return UNEXPECTED_ERROR_CODE;
}

/** Clave i18n `errors.<code>` del error, con `errors.UNEXPECTED` como fallback. */
export function resolveErrorMessageKey(err: unknown, known: readonly string[]): string {
  return `errors.${resolveErrorCode(err, known)}`;
}
