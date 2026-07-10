import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ROLE, COOKIE_SESSION, isRole, type Role } from './types';

/**
 * `roleGuardMiddleware` — guarda UX de routing por rol (ADR-FE-003/015). **No es un security
 * boundary**: el backend (US-094..097, US-112) valida cada request. NO decodifica JWT ni valida
 * firma; solo lee la **presencia** de `eventflow_session` y el **valor whitelisted** de
 * `eventflow_role`. Función pura Edge-compatible (solo Web APIs). Retorna `NextResponse` (redirect)
 * o `null` (pass-through, para composición con `localeMiddleware`).
 *
 * Aplica las 13 reglas de AC-02 de la historia.
 */
export function roleGuardMiddleware(req: NextRequest): NextResponse | null {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE_SESSION)?.value);
  const roleValue = req.cookies.get(COOKIE_ROLE)?.value;
  const role: Role | null = isRole(roleValue) ? roleValue : null;

  // (public): '/', '/vendors', '/vendors/*', '/403' → pass-through.
  if (pathname === '/' || isUnder(pathname, '/vendors') || isUnder(pathname, '/403')) {
    return null;
  }

  // (auth): '/login', '/register', '/forgot-password'.
  if (
    isUnder(pathname, '/login') ||
    isUnder(pathname, '/register') ||
    isUnder(pathname, '/forgot-password')
  ) {
    // Con sesión + rol válido → redirige al dashboard del rol (evita ver login logueado).
    if (hasSession && role) {
      return redirectTo(req, `/${role}`, 'auth-with-session');
    }
    return null;
  }

  // (admin): '/admin', '/admin/*'.
  if (isUnder(pathname, '/admin')) {
    if (!hasSession) return redirectToLogin(req, pathname, search);
    if (role !== 'admin') return redirectTo(req, '/403', 'admin-wrong-role');
    return null;
  }

  // (app): '/organizer*', '/vendor*'.
  if (isUnder(pathname, '/organizer') || isUnder(pathname, '/vendor')) {
    if (!hasSession) return redirectToLogin(req, pathname, search);
    return null; // Cualquier rol con sesión → pass-through (el backend filtra datos).
  }

  // Cualquier otra ruta (404 la maneja not-found) → pass-through.
  return null;
}

/** `true` si `pathname` es exactamente `base` o un descendiente (`base/...`). */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function redirectToLogin(req: NextRequest, pathname: string, search: string): NextResponse {
  const from = encodeURIComponent(pathname + search);
  return redirectTo(req, `/login?from=${from}`, 'no-session');
}

function redirectTo(req: NextRequest, target: string, reason: string): NextResponse {
  if (process.env.NODE_ENV !== 'production') {
    // SEC-07: solo from/to/reason; nunca el valor completo de cookies.
    // eslint-disable-next-line no-console
    console.debug('routing.redirect', { from: req.nextUrl.pathname, to: target, reason });
  }
  return NextResponse.redirect(new URL(target, req.url));
}
