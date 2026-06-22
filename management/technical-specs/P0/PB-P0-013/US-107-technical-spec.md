# Technical Specification — US-107: Layouts completos y navegación por rol — `PublicLayout`/`AuthLayout`/`AppLayout`/`OrganizerLayout`/`VendorLayout`/`AdminLayout` con `<Topbar>`, `<Sidebar>` contextual, `<UserMenu>`, `<MobileNav>`, `<RoleGuard>` UX, skip-link y `<NotificationsBadge>` placeholder

## 1. Metadata

| Field                                  | Value                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-107                                                                                                                                 |
| Source User Story                      | `management/user-stories/US-107-layouts-and-navigation.md`                                                                              |
| Decision Resolution Artifact           | No existe — la historia refinada incorporó 14 decisiones directamente en `PO/BA Decisions Applied` (sin preguntas bloqueantes)         |
| Priority                               | P0                                                                                                                                     |
| Backlog ID                             | PB-P0-013                                                                                                                              |
| Backlog Title                          | Frontend Data Layer: TanStack Query + MSW + Layouts                                                                                    |
| Backlog Execution Order                | 13 (de 18 items P0 priorizados)                                                                                                        |
| User Story Position in Backlog Item    | 2 de 2                                                                                                                                 |
| Related User Stories in Backlog Item   | US-106 (data layer foundation), US-107 (layouts completos por rol)                                                                      |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                                                  |
| Backlog Item Dependencies              | PB-P0-012 (US-103/104/105 mergeadas) + US-106 mergeada                                                                                  |
| Feature                                | Layouts completos por rol + navegación contextual + componentes navegacionales transversales                                            |
| Module / Domain                        | Platform / FE / Layouts                                                                                                                |
| User Story Status                      | Approved with Minor Notes                                                                                                              |
| Backlog Alignment Status               | Found                                                                                                                                  |
| Technical Spec Status                  | Ready for Task Breakdown                                                                                                               |
| Created Date                           | 2026-06-22                                                                                                                             |
| Last Updated                           | 2026-06-22                                                                                                                             |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts**. Item P0 que entrega la capa de datos del frontend y los layouts/navegación por rol. **Depende de PB-P0-012** (US-103/104/105 mergeadas). Trazabilidad backlog: Doc 15 · ADR-FE-001. Acceptance summary backlog: "Layouts por rol con navegación específica; Smoke por route group pasa".

### Execution Order Rationale

PB-P0-013 ocupa la **posición 13 de 18** entre los items P0. US-107 es la **segunda y última historia** del item; cierra **PB-P0-013** y **EPIC-FE-001 foundation**. Depende estructuralmente de US-105 (route groups + layouts esqueleto que se reemplazan) y técnicamente de US-106 (consume `useSession()` hidratado para `<UserMenu>`, `<RoleGuard>` y nav contextual). La secuencia obligatoria interna del item es US-106 → US-107.

Al cerrar US-107:

* **US-AUTH-*** puede iniciar (sus formularios habitan `AuthLayout`).
* **Todas las historias frontend de feature** pueden iniciar reemplazando los 12 placeholders nuevos de sidebar destinations sin tocar layouts.
* La **demo académica** muestra navegación profesional por rol con MSW (sin backend desplegado).

US-107 NO depende técnicamente de US-108 (emisión de cookies) ni de US-AUTH-*. El logout placeholder cubre la UX hasta que US-AUTH-* implemente `authApi.logout()` real.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                                                            | Suggested Order |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| US-106     | Data layer foundation — `<QueryClientProvider>` + `httpClient` + MSW + `<SessionProvider>` hidratado + `<ErrorBoundary>` + patrón `featureApi` | 1               |
| US-107     | Layouts completos por rol — 6 layouts + 9 componentes navegacionales + `<RoleGuard>` UX + i18n + 12 placeholders                | 2               |

---

## 3. Executive Technical Summary

US-107 entrega la **presentación foundation del frontend** sobre la data layer de US-106, cumpliendo Doc 15 §11/§17/§18/§19/§20/§22, Doc 5 §5 (3 roles MVP) y ADR-FE-001/003/015. La historia introduce 4 capas integradas:

1. **6 layouts completos** que reemplazan los esqueletos de US-105:
   * `(public)/layout.tsx` — Server Component con header (`<Logo>`, nav `Directorio`/`Login`/`Register`, `<LocaleSwitcher>` de US-104) + `<main id="main-content">` + `<Footer>` con copyright.
   * `(auth)/layout.tsx` — Server Component con `<SkipLink>`, `<Logo>` + `<LocaleSwitcher>`, `<main>` con `<div className="auth-card">`.
   * `(app)/layout.tsx` — Client Component (`'use client'`) con `<SkipLink>`, `<Topbar>` (`<UserMenu>`, `<NotificationsBadge>`, `<LocaleSwitcher>`, hamburguesa mobile), `<MobileNav>` drawer, `<main id="main-content">`.
   * `(app)/organizer/layout.tsx` — Client con sidebar `ORGANIZER_NAV_ITEMS` + `<section>`.
   * `(app)/vendor/layout.tsx` — Análogo con `VENDOR_NAV_ITEMS`.
   * `(admin)/layout.tsx` — Client Component con `<Topbar>` admin, `<MobileNav>` admin, sidebar `ADMIN_NAV_ITEMS` + `<section>`.
2. **9 componentes navegacionales transversales** en `src/shared/navigation/`: `<Topbar>`, `<Sidebar>`, `<NavLink>` (con `aria-current="page"`), `<UserMenu>` (con iniciales determinísticas), `<MobileNav>` (Headless UI `<Dialog>` con focus trap), `<NotificationsBadge>` (placeholder visual), `<SkipLink>`, `<Footer>`, `<Logo>`.
3. **`<RoleGuard>` UX** en `src/shared/authorization/RoleGuard.tsx`: oculta children si el rol activo no está en la lista permitida; `fallback` configurable; no es boundary de seguridad (ADR-FE-003). Consume `useSession()` de US-106.
4. **Catálogos i18n nuevos** en `messages/<locale>/navigation.json` con 52 claves nuevas en los 4 locales (`es-LATAM` 100 % traducido; `es-ES`/`pt`/`en` con placeholders `[<locale>] ...` detectables). ICU MessageFormat en `navigation.footer.copyright`.

**Además:**

* **12 placeholders nuevos de sidebar destinations** (`page.tsx` mínimos con `getTranslations`) en `(app)/organizer/{events,notifications,profile}/`, `(app)/vendor/{profile,portfolio,quotes,reviews,notifications}/`, `(admin)/{vendors,reviews,users,seed}/`.
* **Paleta semántica mínima** en `tailwind.config.ts`: `primary`, `secondary`, `danger`, `success`, `neutral` mapeadas a paletas Tailwind existentes (decisión MVP; design system completo es Future).
* **Logout placeholder** en `<UserMenu>`: invalida `queryClient.invalidateQueries(['me'])` + `router.replace('/login')` sin llamar a `POST /auth/logout` (eso es US-AUTH-*). Limitación documentada en JSDoc.
* **`<NotificationsBadge>` placeholder** visual: icono campana + badge `•` sin number ni dropdown (historia de notificaciones lo reemplaza).
* **Avatar de `<UserMenu>`** con iniciales determinísticas: hash `userId → HSL hue` (historia User Profile lo reemplaza por URL real si aplica).
* **A11Y WCAG 2.1 AA baseline**: `<SkipLink>` primero focusable; `aria-current="page"`; focus trap drawer; `Escape` cierra; contraste ≥ 4.5:1; `<nav aria-label>`; iconos decorativos `aria-hidden`; `<button type="button">`.

La historia **NO** introduce formularios reales de login/register/logout (US-AUTH-*), **NO** emite cookies (US-108), **NO** introduce features de dominio, **NO** introduce `<ToastProvider>` ni `<ThemeProvider>`, **NO** introduce `<Breadcrumbs>` ni búsqueda global, **NO** introduce notificaciones reales ni avatares con upload, **NO** modifica el middleware (heredado de US-104/US-105), **NO** introduce endpoints backend, **NO** usa Server Actions ni API Routes BFF. Tres `Documentation Alignment Required` no bloqueantes (Doc 15 §19 footer simplificado, Doc 15 §20 paths formalizados, Doc 15 §20.3 admin impersonation Future).

---

## 4. Scope Boundary

### In Scope

* **Layouts reemplazados** (6):
  * `web/src/app/(public)/layout.tsx`
  * `web/src/app/(auth)/layout.tsx`
  * `web/src/app/(app)/layout.tsx`
  * `web/src/app/(app)/organizer/layout.tsx`
  * `web/src/app/(app)/vendor/layout.tsx`
  * `web/src/app/(admin)/layout.tsx`
* **Componentes navegacionales transversales** en `web/src/shared/navigation/`:
  * `Topbar.tsx`
  * `Sidebar.tsx`
  * `NavLink.tsx`
  * `UserMenu.tsx`
  * `MobileNav.tsx`
  * `NotificationsBadge.tsx`
  * `SkipLink.tsx`
  * `Footer.tsx`
  * `Logo.tsx`
  * `nav-items.ts` (constantes `ORGANIZER_NAV_ITEMS`, `VENDOR_NAV_ITEMS`, `ADMIN_NAV_ITEMS`)
  * `types.ts` (`NavItem`)
  * `index.ts` (barrel)
* **`<RoleGuard>` UX**:
  * `web/src/shared/authorization/RoleGuard.tsx`
  * Actualización de `web/src/shared/authorization/index.ts` (barrel)
* **12 placeholders nuevos de sidebar destinations**:
  * `web/src/app/(app)/organizer/events/page.tsx`
  * `web/src/app/(app)/organizer/notifications/page.tsx`
  * `web/src/app/(app)/organizer/profile/page.tsx`
  * `web/src/app/(app)/vendor/profile/page.tsx`
  * `web/src/app/(app)/vendor/portfolio/page.tsx`
  * `web/src/app/(app)/vendor/quotes/page.tsx`
  * `web/src/app/(app)/vendor/reviews/page.tsx`
  * `web/src/app/(app)/vendor/notifications/page.tsx`
  * `web/src/app/(admin)/vendors/page.tsx`
  * `web/src/app/(admin)/reviews/page.tsx`
  * `web/src/app/(admin)/users/page.tsx`
  * `web/src/app/(admin)/seed/page.tsx`
* **Catálogos i18n** (4 locales × `navigation.json`):
  * 52 claves nuevas listadas en AC-04 de la historia.
  * ICU MessageFormat en `navigation.footer.copyright`.
* **Paleta semántica Tailwind** en `web/tailwind.config.ts` (`primary`, `secondary`, `danger`, `success`, `neutral`).
* **Tests**:
  * Component (Vitest + Testing Library): `<NavLink>`, `<RoleGuard>`, `<UserMenu>`, `<MobileNav>`, `<SkipLink>`, `<Footer>`, `<Logo>`.
  * E2E (Playwright): 9 specs nuevos en `tests/e2e/layouts.*`.
* **Documentación**: `web/README.md` § "Layouts & Navigation".

### Out of Scope

* **Login/Register/Forgot-password/Logout funcionales** (RHF + Zod + submit) → **US-AUTH-***.
* **Emisión real de cookies** → **US-108**.
* **Notificaciones reales** (lista, polling, contador real, dropdown) → historia de notificaciones (P1/P2).
* **Avatares reales** (upload + storage + URL) → historia de User Profile.
* **Páginas de feature** (event wizard, vendor profile real, admin moderation real, etc.) → cada historia dueña. US-107 entrega solo los 12 placeholders mínimos.
* **`VendorPublicLayout`** (hero de vendor + tabs) → historia vendor public profile.
* **`<ToastProvider>`** y toasts globales → diferido.
* **`<ThemeProvider>`** y dark mode → Future.
* **Design system completo** (tokens semánticos completos, componentes base estilizados) → Future.
* **`<Breadcrumbs>`** → Future.
* **Search global / command palette** → Future.
* **Impersonación admin** ("Cambiar a vista de organizer/vendor") → Future (Doc 15 §20.3).
* **Footer links legales** (`/about`, `/contact`, `/terms`, `/privacy`) → Future.
* **Server Actions, API Routes BFF** → prohibidos.

### Explicit Non-Goals

* No introducir lógica de fetch o autorización propia en `<RoleGuard>` (solo lee `useSession()`).
* No reemplazar layouts en otro orden distinto al definido (los esqueletos de US-105 se reemplazan en sitio).
* No agregar dependencias fuera del stack Doc 15 §7 + `react-error-boundary` aprobado en US-106 (Headless UI y lucide-react ya están en US-103).
* No modificar el middleware (heredado de US-104/US-105).
* No modificar el `httpClient` ni el `<SessionProvider>` (US-106).
* No introducir nuevos endpoints ni consumir nuevos.
* No introducir claves i18n fuera del catálogo `navigation` (las claves de `errors.envelope.*` y `common.retry` heredadas de US-104/US-105 NO se duplican).
* No introducir tokens en localStorage / sessionStorage.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica. US-107 es 100 % frontend. No agrega endpoints, no consume nuevos, no modifica schema Prisma. La única dependencia con backend es transitiva via `useSession()` (US-106) y la cookie de sesión (US-108).

### Frontend Architecture

Cumple íntegramente Doc 15:

* **Doc 15 §11**: Server Components para áreas públicas (`PublicLayout`, `AuthLayout`); Client Components para áreas autenticadas (`AppLayout`, `OrganizerLayout`, `VendorLayout`, `AdminLayout`) porque consumen `useSession()` y manejan estado UI (drawer, dropdown).
* **Doc 15 §17**: segmentos URL en inglés (`/organizer`, `/vendor`, `/admin`, `/vendors`, `/login`); copy mostrado vía `t('clave')`. Sin URLs traducidas por locale (alineado a US-104/US-105).
* **Doc 15 §18**: 4 route groups creados en US-105 con layouts esqueleto; US-107 reemplaza por implementaciones completas.
* **Doc 15 §19**: tabla de layouts. US-107 implementa los 6 layouts del MVP (excluye `VendorPublicLayout`, que vive en historia vendor public profile).
* **Doc 15 §20**: navegación por rol (Organizer / Vendor / Admin) con paths formalizados en `PO/BA Decisions Applied`. Tabla de visibilidad §20.4 respetada.
* **Doc 15 §22**: `<RoleGuard allow={Role[]} fallback?: ReactNode>` implementa el patrón "Role guards UX" del documento.
* **ADR-FE-001** (Next.js + App Router), **ADR-FE-003** (frontend UX-only — `<RoleGuard>` no autoriza), **ADR-FE-015** (middleware UX).

### Database Architecture

No aplica.

### API Architecture

No aplica directamente. El logout placeholder **NO** llama a `POST /auth/logout` (lo hace US-AUTH-* al implementar `authApi.logout()`).

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* **ADR-FE-003 invariante**: `<RoleGuard>` es UX-only; el backend es la única fuente de autorización. JSDoc del componente lo documenta explícitamente.
* **ADR-FE-015**: el middleware UX-only ya vive en US-105; US-107 confía en él para bloquear acceso a `(app)`/`(admin)` para anónimos.
* **Defense in depth UX**: `<RoleGuard>` se puede usar dentro de layouts para esconder acciones sensibles si por algún bug llega un rol incorrecto (ej. admin escribe URL manual `/organizer`).
* **No tokens en localStorage** (heredado de US-103/106).
* **Logs limpios**: el placeholder logout solo loguea `console.debug('userMenu.logout.placeholder')` sin valores de sesión.
* **`<MobileNav>` no expone información extra** al sidebar (no duplica permissions ni claims).
* **Iniciales del `<UserMenu>` no exponen email** cuando hay `displayName`.

### Testing Architecture

* **Vitest + Testing Library + jsdom**: tests component de los 9 componentes navegacionales y `<RoleGuard>`.
* **MSW** (heredado de US-106): override de `/auth/me` con `worker.use(...)` para tests E2E con distintos roles.
* **Playwright**: 9 E2E nuevos en `tests/e2e/layouts.*`.
* **A11Y**: assertions DOM con Testing Library (`aria-current`, `role="alert"`, focus order); axe-core opcional.

### Deployment / Configuration

* `tailwind.config.ts` modificado con paleta semántica mínima. Sin nuevas env vars.

---

## 6. Functional Interpretation

| Acceptance Criterion                                                                       | Technical Interpretation                                                                                                                                                                                                                                                                                                          | Impacted Layer(s)                  |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| AC-01 6 layouts completos reemplazan esqueletos de US-105                                  | Reemplazar el contenido de cada `layout.tsx`. `PublicLayout`/`AuthLayout` Server; `AppLayout`/`OrganizerLayout`/`VendorLayout`/`AdminLayout` Client. Cada uno renderiza `<SkipLink>` (donde aplica), header/topbar, `<main id="main-content">`, sidebar (sub-layouts) o footer.                                                                | FE Layouts                          |
| AC-02 9 componentes navegacionales transversales                                           | Implementar en `src/shared/navigation/` cada componente con la API exacta del AC. `<Topbar>` (Client), `<Sidebar>` (Client), `<NavLink>` con `usePathname()` para `aria-current`, `<UserMenu>` consume `useSession()` + `useQueryClient()` + `useRouter()`, `<MobileNav>` con Headless UI `<Dialog>` (focus trap automático), `<NotificationsBadge>` placeholder, `<SkipLink>`, `<Footer>` Server, `<Logo>` con `<Link href="/">`. | FE Components                        |
| AC-03 `<RoleGuard>` UX                                                                     | Crear `src/shared/authorization/RoleGuard.tsx` Client Component. Lee `useSession()`. Si `isLoading` → fallback. Si `role ∈ allow` → children. Si no → fallback. JSDoc UX-only.                                                                                                                                                  | FE Authorization                     |
| AC-04 Claves i18n nuevas en `navigation.json` × 4 locales                                  | Agregar 52 claves a `messages/<locale>/navigation.json` (incluye `placeholder.*` para los 12 placeholders nuevos). `es-LATAM` 100 % traducido; los otros 3 con `[<locale>] ...` placeholders. ICU MessageFormat en `footer.copyright` con `{year, number}`.                                                                              | FE i18n Catalogs                     |
| AC-05 12 placeholders de sidebar destinations                                              | Crear los 12 `page.tsx` mínimos Server Components con `getTranslations` (alineado a US-105 pattern).                                                                                                                                                                                                                              | FE Pages                              |
| AC-06 Logout placeholder funcional UX                                                      | `<UserMenu>` botón "Cerrar sesión" → `useQueryClient().invalidateQueries(['me'])` + `router.replace('/login')` + cierra dropdown. NO llama a `POST /auth/logout`. JSDoc marca placeholder y referencia US-AUTH-*.                                                                                                                | FE Session                            |
| AC-07 Responsive WCAG 2.1 AA y mobile-first                                                | Tailwind `lg` breakpoint (1024 px) cambia sidebar fija ↔ drawer. `<SkipLink>` con clases Tailwind `sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0`. `<MobileNav>` Headless UI `<Dialog>` con `Transition` + focus trap. Contraste ≥ 4.5:1 con paleta Tailwind defaults verificados.                                  | FE Responsive / A11Y                  |
| AC-08 Pipeline canónico verde y sin artefactos fuera de scope                              | CI exit 0; revisión PR contra lista negativa (VR-09..VR-13).                                                                                                                                                                                                                                                                      | CI / Code Review                       |
| AC-09 Tests Playwright E2E + component                                                     | Implementar suites component (Vitest + RTL) + 9 E2E specs (`tests/e2e/layouts.*`).                                                                                                                                                                                                                                                | QA / Testing                          |
| AC-10 A11Y baseline WCAG 2.1 AA validado                                                   | Assertions DOM: `<h1>` único, `<SkipLink>`, `<nav aria-label>`, `<main id="main-content">`, `<button aria-expanded>`, `<MobileNav>` focus trap, `<NavLink>` `aria-current="page"`. Contraste y lang verificados.                                                                                                                  | QA / A11Y                              |

---

## 7. Backend Technical Design

No aplica. US-107 es 100 % frontend.

---

## 8. Frontend Technical Design

### Routes / Pages

**Modificadas (layouts)**:

```
web/src/app/
├── (public)/layout.tsx               # Reemplaza esqueleto US-105 → header + footer
├── (auth)/layout.tsx                 # Reemplaza esqueleto US-105 → card centrado
├── (app)/layout.tsx                  # Reemplaza esqueleto US-105 → Topbar + MobileNav
├── (app)/organizer/layout.tsx        # Reemplaza esqueleto US-105 → sidebar organizer
├── (app)/vendor/layout.tsx           # Reemplaza esqueleto US-105 → sidebar vendor
└── (admin)/layout.tsx                # Reemplaza esqueleto US-105 → Topbar admin + sidebar admin
```

**Nuevas (placeholders sidebar destinations — Server Components con `getTranslations`)**:

```
(app)/organizer/events/page.tsx
(app)/organizer/notifications/page.tsx
(app)/organizer/profile/page.tsx
(app)/vendor/profile/page.tsx
(app)/vendor/portfolio/page.tsx
(app)/vendor/quotes/page.tsx
(app)/vendor/reviews/page.tsx
(app)/vendor/notifications/page.tsx
(admin)/vendors/page.tsx
(admin)/reviews/page.tsx
(admin)/users/page.tsx
(admin)/seed/page.tsx
```

### Components

| Componente              | Tipo            | Ubicación                                          | Responsabilidad                                                                                                       |
| ----------------------- | --------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `<Topbar>`              | Client          | `src/shared/navigation/Topbar.tsx`                  | Barra superior; logo (mobile), hamburguesa (mobile), título contextual (desktop), `<NotificationsBadge>`, `<UserMenu>`, `<LocaleSwitcher>` |
| `<Sidebar>`             | Client          | `src/shared/navigation/Sidebar.tsx`                 | Renderiza `<nav aria-label>` con lista de `<NavLink>`. Desktop sticky; mobile oculta (drawer)                          |
| `<NavLink>`             | Client          | `src/shared/navigation/NavLink.tsx`                 | Aplica `aria-current="page"` con `usePathname()`; clases activa Tailwind                                              |
| `<UserMenu>`            | Client          | `src/shared/navigation/UserMenu.tsx`                | Headless UI `<Menu>`. Iniciales determinísticas. Logout placeholder                                                  |
| `<MobileNav>`           | Client          | `src/shared/navigation/MobileNav.tsx`               | Headless UI `<Dialog>` con focus trap automático; cierre por `Escape` y overlay click                                |
| `<NotificationsBadge>`  | Client          | `src/shared/navigation/NotificationsBadge.tsx`      | Botón icono `Bell` (lucide) + badge `•` placeholder. No abre dropdown                                                |
| `<SkipLink>`            | Client          | `src/shared/navigation/SkipLink.tsx`                | `<a href="#main-content">`; visible solo en focus (Tailwind `sr-only focus:not-sr-only`)                              |
| `<Footer>`              | Server          | `src/shared/navigation/Footer.tsx`                  | `<footer>` con `<Logo>` + copyright ICU                                                                              |
| `<Logo>`                | Server          | `src/shared/navigation/Logo.tsx`                    | Texto "EventFlow" estilizado; `<Link href="/">`; variants `full`/`icon`; sizes `sm`/`md`/`lg`                          |
| `<RoleGuard>`           | Client          | `src/shared/authorization/RoleGuard.tsx`            | UX guard que consume `useSession()`. JSDoc: no autoriza                                                                |

**API y firmas TypeScript clave**:

```ts
// src/shared/navigation/types.ts
import type { LucideIcon } from 'lucide-react'
export type NavItem = {
  href: string
  labelKey: string         // clave i18n (ej. 'navigation.sidebar.organizer.events')
  icon: LucideIcon
  exact?: boolean
}

// src/shared/navigation/nav-items.ts
export const ORGANIZER_NAV_ITEMS: NavItem[] = [
  { href: '/organizer/events',        labelKey: 'navigation.sidebar.organizer.events',        icon: Calendar },
  { href: '/organizer/notifications', labelKey: 'navigation.sidebar.organizer.notifications', icon: Bell },
  { href: '/organizer/profile',       labelKey: 'navigation.sidebar.organizer.profile',       icon: User },
]
export const VENDOR_NAV_ITEMS: NavItem[] = [
  { href: '/vendor',               labelKey: 'navigation.sidebar.vendor.dashboard',     icon: LayoutDashboard, exact: true },
  { href: '/vendor/profile',       labelKey: 'navigation.sidebar.vendor.profile',       icon: User },
  { href: '/vendor/portfolio',     labelKey: 'navigation.sidebar.vendor.portfolio',     icon: Briefcase },
  { href: '/vendor/quotes',        labelKey: 'navigation.sidebar.vendor.quotes',        icon: FileText },
  { href: '/vendor/reviews',       labelKey: 'navigation.sidebar.vendor.reviews',       icon: Star },
  { href: '/vendor/notifications', labelKey: 'navigation.sidebar.vendor.notifications', icon: Bell },
]
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/vendors', labelKey: 'navigation.sidebar.admin.vendors', icon: ShieldCheck },
  { href: '/admin/reviews', labelKey: 'navigation.sidebar.admin.reviews', icon: MessageSquare },
  { href: '/admin/users',   labelKey: 'navigation.sidebar.admin.users',   icon: Users },
  { href: '/admin/seed',    labelKey: 'navigation.sidebar.admin.seed',    icon: Database },
]

// src/shared/navigation/NavLink.tsx
type NavLinkProps = { href: string; icon?: LucideIcon; children: ReactNode; exact?: boolean }

// src/shared/authorization/RoleGuard.tsx
type RoleGuardProps = { allow: Role[]; fallback?: ReactNode; children: ReactNode }

// src/shared/navigation/MobileNav.tsx
type MobileNavProps = { items: NavItem[]; isOpen: boolean; onClose: () => void }
```

### Forms

No aplica.

### State Management

* **`useSession()`** (US-106): consumido por `<UserMenu>`, `<RoleGuard>`, `<Topbar>` para mostrar/ocultar elementos.
* **`useState` local** en `(app)/layout.tsx` y `(admin)/layout.tsx` para `isOpen` del `<MobileNav>` drawer.
* **`useQueryClient()`** + **`useRouter()`** en `<UserMenu>` para logout placeholder.
* **`usePathname()`** en `<NavLink>` para `aria-current="page"`.

### Data Fetching

No aplica directamente. Ninguna query nueva. `<SessionProvider>` (US-106) provee la única query `['me']`.

### Loading / Empty / Error / Success States

* **Loading**: `<UserMenu>` con `useSession().isLoading=true` → renderiza círculo gris (skeleton). Sidebar items renderizan sin esperar sesión (labels no dependen del rol).
* **Error**: `<UserMenu>` con `isError=true` → fallback con texto i18n + CTA `router.refresh()`. `<RoleGuard>` retorna fallback. Layout sigue navegable.
* **Empty**: N/A. Los placeholders de US-105 + US-107 son el "empty" hasta que features lleguen.
* **Success**: N/A.

### Accessibility

* **`<SkipLink>`** primero focusable en cada layout; clases Tailwind: `sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2`.
* **`<NavLink>`** aplica `aria-current="page"` cuando `pathname === href` (o `pathname.startsWith(href)` si `!exact`).
* **`<MobileNav>`** Headless UI `<Dialog>` con focus trap automático + `onClose` por `Escape`.
* **`<UserMenu>`** Headless UI `<Menu>` con navegación por flechas y cierre por `Escape` automático.
* **Botón hamburguesa**: `<button type="button" aria-expanded={isOpen} aria-controls="mobile-nav" aria-label={isOpen ? t('navigation.topbar.menuClose') : t('navigation.topbar.menuOpen')}>`.
* **Iconos decorativos**: todos con `aria-hidden="true"` (lucide acepta la prop).
* **Contraste**: Tailwind defaults `text-neutral-900` sobre `bg-white` cumple ≥ 4.5:1; `bg-primary-600` (blue-600) sobre `text-white` cumple ≥ 4.5:1; verificado.
* **`<html lang>` dinámico** heredado de US-104.
* **`<nav aria-label>`** semántico en cada `<Sidebar>` con clave `navigation.sidebar.<rol>.label`.

### i18n

* 52 claves nuevas en `messages/<locale>/navigation.json` (4 locales).
* `es-LATAM` 100 % traducido; los otros 3 con `[<locale>] ...` placeholders detectables.
* ICU MessageFormat en `navigation.footer.copyright` con `{year, number}`.
* Claves heredadas de US-104/US-105 (`errors.envelope.UNEXPECTED`, `common.retry`, `errors.notFound.*`, `errors.forbidden.*`) **NO se duplican**.

---

## 9. API Contract Design

No aplica. US-107 no introduce ni consume endpoints. El logout placeholder NO llama a backend.

---

## 10. Database / Prisma Design

No aplica.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. `<UserMenu>` solo lee `useSession()` (hidratado por US-106 via `GET /auth/me`).

### Authorization

* **Frontend UX-only** (ADR-FE-003). `<RoleGuard>` solo oculta UI; el backend rechaza con 401/403 si llega un request real inválido.
* **Defense in depth UX**: `<RoleGuard>` con `useSession()` `isLoading=true` → renderiza `fallback ?? null` (evita flash de contenido prohibido).
* **Middleware ya cubre acceso anónimo a `(app)`/`(admin)`** (US-105). El layout nunca renderiza con usuario anónimo en producción.

### Ownership Rules

No aplica.

### Role Rules

* `<RoleGuard allow={Role[]}>` permite ocultar children por rol.
* Sidebar items por rol enumerados explícitamente; cada layout solo renderiza sus items.
* Admin permite acceso URL manual a `(app)/*` (heredado US-105) pero `AdminLayout` no ofrece links visuales.

### Negative Authorization Scenarios

| Escenario                                                                   | Resultado esperado                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Anonymous accede a `(app)`/`(admin)`                                         | Middleware US-105 redirige antes de renderizar el layout                                                        |
| Usuario con `role='organizer'` accidentalmente accede a `AdminLayout`        | Middleware redirige a `/403`; defense in depth: `<RoleGuard>` esconde acciones admin críticas                    |
| Cookie de sesión revocada mid-session                                       | `useQuery(['me'])` retorna 401 → `<SessionProvider>` (US-106) `isAuthenticated=false`; handler global redirige a `/login` |
| `<RoleGuard>` con `isLoading=true`                                          | Renderiza `fallback ?? null`; no flash                                                                          |
| Admin escribe URL `/organizer` manualmente                                   | Middleware permite pass-through; `AppLayout` + `OrganizerLayout` se renderizan con admin viendo placeholders     |

### Audit Requirements

* `console.debug('userMenu.logout.placeholder')` en dev cuando se ejecuta el logout placeholder. Sin valores de sesión.
* `AdminAction` no aplica (sin acciones admin reales).

### Sensitive Data Handling

* `<UserMenu>` muestra **iniciales** y `displayName` (no expone email completo cuando hay displayName).
* Cookie HTTP-only nunca se lee desde cliente.
* Sin tokens en localStorage / sessionStorage.

---

## 13. Testing Strategy

### Unit Tests

No aplica como categoría separada (todo lo testeable de US-107 son Component Tests; ver siguiente sección).

### Component Tests

| ID    | Target / Spec                                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| TS-01 | `tests/unit/navigation/NavLink.test.tsx` — `aria-current="page"` con exact y startsWith                                       |
| TS-02 | `tests/unit/authorization/RoleGuard.test.tsx` — `<RoleGuard allow={['admin']}>` con sesión organizer NO renderiza children    |
| TS-03 | `tests/unit/authorization/RoleGuard.test.tsx` — sesión organizer y `allow=['organizer','vendor']` renderiza children          |
| TS-04 | `tests/unit/authorization/RoleGuard.test.tsx` — `isLoading=true` renderiza fallback                                            |
| TS-05 | `tests/unit/navigation/UserMenu.test.tsx` — sesión anónima no renderiza                                                        |
| TS-06 | `tests/unit/navigation/UserMenu.test.tsx` — `displayName='Ana Pérez'` muestra iniciales `AP`                                   |
| TS-07 | `tests/unit/navigation/UserMenu.test.tsx` — color de círculo determinístico por `userId`                                       |
| TS-08 | `tests/unit/navigation/MobileNav.test.tsx` — cierre con `Escape`, overlay click y close button                                 |
| TS-09 | `tests/unit/navigation/MobileNav.test.tsx` — focus trap mientras abierto                                                       |
| TS-10 | `tests/unit/navigation/SkipLink.test.tsx` — primer focusable en orden de tab                                                  |
| TS-11 | `tests/unit/navigation/Footer.test.tsx` — copyright ICU `{year}`                                                              |
| TS-12 | `tests/unit/navigation/Logo.test.tsx` — variants y sizes aplican clases correctas                                              |

### Integration Tests

No aplica (US-107 no compone fetch real con UI; `<SessionProvider>` ya está cubierto por US-106).

### API Tests

No aplica.

### E2E Tests

| ID    | Spec                                                              | Cobertura                                                                                              |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TS-13 | `tests/e2e/layouts.public.spec.ts`                                | Anonymous ve nav `Directorio`/`Login`/`Register` + footer                                              |
| TS-14 | `tests/e2e/layouts.auth.spec.ts`                                  | Anonymous en `/login` ve auth card sin sidebar                                                          |
| TS-15 | `tests/e2e/layouts.organizer.spec.ts`                             | Con MSW `role='organizer'`, `/organizer` muestra sidebar 3 items + UserMenu                            |
| TS-16 | `tests/e2e/layouts.vendor.spec.ts`                                | Con MSW `role='vendor'`, `/vendor` muestra sidebar 6 items                                              |
| TS-17 | `tests/e2e/layouts.admin.spec.ts`                                 | Con MSW `role='admin'`, `/admin` muestra sidebar 4 items                                                |
| TS-18 | `tests/e2e/layouts.mobile.spec.ts`                                | Viewport 375 px: sidebar oculta, hamburguesa abre `<MobileNav>`                                         |
| TS-19 | `tests/e2e/layouts.logout-placeholder.spec.ts`                    | Click "Cerrar sesión" → `/login` + `['me']` invalidada                                                   |
| TS-20 | `tests/e2e/layouts.skip-link.spec.ts`                             | Tab → skip-link visible; Enter → foco a `#main-content`                                                  |
| TS-21 | `tests/e2e/layouts.locale-switch.spec.ts`                         | Cambiar locale en `(app)` re-renderiza sin perder sesión                                                |

### Security Tests

| ID    | Scenario                                                                          | Tipo            |
| ----- | --------------------------------------------------------------------------------- | --------------- |
| NT-04..NT-10 | Lista negativa de artefactos fuera de scope (formularios reales, ToastProvider, ThemeProvider, search, notificaciones reales, avatares, backend endpoint) | PR review     |
| NT-12 | `<RoleGuard>` con lógica de fetch                                                 | PR review       |

### Accessibility Tests

| ID         | Scenario                                                                                  | Tipo                            |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| A11Y-TS-01 | `<SkipLink>` primer focusable; Enter lleva a `#main-content`                              | E2E + manual                    |
| A11Y-TS-02 | `<NavLink>` con `aria-current="page"`                                                     | Component / DOM assertion       |
| A11Y-TS-03 | `<MobileNav>` focus trap                                                                  | Component + E2E                 |
| A11Y-TS-04 | `<MobileNav>` cierre con `Escape`                                                         | E2E                             |
| A11Y-TS-05 | `<UserMenu>` flechas + `Escape`                                                            | E2E                             |
| A11Y-TS-06 | `<button aria-expanded>` en hamburguesa                                                   | E2E                             |
| A11Y-TS-07 | Contraste ≥ 4.5:1 en texto principal                                                      | Manual + axe-core opcional      |
| A11Y-TS-08 | `<html lang>` dinámico funciona en cada layout                                            | E2E                             |
| A11Y-TS-09 | `<nav aria-label>` semántico en cada `<Sidebar>`                                          | Component / DOM assertion       |

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica directamente. **Habilita** demo académica visualmente evaluable con MSW (heredado de US-106).

### CI Checks

Pipeline canónico Doc 21 §9.2 verde:

```bash
npm ci
npm run lint          # --max-warnings=0; lint anti-hardcoded de US-104 activo
npm run typecheck
npm run test          # Vitest unit + component
npm run build
npm run test:e2e      # Playwright (heredado + 9 nuevos de layouts)
node scripts/check-no-msw-in-prod.mjs   # heredado de US-106
```

---

## 14. Observability & Audit

### Logs

* **Dev**: `console.debug('userMenu.logout.placeholder')` cuando se ejecuta. Sin valores de sesión.
* **Prod**: silencio.

### Correlation ID

No aplica directamente (no hay requests nuevos en US-107).

### AdminAction

No aplica.

### Error Tracking

`<ErrorBoundary>` raíz (heredado de US-106) captura errores de render de cualquier layout o componente.

### Metrics

No aplica.

---

## 15. Seed / Demo Data Impact

No aplica directamente. US-107 hace la demo visualmente evaluable (navegación completa por rol con MSW) sin requerir seed adicional. Cuando MSW retorne sesión organizer/vendor/admin, los layouts respectivos se renderizan completos.

---

## 16. Documentation Alignment Required

| Document / Source                | Conflict                                                                                                       | Current Decision                                                                                                            | Recommended Action                                                                                              | Blocks Implementation? |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Doc 15 §19 Footer                | Doc lista footer con `/about`/`/contact`/`/terms`/`/privacy`; US-107 simplifica a copyright + logo              | Decisión MVP; los links legales son Future                                                                                  | Amender Doc 15 §19 post-merge                                                                                   | No                     |
| Doc 15 §20 Sidebar items         | Doc lista nav items por rol sin paths exactos; US-107 los formaliza                                            | Paths definidos en `PO/BA Decisions Applied`                                                                                | Amender Doc 15 §20 post-merge listando paths efectivos                                                          | No                     |
| Doc 15 §20.3 Admin impersonation | Doc menciona "puede impersonar vía endpoint admin si se habilita; Future"                                      | US-107 confirma fuera de scope                                                                                              | Sin acción adicional (ya está marcado Future)                                                                   | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                                                                  | Impact                                                                                                          | Mitigation                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reemplazar 6 layouts en sitio con scope amplio puede introducir regresiones en placeholders de US-105                                                  | Placeholders existentes dejan de renderizar correctamente                                                       | Los placeholders de US-105 (`(public)/page.tsx`, `(auth)/login/page.tsx`, etc.) **no se modifican**; solo los layouts. Tests E2E de US-105 (`routing.public`, `routing.app-guard`, etc.) deben seguir verdes |
| `<MobileNav>` con focus trap mal implementado puede atrapar focus permanente en mobile                                                                | UX rota; usuario no puede salir del drawer                                                                       | Usar Headless UI `<Dialog>` que entrega focus trap probado; tests E2E + component cubren `Escape` y overlay click                                                                                            |
| Sidebar items por rol con `<RoleGuard>` mal compuesto puede ocultar todo                                                                              | Sidebar vacía rompe navegación                                                                                   | Cada sub-layout (organizer/vendor/admin) renderiza su sidebar **sin** `<RoleGuard>` (el middleware US-105 ya garantizó que solo el rol correcto llega). `<RoleGuard>` se reserva para acciones específicas |
| Logout placeholder en backend caído deja al usuario en loop entre `/login` y dashboard                                                                | UX rota; el usuario no puede "salirse" hasta que backend logout real esté listo (US-AUTH-*)                       | Documentar limitación en JSDoc y EC-04 de la historia; coordinar con US-AUTH-* para reemplazo definitivo                                                                                                     |
| Inserción de admin en `(app)` por URL manual confunde la UX                                                                                           | Admin ve placeholders de organizer/vendor sin contexto                                                          | Decisión MVP heredada de US-105; navegación visual de admin NO ofrece links. `<RoleGuard>` queda disponible para uso futuro si el equipo prefiere cambiar política                                            |
| `<UserMenu>` con `useSession().isLoading=true` causa flash de skeleton al cargar                                                                       | UX pobre en primera carga                                                                                       | `staleTime: 60_000` (US-106) reduce el caso; el skeleton es intencional, no flash. Tests cubren `isLoading=true` render                                                                                       |
| Tailwind paleta semántica nueva colisiona con utility classes existentes                                                                              | Estilos rotos                                                                                                    | Mapear `primary`, `secondary`, `danger`, `success`, `neutral` a paletas Tailwind existentes (ej. `primary → blue-*`) en `tailwind.config.ts > theme.extend.colors`. Sin overrides de clases base              |
| Iconos `lucide-react` no incluidos en tree-shaking inflan bundle                                                                                       | Bundle prod aumenta                                                                                              | Importar named (`import { Bell } from 'lucide-react'`); Next.js + Webpack + Tailwind hacen tree-shaking correcto                                                                                            |
| 52 claves i18n nuevas con typos rompen renderizado                                                                                                     | Texto mostrado como clave en lugar de traducción                                                                | `getMessageFallback` de US-104 expone `[<locale>] <key>` en dev; lint anti-hardcoded captura literales; reviewers validan en PR                                                                              |
| Layouts Client Components consumiendo `useSession()` causan hidratación inconsistente                                                                  | "Hydration mismatch" warnings; UX rota                                                                          | Patrón oficial App Router: `RootLayout` Server con providers; layouts privados Client donde consumen hooks. Tests E2E con `npm run dev` y `npm run build && npm run start` cubren ambos paths                |
| ICU MessageFormat en `footer.copyright` con `{year, number}` causa formato inesperado en algunos locales                                              | Año mostrado con formato inesperado (ej. "2.026" en `es-LATAM` con separador de miles)                          | Usar `{year, number, ::Y}` o simplemente plain `{year}` interpretado como string. Test component valida output esperado por locale                                                                          |
| 12 placeholders nuevos con claves i18n no creadas en los 4 locales producen `getMessageFallback`                                                       | Texto en dev `[<locale>] navigation.placeholder.xxx`                                                            | AC-04 + AC-05 obligan crear las 52 claves en los 4 locales; revisión PR estricta                                                                                                                            |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders impacted

* **Nuevos**:
  * `web/src/shared/navigation/Topbar.tsx`
  * `web/src/shared/navigation/Sidebar.tsx`
  * `web/src/shared/navigation/NavLink.tsx`
  * `web/src/shared/navigation/UserMenu.tsx`
  * `web/src/shared/navigation/MobileNav.tsx`
  * `web/src/shared/navigation/NotificationsBadge.tsx`
  * `web/src/shared/navigation/SkipLink.tsx`
  * `web/src/shared/navigation/Footer.tsx`
  * `web/src/shared/navigation/Logo.tsx`
  * `web/src/shared/navigation/nav-items.ts`
  * `web/src/shared/navigation/types.ts`
  * `web/src/shared/navigation/index.ts`
  * `web/src/shared/authorization/RoleGuard.tsx`
  * 12 `page.tsx` placeholder bajo `(app)/organizer/*`, `(app)/vendor/*`, `(admin)/*`
  * 9 Playwright specs en `web/src/tests/e2e/layouts.*.spec.ts`
  * Tests component en `web/src/tests/unit/navigation/` y `web/src/tests/unit/authorization/RoleGuard.test.tsx`
* **Modificados**:
  * `web/src/app/(public)/layout.tsx` (reemplazo completo)
  * `web/src/app/(auth)/layout.tsx` (reemplazo completo)
  * `web/src/app/(app)/layout.tsx` (reemplazo completo)
  * `web/src/app/(app)/organizer/layout.tsx` (reemplazo completo)
  * `web/src/app/(app)/vendor/layout.tsx` (reemplazo completo)
  * `web/src/app/(admin)/layout.tsx` (reemplazo completo)
  * `web/src/shared/authorization/index.ts` (re-export de `RoleGuard`)
  * `web/src/messages/<locale>/navigation.json` (4 locales × 52 claves nuevas)
  * `web/tailwind.config.ts` (paleta semántica mínima)
  * `web/README.md` (sección "Layouts & Navigation")

### Recommended order of implementation

1. **Tipos y constantes**: `nav-items.ts` con `ORGANIZER_NAV_ITEMS`, `VENDOR_NAV_ITEMS`, `ADMIN_NAV_ITEMS`; `types.ts` con `NavItem`.
2. **Paleta Tailwind**: extender `theme.extend.colors` en `tailwind.config.ts`.
3. **Catálogos i18n**: agregar las 52 claves a `navigation.json` × 4 locales. `es-LATAM` traducido; placeholders detectables en los otros 3.
4. **Componentes simples**: `<Logo>`, `<SkipLink>`, `<Footer>`, `<NotificationsBadge>`.
5. **`<NavLink>`**: lógica `usePathname()` + `aria-current="page"`.
6. **`<Sidebar>`**: `<nav aria-label>` + lista de `<NavLink>`.
7. **`<RoleGuard>`**: en `src/shared/authorization/`.
8. **`<UserMenu>`**: Headless UI `<Menu>` + iniciales + color determinístico + logout placeholder.
9. **`<MobileNav>`**: Headless UI `<Dialog>` con focus trap.
10. **`<Topbar>`**: composición de `<Logo>` (mobile), hamburguesa, `<NotificationsBadge>`, `<UserMenu>`, `<LocaleSwitcher>`.
11. **12 placeholders nuevos** de sidebar destinations.
12. **6 layouts** reemplazados en orden: `(public)` → `(auth)` → `(app)` → `(app)/organizer` → `(app)/vendor` → `(admin)`.
13. **Tests component** (Vitest + RTL).
14. **9 Tests E2E** Playwright.
15. **`web/README.md`** § "Layouts & Navigation".

### Decisions that must not be reopened

* 6 layouts reemplazan los esqueletos US-105 en sitio.
* Server vs Client por layout: `(public)`/`(auth)` Server; `(app)`/`(admin)` y sub Client.
* Sidebar items por rol exactos (paths formalizados).
* Logout placeholder NO llama a `POST /auth/logout` (eso es US-AUTH-*).
* `<NotificationsBadge>` placeholder visual sin dropdown.
* `<UserMenu>` con iniciales determinísticas (sin upload).
* Headless UI para `<Menu>` y `<Dialog>` (ya en stack US-103).
* `lucide-react` para iconos (ya en stack US-103).
* Responsive: Tailwind `lg` breakpoint cambia sidebar fija ↔ drawer.
* A11Y baseline WCAG 2.1 AA con `<SkipLink>`, `aria-current`, focus trap, contraste.
* Sin Server Actions, sin API Routes BFF, sin tokens en localStorage.
* Sin Toast/Theme provider, sin Breadcrumbs, sin search global, sin notificaciones reales, sin avatares reales (todos Future).
* Paleta semántica mínima en Tailwind (full design system es Future).

### Lo que NO debe implementarse

* Formularios reales de login/register/forgot-password.
* `authApi.login`/`logout`/`register`.
* Llamadas a `POST /auth/login`, `POST /auth/logout`.
* Features de dominio (event wizard, vendor profile real, admin moderation real).
* `<ToastProvider>`, `<ThemeProvider>`.
* `<Breadcrumbs>`, search global, command palette.
* Notificaciones reales (lista, polling, dropdown).
* Avatares reales con upload.
* `VendorPublicLayout` (vive en historia vendor public profile).
* Endpoints backend, MSW handlers nuevos.
* `<RoleGuard>` con lógica de fetch.
* Tokens en localStorage.
* Server Actions, API Routes BFF.

### Asunciones a preservar

* US-103, US-104, US-105, US-106 mergeadas.
* `useSession()` de US-106 retorna `{ user, role, isAuthenticated, isLoading, isError, refetch }`.
* `<LocaleSwitcher>` (US-104) se puede montar en cualquier layout.
* `lucide-react` y `@headlessui/react` instalados (US-103).
* Tailwind tokens default suficientes para MVP.
* MSW (US-106) permite override de `/auth/me` con `worker.use(...)` para E2E.

---

## 19. Task Generation Notes

### Suggested Task Groups

1. **Group A — Foundations** (tipos, constantes, paleta, i18n): `nav-items.ts`, `types.ts`, paleta Tailwind, 52 claves `navigation.json` × 4 locales.
2. **Group B — Componentes simples**: `<Logo>`, `<SkipLink>`, `<Footer>`, `<NotificationsBadge>`.
3. **Group C — Componentes con estado**: `<NavLink>`, `<Sidebar>`, `<RoleGuard>`.
4. **Group D — Componentes complejos**: `<UserMenu>` (Headless UI `<Menu>` + iniciales + logout placeholder), `<MobileNav>` (Headless UI `<Dialog>` + focus trap), `<Topbar>` (composición).
5. **Group E — Placeholders sidebar destinations** (12 `page.tsx`).
6. **Group F — Layouts**: 6 reemplazos en orden documentado.
7. **Group G — Tests component**.
8. **Group H — Tests E2E** (9 specs).
9. **Group I — Documentación**: `web/README.md` § "Layouts & Navigation" + housekeeping Doc 15 §19/§20.

### Required QA Tasks

* Tests component de los 9 componentes navegacionales (TS-01..TS-12).
* Tests component de `<RoleGuard>` (TS-02..TS-04).
* 9 E2E specs Playwright (TS-13..TS-21).
* Tests A11Y (A11Y-TS-01..09).

### Required Security Tasks

* Audit SEC-01..SEC-09 en code review (`<RoleGuard>` UX-only, no fetch propio, no localStorage, logout placeholder con JSDoc claro, sin Server Actions/BFF, iniciales sin email completo).

### Required Seed / Demo Tasks

Ninguna directa. Coordinación informativa con MSW (US-106): handlers permiten override de `role` para tests E2E.

### Required Documentation Tasks

* `web/README.md` § "Layouts & Navigation": estructura de los 6 layouts, lista de componentes navegacionales, convención de `<RoleGuard>`, paleta semántica Tailwind, A11Y baseline, cómo agregar item de sidebar.
* Housekeeping post-merge: amender Doc 15 §19 (footer simplificado), Doc 15 §20 (paths efectivos).

### Dependencies between tasks

* Group A bloquea B, C, D, E, F.
* Group B (`<Logo>`, `<Footer>`) bloquea Group F (layouts los consumen).
* Group C (`<NavLink>`, `<Sidebar>`, `<RoleGuard>`) bloquea Group F y Group D (`<UserMenu>` puede usar `<RoleGuard>`).
* Group D (`<UserMenu>`, `<MobileNav>`, `<Topbar>`) bloquea Group F (los layouts los consumen).
* Group E (12 placeholders) ortogonal; puede correr en paralelo a B-D.
* Group F (6 layouts) bloquea Group G + H (tests dependen de layouts implementados).
* Group I al final.

### Consolidated `tasks.md`

PB-P0-013 se cierra con US-107. Recomendable consolidar `management/development-tasks/P0/PB-P0-013/tasks.md` cuando ambas historias (US-106, US-107) hayan generado sus development tasks.

---

## 20. Technical Spec Readiness

| Check                                                  | Status |
| ------------------------------------------------------ | ------ |
| User Story approved or explicitly allowed for draft spec | Pass — `Approved with Minor Notes` con 14 decisiones cerradas |
| Product Backlog mapping found                          | Pass — PB-P0-013 encontrado |
| Decision Resolution reviewed if present                | N/A — no existe artefacto separado; decisiones en historia |
| Scope clear                                            | Pass |
| Architecture alignment clear                           | Pass — Doc 15 §11/§17-22, Doc 5 §5, ADRs FE-001/003/015 |
| API impact clear                                       | N/A — sin endpoints nuevos ni consumidos directamente |
| DB impact clear                                        | N/A — sin impacto DB |
| AI impact clear                                        | N/A |
| Security impact clear                                  | Pass — SEC-01..SEC-09 documentados; `<RoleGuard>` UX-only |
| Testing strategy clear                                 | Pass — 12 component + 9 E2E + 9 A11Y |
| Ready for Development Task Breakdown                   | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-107 está técnicamente lista para que la skill `eventflow-user-story-to-development-tasks` genere el plan de desarrollo. Las decisiones críticas están cerradas en `PO/BA Decisions Applied` de la historia (14 ítems), las dependencias estructurales (US-103/104/105 + US-106) están especificadas y la historia no tiene preguntas bloqueantes ni decisiones reabiertas. El alcance es amplio pero quirúrgicamente delimitado (6 layouts + 9 componentes + `<RoleGuard>` + 52 claves i18n + 12 placeholders) y el boundary con US-AUTH-*, US-108 y todas las historias de feature está formalizado para evitar scope creep.

Los tres `Documentation Alignment Required` (Doc 15 §19 footer simplificado, Doc 15 §20 paths formalizados, Doc 15 §20.3 admin impersonation Future) son **post-merge housekeeping**, no bloqueantes. La deuda funcional del logout placeholder está aceptada, documentada con JSDoc y coordinada con US-AUTH-*. Las decisiones MVP de placeholders visuales (`<NotificationsBadge>`, avatar iniciales determinísticas) hacen la demo evaluable sin requerir scope adicional.

Riesgo controlado: los riesgos identificados (focus trap, hidratación Client/Server, ICU formatting, paleta Tailwind, bundle de iconos, claves i18n) tienen mitigaciones explícitas en `Technical Risks & Mitigations` y están cubiertos por la suite de tests (12 component + 9 E2E + 9 A11Y). La trazabilidad explícita a Doc 15 §11/§17-22 / Doc 5 §5 / ADR-FE-001/003/015 da confianza para proceder con la generación de development tasks. Al cerrarse US-107 quedan completos **PB-P0-013** y **EPIC-FE-001 foundation**, desbloqueando US-AUTH-*, US-108 y todas las historias frontend de feature por dominio.

---

## Expected Final Response

Technical Specification created: Yes
Path: `management/technical-specs/P0/PB-P0-013/US-107-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P0-013
Execution Order: 13 (de 18 P0); posición 2 de 2 en el item
Next step: Run `eventflow-user-story-to-development-tasks`.

* Product Backlog mapping: **Found** (PB-P0-013).
* Decision Resolution artifact: **Not used** — decisiones formalizadas en `PO/BA Decisions Applied` (14 ítems).
* Blockers: ninguno.
* Documentation alignment warnings: 3 ítems no bloqueantes (Doc 15 §19 footer, Doc 15 §20 sidebar paths, Doc 15 §20.3 admin impersonation Future).
