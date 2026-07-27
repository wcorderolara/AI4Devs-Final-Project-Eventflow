import type { Role, SessionClaims } from '@/shared/authorization';
import { ROLE_HOME } from './roleHome';

/**
 * Modelo de navegación y CTA de las superficies **públicas** (landing y su header).
 *
 * Único punto donde se decide a dónde lleva cada llamada a la acción de la home. El header, el
 * hero, la sección de proveedores y el CTA final consumen este módulo: el mapa `rol → destino`
 * no se repite en tres JSX distintos (que es como acaban divergiendo).
 *
 * Reglas:
 * - Los destinos autenticados salen de `ROLE_HOME` y de rutas que ya existen en el App Router.
 *   Aquí no se inventa ninguna ruta pública nueva.
 * - Un visitante con sesión **no** vuelve a ver «Iniciar sesión» ni «Crear cuenta»: se le ofrece
 *   su workspace. La landing sigue siendo accesible; sólo cambia lo que se le propone hacer.
 * - Se devuelven claves i18n, no copy: el componente traduce con `next-intl`.
 * - Presentacional/UX únicamente. No autoriza: el guard y el backend siguen mandando.
 */
export interface PublicLink {
  href: string;
  /** Clave dentro del namespace `navigation`. */
  labelKey: string;
}

export interface PublicCtaPair {
  primary: PublicLink;
  secondary: PublicLink;
}

/**
 * Anclas de navegación de la propia landing + directorio público. Cada `#id` corresponde a una
 * sección realmente renderizada: no hay enlaces a páginas que no existen (Stitch mostraba
 * «Solutions» y «Pricing», que EventFlow no tiene — ver el registro de implementación).
 *
 * Las anclas son **absolutas** (`/#seccion`), no relativas (`#seccion`). El header es el mismo en
 * toda la superficie pública, así que desde `/vendors` un `#features` relativo apuntaría a
 * `/vendors#features`: un ancla inexistente, el clic no hace nada y el visitante se queda
 * atrapado en el directorio sin forma de volver a la landing por el menú.
 */
export const PUBLIC_NAV_LINKS: readonly PublicLink[] = [
  { href: '/#how-it-works', labelKey: 'public.nav.howItWorks' },
  { href: '/#features', labelKey: 'public.nav.features' },
  { href: '/#for-vendors', labelKey: 'public.nav.forVendors' },
  { href: '/vendors', labelKey: 'public.nav.directory' },
] as const;

/** `id` de las secciones ancladas. Estables: son destinos de enlace y no se traducen. */
export const PUBLIC_SECTION_ID = {
  howItWorks: 'how-it-works',
  features: 'features',
  forVendors: 'for-vendors',
} as const;

const ANONYMOUS_REGISTER: PublicLink = { href: '/register', labelKey: 'public.cta.register' };
const ANONYMOUS_LOGIN: PublicLink = { href: '/login', labelKey: 'public.cta.login' };
const PUBLIC_DIRECTORY: PublicLink = { href: '/vendors', labelKey: 'public.cta.directory' };

/** Destinos por rol. Los `secondary` apuntan a rutas montadas, no a placeholders. */
const WORKSPACE_CTA: Record<Role, PublicCtaPair> = {
  organizer: {
    primary: { href: ROLE_HOME.organizer, labelKey: 'public.cta.organizer.primary' },
    secondary: { href: '/organizer/events', labelKey: 'public.cta.organizer.secondary' },
  },
  vendor: {
    primary: { href: ROLE_HOME.vendor, labelKey: 'public.cta.vendor.primary' },
    secondary: { href: '/vendor/quotes', labelKey: 'public.cta.vendor.secondary' },
  },
  admin: {
    primary: { href: ROLE_HOME.admin, labelKey: 'public.cta.admin.primary' },
    secondary: { href: '/admin/metrics', labelKey: 'public.cta.admin.secondary' },
  },
};

/**
 * `true` sólo con la pareja completa de claims. Un rol sin sesión (o una sesión sin rol
 * reconocible) se trata como anónimo: es el estado que menos supone.
 */
function activeRole(claims: SessionClaims): Role | null {
  return claims.isAuthenticated && claims.role ? claims.role : null;
}

/**
 * Acciones del header público. Anónimo: entrar + crear cuenta. Autenticado: **una sola** acción,
 * la de su workspace — nunca una invitación a iniciar sesión de nuevo.
 */
export function getPublicHeaderCtas(claims: SessionClaims): {
  primary: PublicLink;
  secondary?: PublicLink;
} {
  const role = activeRole(claims);
  if (role) return { primary: WORKSPACE_CTA[role].primary };
  return { primary: ANONYMOUS_REGISTER, secondary: ANONYMOUS_LOGIN };
}

/**
 * Par de CTA del hero y del cierre de la landing. Para el visitante anónimo la secundaria es el
 * directorio público (una ruta real que puede explorar sin cuenta), no un segundo «iniciar
 * sesión».
 */
export function getPublicHeroCtas(claims: SessionClaims): PublicCtaPair {
  const role = activeRole(claims);
  if (role) return WORKSPACE_CTA[role];
  return { primary: ANONYMOUS_REGISTER, secondary: PUBLIC_DIRECTORY };
}

/**
 * CTA de la sección dirigida a proveedores. Anónimo → alta (el registro ya distingue organizador
 * y proveedor). Autenticado → su propio workspace, sea cual sea el rol: proponerle registrarse
 * otra vez no tendría sentido.
 */
export function getPublicVendorCta(claims: SessionClaims): PublicLink {
  const role = activeRole(claims);
  if (role) return WORKSPACE_CTA[role].primary;
  return { href: '/register', labelKey: 'public.cta.vendorRegister' };
}
