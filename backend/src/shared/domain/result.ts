// Shared kernel — tipo Result para operaciones falibles sin excepciones (US-090 / BE-001).
// Doc 14 §7.1. No es para errores de infraestructura (esos usan try/catch); es para el flujo
// de dominio/aplicación donde el fallo es un valor esperado y tipado.

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
