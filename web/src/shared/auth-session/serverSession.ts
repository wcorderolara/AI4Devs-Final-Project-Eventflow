import { cookies } from 'next/headers';
import { COOKIE_ROLE, COOKIE_SESSION, isRole, type SessionClaims } from '@/shared/authorization';

/**
 * Claims de sesión resueltos **en el servidor**, para superficies públicas que deben renderizar
 * su CTA ya correcto en el HTML inicial.
 *
 * Es la contrapartida server-side de `useSession()`: misma fuente de verdad que ya usa
 * `roleGuardMiddleware` en el edge — presencia de `eventflow_session` (HTTP-only, emitida por el
 * backend) y valor whitelisted de `eventflow_role`. No decodifica el JWT, no valida firma, no
 * expone ningún claim interno y no lee la URL ni ningún parámetro del cliente.
 *
 * **No es un security boundary** (ADR-FE-003/015): es la señal de UX que evita mostrarle
 * «Iniciar sesión» a alguien que ya tiene sesión. El backend autoriza cada request y el middleware
 * protege el routing aunque la cookie se manipule; el peor caso de un claim falseado es ver un CTA
 * que lleva a un workspace del que el guard/backend te expulsa.
 *
 * Falla en seguro: cualquier error leyendo cookies (o un render fuera de contexto de request)
 * devuelve sesión anónima, que es el estado con menos suposiciones.
 */
export function getServerSessionClaims(): SessionClaims {
  try {
    const jar = cookies();
    const hasSession = Boolean(jar.get(COOKIE_SESSION)?.value);
    const roleValue = jar.get(COOKIE_ROLE)?.value;
    const role = isRole(roleValue) ? roleValue : null;

    // Un rol sin sesión no es una sesión: la cookie de rol no es HTTP-only y por sí sola no
    // afirma nada. Se exige la pareja completa, igual que hace el guard del edge.
    if (!hasSession || !role) return { isAuthenticated: false, role: null };
    return { isAuthenticated: true, role };
  } catch {
    return { isAuthenticated: false, role: null };
  }
}
