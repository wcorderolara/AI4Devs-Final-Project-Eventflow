// Helpers de composición de rutas (US-111 / BE-003). ADR-SEC-003; AC-02/AC-03/AC-07.
// Fuerzan POR CONSTRUCCIÓN el orden seguro de middlewares, de modo que una ruta no pueda ejecutar
// el handler antes de auth/role/ownership/policy/anti-abuse/validation. El orden de las CLAVES del
// spec es irrelevante: el helper siempre emite en el orden canónico. Reduce el riesgo de composición
// ad hoc insegura al agregar rutas nuevas (Tech Spec §7.2). No cambia contratos funcionales.
import type { RequestHandler } from 'express';

/** Normaliza un slot opcional (handler único o arreglo) a lista. */
function slot(m: RequestHandler | RequestHandler[] | undefined): RequestHandler[] {
  if (!m) return [];
  return Array.isArray(m) ? m : [m];
}

export interface ProtectedRouteSpec {
  /** Autenticación (obligatoria). Siempre primero. */
  auth: RequestHandler;
  /** Autorización por rol. Requiere identidad autenticada previa. */
  role?: RequestHandler;
  /** Ownership/assignment. Requiere identidad + rol previos. */
  ownership?: RequestHandler | RequestHandler[];
  /** Policy checks de dominio. Requiere identidad/rol/contexto de acceso. */
  policy?: RequestHandler | RequestHandler[];
  /** Anti-abuse (rate limit) por usuario, tras auth/role. */
  rateLimit?: RequestHandler;
  /** Validación de payload. NUNCA antes de auth/authorization (no filtra schema a anónimos). */
  validation?: RequestHandler;
  /** Handler final. Siempre último. */
  handler: RequestHandler;
}

/**
 * Orden canónico protegido (SEC-12.2):
 * `auth → role → ownership → policy → rateLimit → validation → handler`.
 */
export function composeProtectedRoute(spec: ProtectedRouteSpec): RequestHandler[] {
  return [
    spec.auth,
    ...slot(spec.role),
    ...slot(spec.ownership),
    ...slot(spec.policy),
    ...slot(spec.rateLimit),
    ...slot(spec.validation),
    spec.handler,
  ];
}

export interface PublicSensitiveRouteSpec {
  /** Rate limit anti-abuse (US-110), primero. */
  rateLimit?: RequestHandler;
  /** Verificación de captcha (US-109). */
  captcha?: RequestHandler;
  /** Validación de payload. */
  validation?: RequestHandler;
  /** Handler final. Siempre último. */
  handler: RequestHandler;
}

/**
 * Orden canónico de ruta pública sensible (AC-03):
 * `rateLimit → captcha → validation → handler`. Sin `authMiddleware` (rutas anónimas por diseño).
 */
export function composePublicSensitiveRoute(spec: PublicSensitiveRouteSpec): RequestHandler[] {
  return [
    ...slot(spec.rateLimit),
    ...slot(spec.captcha),
    ...slot(spec.validation),
    spec.handler,
  ];
}
