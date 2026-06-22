# 🧾 User Story: Layouts completos y navegación por rol — `PublicLayout`/`AuthLayout`/`AppLayout`/`OrganizerLayout`/`VendorLayout`/`AdminLayout` con `<Topbar>`, `<Sidebar>` contextual, `<UserMenu>`, `<MobileNav>`, `<RoleGuard>` UX, skip-link y `<NotificationsBadge>` placeholder

## 🆔 Metadata

| Field              | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| ID                 | US-107                                                                                               |
| Epic               | EPIC-FE-001 — Frontend Next.js Application Foundation                                                |
| Backlog Item       | PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts                                       |
| Feature            | Layouts completos por rol + navegación contextual + componentes navegacionales transversales         |
| Module / Domain    | Platform / FE / Layouts                                                                              |
| User Role          | System                                                                                                |
| Priority           | Must Have (P0)                                                                                        |
| Status             | Approved with Minor Notes                                                                             |
| Owner              | Tech Lead / Frontend Lead                                                                             |
| Approved By        | PO/BA Review                                                                                          |
| Approval Date      | 2026-06-22                                                                                            |
| Ready for Development Tasks | Yes                                                                                          |
| Sprint / Milestone | MVP                                                                                                   |
| Created Date       | 2026-06-09                                                                                            |
| Last Updated       | 2026-06-22 (PO/BA approval gate)                                                                      |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** reemplazar los layouts esqueleto de US-105 (`<main>{children}</main>`/`<section>{children}</section>`) por **layouts completos por área** alineados a Doc 15 §19-20: (a) `PublicLayout` con header (logo, nav `Directorio`/`Login`/`Register`, `<LocaleSwitcher>` de US-104) y footer público; (b) `AuthLayout` con card centrado + branding + `<LocaleSwitcher>`; (c) `AppLayout` con `<Topbar>` (`<UserMenu>` con avatar/nombre/logout placeholder, `<LocaleSwitcher>`, `<NotificationsBadge>` count placeholder) + sidebar contextual; (d) `OrganizerLayout` con sidebar `Eventos`/`Notificaciones`/`Perfil`; (e) `VendorLayout` con sidebar `Dashboard`/`Mi perfil`/`Portfolio`/`Cotizaciones`/`Reviews`/`Notificaciones`; (f) `AdminLayout` con sidebar `Aprobación vendors`/`Moderación reviews`/`Usuarios`/`Seed-Demo`; entregar componentes transversales `<Sidebar>`, `<Topbar>`, `<NavLink>` (con `aria-current="page"`), `<UserMenu>`, `<MobileNav>` (drawer responsive), `<NotificationsBadge>` placeholder, `<RoleGuard allow={...}>` UX-only, `<SkipLink>` WCAG 2.1 AA; consumir `useSession()` (hidratado en US-106) para mostrar nombre/avatar/rol y para ocultar links por rol; mantener segmentos URL en inglés (Doc 15 §17) y copy 100 % i18n (`t('clave')`)
**So that** el MVP entregue UX coherente y profesional por rol que (1) las historias de feature por dominio (event wizard, vendor profile real, admin moderation, etc.) puedan colgar sus pantallas en un layout completo sin re-trabajo; (2) la demo académica sea evaluable visualmente con navegación funcional entre áreas; (3) se cumplan ADR-FE-003 (frontend UX-only; `<RoleGuard>` oculta pero no autoriza), ADR-FE-015 (middleware UX-only ya implementado en US-105) y Doc 15 §19-20 / §22 (Role guards UX); (4) se preserve la base sin Server Actions ni API Routes BFF, sin features de dominio y sin componentes que requieran data real más allá del session.

---

## 🧠 Business Context

### Context Summary

US-103/104/105/106 cerraron la foundation técnica: bootstrap + i18n + route groups con role guard middleware + data layer global con `<SessionProvider>` hidratado. **US-107 cierra PB-P0-013 entregando la presentación**: los layouts completos que hacen la app navegable como producto, no como esqueleto.

US-107 entrega 4 capas integradas:

1. **Layouts por área**: `PublicLayout`, `AuthLayout`, `AppLayout` (compartido por organizer+vendor), `OrganizerLayout`, `VendorLayout`, `AdminLayout`.
2. **Componentes navegacionales transversales** en `src/shared/navigation/`: `<Topbar>`, `<Sidebar>`, `<NavLink>`, `<UserMenu>`, `<MobileNav>`, `<NotificationsBadge>`, `<SkipLink>`, `<Footer>`, `<Logo>`.
3. **`<RoleGuard>` UX** en `src/shared/authorization/RoleGuard.tsx`: oculta children si el rol activo no está en la lista permitida; valor de fallback configurable; **no es boundary de seguridad** (ADR-FE-003).
4. **Catálogos i18n nuevos** en `messages/<locale>/navigation.json` con todas las claves de nav, sidebar items, user menu, etc. (4 locales).

La historia **no introduce** features de dominio (los placeholders de US-105 siguen como destino de los links hasta que cada historia los reemplace), no introduce data real más allá de `useSession()`, no entrega `<ToastProvider>` (diferido) ni `<ThemeProvider>` (Future), no agrega ningún endpoint backend, y no maneja submit de logout funcional (eso es US-AUTH-*; el botón "Cerrar sesión" del `<UserMenu>` llama un placeholder que invalida `['me']` y redirige a `/login`).

### Related Domain Concepts

* **Layouts por área** (Doc 15 §19): cada route group de US-105 reemplaza su `layout.tsx` esqueleto.
* **Navegación por rol** (Doc 15 §20): top-level items diferenciados; tabla de visibilidad §20.4.
* **Roles MVP** (Doc 5 §5): `organizer`, `vendor`, `admin`. Sin multi-rol simultáneo.
* **Frontend UX-only** (ADR-FE-003): `<RoleGuard>` solo oculta; el backend rechaza con 401/403 si llega un request inválido.
* **`useSession()`** (US-106): `{ user, role, isAuthenticated, isLoading, isError, refetch }` consumido por todos los layouts privados.
* **`<LocaleSwitcher>`** (US-104): montado en `PublicLayout` header, `AuthLayout` y `AppLayout` topbar.
* **Segmentos URL en inglés** (Doc 15 §17): `/organizer`, `/vendor`, `/admin`, `/vendors`, `/login`, `/register`, `/forgot-password`. Sin prefijo de locale.
* **WCAG 2.1 AA**: `<SkipLink>`, `aria-current="page"` en `<NavLink>`, focus trap en `<MobileNav>` drawer, contraste mínimo, `<nav aria-label>`, keyboard navigation.

### PO/BA Decisions Applied

| Decision                                              | Resolution                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope de US-107                                       | US-107 entrega exclusivamente: (a) reemplazo de los 6 layouts (`(public)`, `(auth)`, `(app)`, `(app)/organizer`, `(app)/vendor`, `(admin)`); (b) componentes `<Topbar>`, `<Sidebar>`, `<NavLink>`, `<UserMenu>`, `<MobileNav>`, `<NotificationsBadge>`, `<SkipLink>`, `<Footer>`, `<Logo>`; (c) `<RoleGuard>` UX; (d) claves i18n nuevas en `navigation.json` × 4 locales; (e) tests unit/component/E2E + A11Y; (f) `web/README.md` § "Layouts & Navigation". |
| Boundary con US-103/104/105/106/108/AUTH-* y features | US-103 (bootstrap), US-104 (i18n + `<LocaleSwitcher>`), US-105 (route groups + middleware + esqueleto layouts), US-106 (data layer + `useSession()` hidratado) **mergeadas**. **Login/Register/Forgot-password/Logout funcionales** → **US-AUTH-***. **Emisión de cookies** → **US-108**. **Notificaciones reales** (lista, marcar leído, polling) → historia de notificaciones (P1/P2). **Avatares reales** (upload + URL) → historia de profile (User Profile). **Features de dominio** (event wizard, vendor profile real, admin moderation, etc.) → cada historia dueña. |
| Logout placeholder                                    | El `<UserMenu>` incluye botón "Cerrar sesión". US-107 implementa una versión **placeholder**: al click, invalida `queryClient.invalidateQueries(['me'])` + `router.replace('/login')` + **NO** llama a `POST /auth/logout`. US-AUTH-* lo reemplaza por la llamada real. Esta UX placeholder no crea sesión "limpia" (la cookie sigue presente hasta US-108 logout) pero permite navegar a `/login` sin error. Documentado como temporal en JSDoc del componente. |
| `<NotificationsBadge>` placeholder                    | Renderiza un `<button>` con icono campana + badge "•" (sin número) en el topbar de `AppLayout`. Al click no abre dropdown (placeholder). Cuando la historia de notificaciones llegue, el count real y la dropdown la reemplazan. La presencia visual es necesaria ahora para la demo académica. |
| `<UserMenu>` avatar / nombre                          | Renderiza iniciales del usuario (primera letra de `displayName` o `email`) en un círculo de color generado deterministicamente (hash del `userId` → HSL hue). Sin uploads reales. Cuando llegue User Profile real, el `<UserMenu>` puede reemplazar con la URL de avatar. |
| Sidebar items por rol                                 | Heredados de Doc 15 §20.1/§20.2/§20.3. **Organizer**: Eventos (`/organizer/events`), Notificaciones (`/organizer/notifications`), Perfil (`/organizer/profile`). **Vendor**: Dashboard (`/vendor`), Mi perfil (`/vendor/profile`), Portfolio (`/vendor/portfolio`), Cotizaciones (`/vendor/quotes`), Reviews (`/vendor/reviews`), Notificaciones (`/vendor/notifications`). **Admin**: Aprobación vendors (`/admin/vendors`), Moderación reviews (`/admin/reviews`), Usuarios (`/admin/users`), Seed-Demo (`/admin/seed`). Los paths apuntan a placeholders/404 hasta que cada historia los implemente — **decisión PO**: la sidebar muestra los enlaces aunque la página destino aún no exista; click puede mostrar `not-found.tsx` o un placeholder mínimo. |
| Placeholders por sidebar item                         | Para que cada link de sidebar no rompa con 404, US-107 entrega `page.tsx` placeholder mínimo bajo cada path (`organizer/events`, `organizer/notifications`, `organizer/profile`, `vendor/profile`, etc.) con `<h1>{t('navigation.placeholder.<key>.title')}</h1>` + `<p>{t('navigation.placeholder.<key>.body')}</p>`. Total: 12 placeholders nuevos (3 organizer + 5 vendor + 4 admin + organizer/events ya existente como subroute). Cada historia owner los reemplazará. |
| Decisión "admin entra a (app)"                        | Heredada de US-105: el middleware no bloquea pero la navegación visual NO ofrece links a `(app)/organizer` ni `(app)/vendor` desde `AdminLayout`. **Confirmado en US-107**: `<UserMenu>` de admin no muestra "Cambiar a vista de organizer/vendor". Si admin escribe URL manual, ve el placeholder con `AppLayout` (no `AdminLayout`). |
| Responsive strategy                                   | Mobile-first: sidebar colapsada por defecto en viewport < 1024 px (lg breakpoint de Tailwind). En mobile, `<MobileNav>` drawer (overlay) accesible vía botón hamburguesa del `<Topbar>`. En desktop, sidebar fija a la izquierda. `<Topbar>` siempre visible. `PublicLayout` y `AuthLayout` mobile-friendly desde día 1. |
| A11Y mínimo WCAG 2.1 AA                              | `<SkipLink>` ("Saltar al contenido principal") en cada layout. `<NavLink>` con `aria-current="page"` cuando coincide pathname. `<MobileNav>` drawer con focus trap y close con `Escape`. Contraste mínimo 4.5:1 para texto, 3:1 para UI. `<nav aria-label>` semántico en cada `<Sidebar>`. `<button aria-expanded>` en hamburguesa. Lang dinámico (heredado US-104). Todos los iconos decorativos con `aria-hidden="true"`. |
| Iconos                                                | `lucide-react` (instalado US-103). Sin SVG inline ad-hoc; sin Font Awesome ni Material Icons. |
| Tailwind tokens                                       | Usar tokens default de Tailwind (color palette, spacing, typography). **No** se introduce design system completo en US-107 (Future). Sí se documenta una paleta semántica mínima en `tailwind.config.ts`: `primary`, `secondary`, `danger`, `success`, `neutral` mapeadas a paletas Tailwind existentes (ej. `primary → blue-600`). |
| Server vs Client Components por layout                | `PublicLayout` y `AuthLayout`: Server Components (lectura del locale via `getLocale()` para `<html lang>`; `<LocaleSwitcher>` queda Client por su naturaleza). `AppLayout`, `OrganizerLayout`, `VendorLayout`, `AdminLayout`: **Client Components** porque consumen `useSession()` y manejan estado UI (drawer abierto, dropdowns). Doc 15 §11. |
| Footer público                                        | `<Footer>` en `PublicLayout` con: logo, copyright "© 2026 EventFlow", links placeholder a `/about`, `/contact`, `/terms`, `/privacy` (apuntan a `not-found.tsx` hasta que existan; alternativa: solo mostrar texto sin links). **Decisión MVP**: solo copyright + logo; los links legales son Future. |
| `<Logo>` componente                                    | Componente simple con texto "EventFlow" estilizado (no imagen). Acepta `variant: 'full' | 'icon'` y `size: 'sm' | 'md' | 'lg'`. Sin asset binario (queda para diseño futuro). Link a `/` por defecto. |
| Tests E2E                                              | Playwright cubre: (a) público anonymous navega `/` → ve `PublicLayout` con `Directorio`/`Login`/`Register` + footer; (b) anonymous en `/login` ve `AuthLayout` con card y switcher; (c) authenticated organizer en `/organizer` ve `OrganizerLayout` con sidebar `Eventos`/`Notificaciones`/`Perfil`; (d) authenticated vendor en `/vendor` ve `VendorLayout` con sidebar `Dashboard`/`Mi perfil`/`Portfolio`/`Cotizaciones`/`Reviews`/`Notificaciones`; (e) authenticated admin en `/admin` ve `AdminLayout`; (f) mobile (viewport 375 px): sidebar oculta, hamburguesa abre drawer; (g) skip-link funcional con Tab; (h) click "Cerrar sesión" invalida sesión y redirige a `/login`; (i) `<RoleGuard allow={['admin']}>` con sesión organizer no renderiza children. |
| `<RoleGuard>` API                                      | `<RoleGuard allow={Role[]} fallback?: ReactNode>{children}</RoleGuard>`. Si `isLoading` → renderiza `fallback ?? null`. Si `role ∈ allow` → renderiza `children`. Si no → renderiza `fallback ?? null`. **No throw**. **No** redirect (eso lo hace middleware). Reutilizable en topbar, sidebar y dentro de páginas. |
| Documentation Alignment Required                       | (a) Doc 15 §20.3 menciona `Impersonación admin` como Future — US-107 lo confirma fuera de scope. (b) Doc 15 §19 menciona footer público con varios links; US-107 simplifica a copyright (decisión MVP); amender Doc 15 post-merge. (c) Doc 15 §20 lista navegación sin especificar paths exactos; US-107 los formaliza en `PO/BA Decisions Applied → Sidebar items por rol` — amender Doc 15 §20 post-merge para listar paths efectivos. |

### Assumptions

* US-103, US-104, US-105, US-106 **mergeadas** y operativas.
* `useSession()` de US-106 retorna `{ user, role, isAuthenticated, isLoading, isError, refetch }`.
* `<LocaleSwitcher>` de US-104 está exportado y se puede montar en cualquier layout.
* `lucide-react` está instalado (US-103).
* Tailwind tokens default son suficientes para MVP (design system completo es Future).
* `queryClient` accesible vía `useQueryClient()` para invalidar `['me']` en el logout placeholder.

### Dependencies

* `US-103` (bootstrap + `lucide-react`). Mergeada.
* `US-104` (`<LocaleSwitcher>` + i18n). Mergeada.
* `US-105` (route groups + layouts esqueleto a reemplazar + páginas placeholder + middleware). Mergeada.
* `US-106` (`useSession()` hidratado). Mergeada.
* `Doc 15 — Frontend Architecture Design` §11, §17, §18, §19, §20, §22.
* `Doc 5 — User Roles & Permissions Matrix` §5.
* `Doc 22 — ADRs` ADR-FE-001, ADR-FE-003, ADR-FE-015.
* **Sin dependencia técnica bloqueante con US-108 ni US-AUTH-***: el logout placeholder UX permite navegar al login; US-AUTH-* lo reemplaza por la llamada real cuando llegue.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — habilita la presentación de FR-AUTH-* (login form en `AuthLayout`), FR-USER-* (perfil en `OrganizerLayout`/`VendorLayout`), FR-EVENT-* (workspaces organizer), FR-VENDOR-* (workspaces vendor + perfil público en `VendorPublicLayout` Future), FR-ADMIN-* (panel admin). No implementa directamente ningún FR funcional. |
| Use Case(s)            | UC-AUTH-001 (login redirige a dashboard del rol — el dashboard renderiza `OrganizerLayout`/`VendorLayout`/`AdminLayout`), UC-AUTH-002 (logout — placeholder en US-107, real en US-AUTH-*). Transversal al resto.                                                |
| Business Rule(s)       | BR-AUTH-010 (organizers/vendors no ven panel admin — `<RoleGuard>` lo oculta en cliente; middleware US-105 lo bloquea), BR-AUTH-011 (frontend UX-only — `<RoleGuard>` no es source of truth).                                                                  |
| Permission Rule(s)     | Doc 5 §5 (3 roles MVP); ADR-FE-003 (`<RoleGuard>` solo UX).                                                                                                                                                                                                       |
| Data Entity / Entities | No aplica DB. Consume `AuthSession` (frontend model de US-106): `user.displayName`, `user.email`, `role`.                                                                                                                                                          |
| API Endpoint(s)        | No introduce. El logout placeholder NO llama a `POST /auth/logout` (eso es US-AUTH-*).                                                                                                                                                                              |
| NFR Reference(s)       | NFR-A11Y-* (WCAG 2.1 AA: skip-link, aria-current, focus trap, contraste, keyboard nav), NFR-I18N-* (copy 100 % i18n), NFR-PERF-FE-* (Server Components donde aplica; bundles split por route group).                                                                |
| Related ADR(s)         | ADR-ARCH-001, ADR-FE-001 (Next.js App Router), ADR-FE-003 (frontend UX-only — `<RoleGuard>` no autoriza), ADR-FE-015 (middleware UX).                                                                                                                              |
| Related Document(s)    | `/docs/5-User-Roles-Permissions-Matrix.md` §5; `/docs/15-Frontend-Architecture-Design.md` §11/§17/§18/§19/§20/§22; `/docs/20-Testing-Strategy.md`; `/docs/22-Architecture-Decision-Records.md`.                                                                    |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Frontend foundation — layouts + componentes navegacionales**
* Scope Boundary: **6 layouts + componentes nav transversales + `<RoleGuard>` UX + claves i18n + 12 placeholders de sidebar destinations + tests + docs**

### Explicitly Out of Scope

* **Login/Register/Forgot-password/Logout funcionales** → **US-AUTH-***. US-107 entrega un logout **placeholder** que invalida sesión cliente y redirige.
* **Emisión real de cookies** (`eventflow_session` HTTP-only, `eventflow_role`) → **US-108**.
* **Notificaciones reales** (lista, marcar leído, polling, contador real) → historia de notificaciones (P1/P2). US-107 entrega `<NotificationsBadge>` placeholder visual.
* **Avatares reales** (upload + storage + URL) → historia de profile. US-107 usa iniciales con color determinístico.
* **Páginas de feature** (event wizard, vendor profile real, admin moderation real, perfil organizer/vendor, etc.) → cada historia dueña. US-107 entrega solo placeholders mínimos para que los links de sidebar no rompan.
* **`VendorPublicLayout`** (hero de vendor + tabs) → historia vendor public profile.
* **`<ToastProvider>`** y toasts globales → diferido (US-107 no introduce sistema de toasts; las features lo agregarán cuando lo requieran o se cubrirá en una historia UI dedicada).
* **`<ThemeProvider>`** y dark mode → Future.
* **Design system completo** (tokens semánticos completos, componentes base estilizados) → historia UI dedicada / Future.
* **`<Breadcrumbs>`** → diferido (Future; los layouts no lo requieren en MVP).
* **Search global / command palette** → Future.
* **Impersonación admin** ("Cambiar a vista de organizer/vendor") → Future (Doc 15 §20.3).
* **Footer links legales** (`/about`, `/contact`, `/terms`, `/privacy`) → Future. US-107 footer solo lleva copyright + logo.
* **Server Actions, API Routes BFF** → prohibidos (Doc 15 §6, ADR-FE-002/003).

### Scope Notes

* Los layouts de US-105 (esqueleto `<main>{children}</main>` / `<section>{children}</section>`) se **reemplazan en sitio**. Los placeholders de US-105 (`(public)/page.tsx`, `(auth)/login/page.tsx`, etc.) **no se modifican** — siguen siendo los destinos de los nav links.
* US-107 agrega 12 placeholders nuevos para que cada link de sidebar tenga destino: `organizer/events/page.tsx`, `organizer/notifications/page.tsx`, `organizer/profile/page.tsx`, `vendor/profile/page.tsx`, `vendor/portfolio/page.tsx`, `vendor/quotes/page.tsx`, `vendor/reviews/page.tsx`, `vendor/notifications/page.tsx`, `admin/vendors/page.tsx`, `admin/reviews/page.tsx`, `admin/users/page.tsx`, `admin/seed/page.tsx`.
* Todos los iconos vienen de `lucide-react`; todos los textos via `t('clave')`; sin hardcoded strings (lint US-104 activo).
* `<RoleGuard>` vive en `src/shared/authorization/` (mismo módulo que el middleware de US-105) y se exporta por el barrel.
* `<NotificationsBadge>`, `<UserMenu>`, `<MobileNav>`, etc. viven en `src/shared/navigation/`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: 6 layouts completos reemplazan los esqueletos de US-105

**Given** US-105/106 mergeadas con `<SessionProvider>` hidratado
**When** se inspecciona `web/src/app/`
**Then** los 6 layouts esqueleto se reemplazan por implementaciones completas:

* `(public)/layout.tsx`: Server Component. Renderiza `<SkipLink>`, `<header>` con `<Logo>` + nav (`Directorio` → `/vendors`, `Login` → `/login`, `Register` → `/register`) + `<LocaleSwitcher>` + `<main id="main-content">{children}</main>` + `<Footer>`.
* `(auth)/layout.tsx`: Server Component. Renderiza `<SkipLink>`, `<header>` simple con `<Logo>` + `<LocaleSwitcher>`, `<main id="main-content"><div className="auth-card">{children}</div></main>`.
* `(app)/layout.tsx`: Client Component (`'use client'`). Renderiza `<SkipLink>`, `<Topbar>` (incluye `<UserMenu>`, `<NotificationsBadge>`, `<LocaleSwitcher>`, botón hamburguesa mobile), `<MobileNav>` (drawer mobile con sidebar dinámica), `<main id="main-content">{children}</main>`. NO renderiza sidebar directamente — eso lo hacen los sub-layouts.
* `(app)/organizer/layout.tsx`: Client Component. Renderiza `<div className="flex">{<Sidebar items={ORGANIZER_NAV_ITEMS} ariaLabel={t('navigation.sidebar.organizer.label')} />}<section className="flex-1">{children}</section></div>`.
* `(app)/vendor/layout.tsx`: Análogo con `VENDOR_NAV_ITEMS` y `t('navigation.sidebar.vendor.label')`.
* `(admin)/layout.tsx`: Client Component. Renderiza `<SkipLink>`, `<Topbar>` propio (con sidebar admin items), `<MobileNav>` admin, `<main>` con sidebar `ADMIN_NAV_ITEMS` + `<section>{children}</section>`.

**And** todos los layouts respetan i18n (cero hardcoded strings).
**And** los placeholders existentes de US-105 (`(public)/page.tsx`, `(auth)/login/page.tsx`, etc.) siguen renderizando.

---

### AC-02: Componentes navegacionales transversales

**Given** la app construida
**When** se inspecciona `web/src/shared/navigation/`
**Then** existen los siguientes componentes exportados (Client Components salvo donde se indique):

* `<Topbar>` recibe `{ navItems?: NavItem[] }` y renderiza barra superior con `<Logo>` (mobile), botón hamburguesa (mobile), título contextual (desktop), `<NotificationsBadge>`, `<UserMenu>`, `<LocaleSwitcher>`.
* `<Sidebar>` recibe `{ items: NavItem[]; ariaLabel: string }` y renderiza `<nav aria-label={ariaLabel}>` con lista de `<NavLink>`. Desktop: fixed/sticky a la izquierda, ancho 240 px. Mobile: oculta (drawer la usa).
* `<NavLink>` recibe `{ href: string; icon?: LucideIcon; children: ReactNode; exact?: boolean }`. Aplica `aria-current="page"` cuando `pathname === href` (o `pathname.startsWith(href)` si `!exact`). Aplica clase activa Tailwind.
* `<UserMenu>` lee `useSession()`. Si `!isAuthenticated`, no se renderiza. Si autenticado, renderiza botón con iniciales-en-círculo + `displayName` (oculto en mobile) + chevron. Click abre dropdown con: `Mi perfil` (link al perfil del rol), `Cerrar sesión` (placeholder logout — invalida `['me']` y `router.replace('/login')`).
* `<MobileNav>` recibe `{ items: NavItem[]; isOpen: boolean; onClose: () => void }`. Drawer con focus trap, `Escape` cierra, overlay clickeable. Renderiza items + close button. Solo visible cuando `isOpen`.
* `<NotificationsBadge>`: botón icono campana de `lucide-react` con badge `•` (sin número). Click no abre nada (placeholder; JSDoc lo documenta).
* `<SkipLink>`: `<a href="#main-content">` con texto `t('navigation.skipLink')`. Visible solo en focus; primer elemento focusable de cada layout.
* `<Footer>`: Server Component. Renderiza `<footer>` con `<Logo>` + copyright `© 2026 EventFlow` (texto plano i18n: `t('navigation.footer.copyright', { year: 2026 })`).
* `<Logo>` recibe `{ variant?: 'full' | 'icon'; size?: 'sm' | 'md' | 'lg' }`. Link a `/`. Texto "EventFlow" estilizado (sin asset). `aria-label={t('navigation.logo.label')}`.

**And** todos los componentes con `<button>` tienen `type="button"`.
**And** todos los iconos decorativos tienen `aria-hidden="true"`.

---

### AC-03: `<RoleGuard>` UX implementado y consumido

**Given** un usuario autenticado
**When** se inspecciona `web/src/shared/authorization/RoleGuard.tsx`
**Then** existe `<RoleGuard allow={Role[]} fallback?: ReactNode>{children}</RoleGuard>`:

* Lee `useSession()`.
* Si `isLoading` → renderiza `fallback ?? null`.
* Si `role ∈ allow` → renderiza `children`.
* Si no → renderiza `fallback ?? null`.
* JSDoc explícito: "UX guard; el backend es la única fuente de autorización. Cualquier request real al backend valida independientemente. ADR-FE-003."

**And** ejemplos de uso:

* `<RoleGuard allow={['admin']}>` envuelve cualquier link admin que apareciera por accidente en un layout no-admin.
* `<RoleGuard allow={['organizer', 'vendor']}>` envuelve un link a `(app)` que no debería verse en `(admin)`.

---

### AC-04: Claves i18n nuevas en `navigation.json` × 4 locales

**Given** US-104/105 con catálogos base
**When** se inspecciona `web/src/messages/<locale>/navigation.json`
**Then** se agregan las claves:

```text
navigation.logo.label
navigation.skipLink
navigation.public.directory
navigation.public.login
navigation.public.register
navigation.footer.copyright
navigation.sidebar.organizer.label
navigation.sidebar.organizer.events
navigation.sidebar.organizer.notifications
navigation.sidebar.organizer.profile
navigation.sidebar.vendor.label
navigation.sidebar.vendor.dashboard
navigation.sidebar.vendor.profile
navigation.sidebar.vendor.portfolio
navigation.sidebar.vendor.quotes
navigation.sidebar.vendor.reviews
navigation.sidebar.vendor.notifications
navigation.sidebar.admin.label
navigation.sidebar.admin.vendors
navigation.sidebar.admin.reviews
navigation.sidebar.admin.users
navigation.sidebar.admin.seed
navigation.topbar.menuOpen
navigation.topbar.menuClose
navigation.userMenu.myProfile
navigation.userMenu.logout
navigation.notifications.label
navigation.mobile.close
navigation.placeholder.organizerEvents.title
navigation.placeholder.organizerEvents.body
navigation.placeholder.organizerNotifications.title
navigation.placeholder.organizerNotifications.body
navigation.placeholder.organizerProfile.title
navigation.placeholder.organizerProfile.body
navigation.placeholder.vendorProfile.title
navigation.placeholder.vendorProfile.body
navigation.placeholder.vendorPortfolio.title
navigation.placeholder.vendorPortfolio.body
navigation.placeholder.vendorQuotes.title
navigation.placeholder.vendorQuotes.body
navigation.placeholder.vendorReviews.title
navigation.placeholder.vendorReviews.body
navigation.placeholder.vendorNotifications.title
navigation.placeholder.vendorNotifications.body
navigation.placeholder.adminVendors.title
navigation.placeholder.adminVendors.body
navigation.placeholder.adminReviews.title
navigation.placeholder.adminReviews.body
navigation.placeholder.adminUsers.title
navigation.placeholder.adminUsers.body
navigation.placeholder.adminSeed.title
navigation.placeholder.adminSeed.body
```

**And** `es-LATAM` 100 % completo; `es-ES`/`pt`/`en` con placeholders detectables `[<locale>] ...`.
**And** `navigation.footer.copyright` usa ICU MessageFormat con `{year, number}`.

---

### AC-05: 12 placeholders nuevos de sidebar destinations

**Given** los layouts implementados
**When** un usuario navega a cada link de sidebar
**Then** existe `page.tsx` placeholder mínimo con `<h1>{t('navigation.placeholder.<key>.title')}</h1>` + `<p>{t('navigation.placeholder.<key>.body')}</p>` en:

* `(app)/organizer/events/page.tsx`
* `(app)/organizer/notifications/page.tsx`
* `(app)/organizer/profile/page.tsx`
* `(app)/vendor/profile/page.tsx`
* `(app)/vendor/portfolio/page.tsx`
* `(app)/vendor/quotes/page.tsx`
* `(app)/vendor/reviews/page.tsx`
* `(app)/vendor/notifications/page.tsx`
* `(admin)/vendors/page.tsx`
* `(admin)/reviews/page.tsx`
* `(admin)/users/page.tsx`
* `(admin)/seed/page.tsx`

**And** cada placeholder es Server Component con `getTranslations`.
**And** cada historia de feature **reemplazará** su placeholder dueño sin tocar layouts.

---

### AC-06: Logout placeholder funcional UX

**Given** un usuario autenticado en cualquier ruta `(app)/*` o `(admin)/*`
**When** abre `<UserMenu>` y hace click en "Cerrar sesión"
**Then**:

* `queryClient.invalidateQueries({ queryKey: ['me'] })` se ejecuta.
* `router.replace('/login')` se invoca.
* `<UserMenu>` cierra el dropdown.

**And** **NO** se llama a `POST /auth/logout` (US-AUTH-* lo agrega).
**And** el botón está marcado en JSDoc como `placeholder; reemplazar por authApi.logout() en US-AUTH-*`.
**And** la cookie `eventflow_session` permanece (se limpiará cuando US-AUTH-* + US-108 implementen logout real).

---

### AC-07: Responsive WCAG 2.1 AA y mobile-first

**Given** la app construida
**When** se inspecciona en viewport mobile (375 px) y desktop (1280 px)
**Then**:

* **Mobile (≤ 1023 px)**: sidebar oculta; `<Topbar>` muestra hamburguesa; click hamburguesa abre `<MobileNav>` drawer con sidebar items; `Escape` cierra; overlay clickeable cierra; focus atrapado dentro del drawer mientras abierto.
* **Desktop (≥ 1024 px)**: sidebar fija a la izquierda (240 px); hamburguesa oculta; topbar sin botón hamburguesa.
* **`<SkipLink>`**: Tab desde inicio → `<SkipLink>` visible; Enter lleva foco a `#main-content`.
* **Contraste**: texto y botones cumplen ≥ 4.5:1 (text) / 3:1 (UI) en tema default Tailwind (neutral-900 sobre white, primary blue-600 sobre white verificado).
* **`<NavLink>` activo**: aplica `aria-current="page"` cuando el path coincide.
* **`<UserMenu>` dropdown**: tecla `Escape` cierra; click fuera cierra; navegación con flechas dentro del menú (Headless UI `<Menu>`).

---

### AC-08: Pipeline canónico verde y sin artefactos fuera de scope

**Given** el PR de US-107
**When** corren `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e`
**Then** todos los comandos terminan con exit 0
**And** el PR NO contiene:

* Formularios reales de login/register/forgot-password.
* `authApi.login`/`authApi.logout`/`authApi.register` reales (out of scope; US-AUTH-*).
* Notificaciones reales (lista, polling).
* Avatares reales subidos a storage.
* Features de dominio (event wizard, vendor profile real, admin moderation real).
* `<ToastProvider>` ni sistema de toasts.
* `<ThemeProvider>` ni dark mode.
* Server Actions (`'use server'`), API Routes BFF (`src/app/api/*`).
* `<RoleGuard>` con lógica de fetch o autorización real.
* Tokens en localStorage.

---

### AC-09: Tests Playwright E2E + component cubren layouts y navegación

**Given** Playwright + Vitest + Testing Library configurados
**When** se ejecuta `npm run test && npm run test:e2e`
**Then** pasan al menos:

* Component (Vitest + Testing Library):
  * `<NavLink>` aplica `aria-current="page"` con path matching.
  * `<RoleGuard allow={['admin']}>` con sesión organizer NO renderiza children.
  * `<RoleGuard allow={['organizer']}>` con sesión organizer renderiza children.
  * `<UserMenu>` con sesión anónima no se renderiza.
  * `<UserMenu>` con sesión autenticada renderiza iniciales correctas.
  * `<SkipLink>` aparece primero en orden de tab.
  * `<MobileNav>` cierra con `Escape`.
* E2E (Playwright):
  * `layouts.public.spec.ts`: anonymous en `/` ve nav `Directorio`/`Login`/`Register` + footer.
  * `layouts.auth.spec.ts`: anonymous en `/login` ve auth card sin sidebar.
  * `layouts.organizer.spec.ts`: con MSW retornando 200 `{ role: 'organizer' }`, navegar a `/organizer` muestra sidebar `Eventos`/`Notificaciones`/`Perfil` y `<UserMenu>` con iniciales.
  * `layouts.vendor.spec.ts`: análogo para vendor.
  * `layouts.admin.spec.ts`: análogo para admin con sidebar `Aprobación vendors`/`Moderación reviews`/`Usuarios`/`Seed-Demo`.
  * `layouts.mobile.spec.ts`: viewport 375 px, sidebar oculta, hamburguesa abre `<MobileNav>`.
  * `layouts.logout-placeholder.spec.ts`: click en "Cerrar sesión" → redirect a `/login`; `useSession()` (`['me']` invalidada) revalida.
  * `layouts.skip-link.spec.ts`: Tab desde load → skip-link visible; Enter lleva a `#main-content`.

---

### AC-10: A11Y baseline WCAG 2.1 AA validado

**Given** la app construida
**When** se ejecutan tests A11Y automatizados sobre los 6 layouts
**Then**:

* Cada layout tiene un `<h1>` único (provisto por la página, no por el layout) o ningún `<h1>` propio.
* Cada layout incluye `<SkipLink>` como primer elemento focusable.
* `<nav>` semántico con `aria-label` en `<Sidebar>` (`navigation.sidebar.<rol>.label`).
* `<main id="main-content">` en cada layout.
* `<button aria-expanded>` en hamburguesa.
* `<MobileNav>` drawer con focus trap funcional.
* `<NavLink>` con `aria-current="page"` cuando aplica.
* Contraste WCAG 2.1 AA verificado en componentes principales (manual o `axe-core` opcional).
* Lang dinámico heredado de US-104 funciona en cada layout.

---

## ⚠️ Edge Cases

### EC-01: `useSession()` `isLoading=true` durante primer render

**Given** un usuario navega a `/organizer` y `useQuery(['me'])` aún no resolvió
**When** `OrganizerLayout` se renderiza
**Then**:

* El layout renderiza estructura completa (sidebar, topbar) con `<UserMenu>` mostrando skeleton (círculo gris) en lugar de iniciales.
* `<RoleGuard>` retorna `fallback ?? null` (no renderiza children críticos).
* No se redirige (el middleware ya validó la cookie de sesión).

#### Handling

* `useSession()` expone `isLoading: true` desde el primer render hasta que `GET /me` responde.
* Después de la primera resolución, `staleTime: 60_000` (US-106) mantiene la sesión cacheada.

---

### EC-02: `useSession()` `isError=true` (backend caído)

**Given** backend caído (US-106 EC-01)
**When** `OrganizerLayout` renderiza
**Then**:

* Layout renderiza estructura.
* `<UserMenu>` muestra fallback ("Sesión no disponible" + click → `router.refresh()`).
* `<RoleGuard>` retorna fallback (no muestra contenido sensible al rol).

#### Handling

* El middleware ya cubre el caso anónimo. Si el usuario entró con cookie pero el backend está caído, el frontend muestra estado degradado sin crashear.

---

### EC-03: Sidebar con muchos items en viewport pequeño altura

**Given** un usuario en viewport con altura < 600 px (mobile landscape)
**When** abre `<MobileNav>` drawer
**Then** el drawer scrollea internamente; el close button siempre visible (sticky top); el skip-link no se duplica.

#### Handling

* `<MobileNav>` con `overflow-y: auto` y `max-height: 100vh`.
* `<SkipLink>` solo aparece en el layout principal, no dentro del drawer.

---

### EC-04: Logout placeholder con backend caído

**Given** un usuario click en "Cerrar sesión" y el backend está caído
**When** el placeholder ejecuta
**Then**:

* `queryClient.invalidateQueries(['me'])` se ejecuta (operación local, no llama red).
* `router.replace('/login')` se ejecuta.
* En `/login` el middleware vuelve a verificar la cookie; como sigue presente, redirige al dashboard del rol.
* **Bug conocido aceptable en MVP**: con backend caído, el usuario no puede "salirse" completamente hasta que el backend logout real (US-AUTH-*) limpie la cookie.

#### Handling

* JSDoc del placeholder documenta esta limitación.
* US-AUTH-* lo resuelve definitivamente.

---

### EC-05: Admin escribe URL `/organizer` manualmente

**Given** admin autenticado con `eventflow_role=admin`
**When** escribe `/organizer` en la URL
**Then** (heredado de US-105):

* Middleware permite pass-through.
* `AppLayout` + `OrganizerLayout` se renderizan con `<UserMenu>` mostrando iniciales del admin.
* Sidebar muestra items de organizer (no de admin).
* Páginas placeholder visibles.

#### Handling

* Documentado como decisión MVP (US-105). La navegación visual de admin NO ofrece links a `(app)/*`; solo URL manual.
* `<RoleGuard allow={['organizer', 'vendor']}>` puede usarse en el futuro para ocultar acciones sensibles del organizer si admin las accede manualmente.

---

### EC-06: Locale switch dentro de `(app)` con sesión

**Given** un organizer autenticado en `/organizer/events`
**When** cambia locale vía `<LocaleSwitcher>` (US-104)
**Then**:

* Cookie `eventflow_locale` se actualiza.
* `router.refresh()` re-renderiza el árbol con el nuevo locale.
* `<html lang>` cambia.
* `<SessionProvider>` NO se re-hidrata (la query `['me']` se mantiene; staleTime cubre).
* Sidebar items se re-renderizan con el nuevo locale.

#### Handling

* Comportamiento heredado de US-104. US-107 verifica en E2E que no rompe el layout autenticado.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                       | Message / Behavior                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | Los 6 layouts existentes en `src/app/` son **completos** (no esqueleto)                                                    | Test E2E falla → bloquea merge                      |
| VR-02 | Todos los componentes navegacionales viven en `src/shared/navigation/` con barrel export                                   | Revisión PR falla                                   |
| VR-03 | `<RoleGuard>` documentado como UX-only en JSDoc; sin lógica de fetch o autorización propia                                 | Test unit / revisión PR falla                       |
| VR-04 | Todas las claves de `navigation.json` presentes en los 4 locales; `es-LATAM` 100 % traducido                              | Test unit falla                                     |
| VR-05 | Cero hardcoded strings (lint `react/jsx-no-literals` de US-104 activo)                                                     | ESLint falla → bloquea merge                        |
| VR-06 | Cada layout incluye `<SkipLink>` como primer focusable y `<main id="main-content">`                                       | Test A11Y / E2E falla → bloquea merge               |
| VR-07 | Mobile `<MobileNav>` con focus trap + cierre por `Escape` + cierre por overlay                                            | Test component / E2E falla                          |
| VR-08 | `<NavLink>` aplica `aria-current="page"` correctamente                                                                     | Test component falla                                |
| VR-09 | El PR NO contiene formularios reales de login/register/forgot-password                                                     | Revisión PR falla (out of scope; US-AUTH-*)         |
| VR-10 | El PR NO contiene `authApi.login`/`logout`/`register` reales                                                               | Revisión PR falla (out of scope; US-AUTH-*)         |
| VR-11 | El PR NO contiene features de dominio (event wizard, vendor profile real, etc.)                                            | Revisión PR falla                                   |
| VR-12 | El PR NO contiene `<ToastProvider>` ni `<ThemeProvider>`                                                                   | Revisión PR falla (out of scope; Future)            |
| VR-13 | El PR NO contiene `<Breadcrumbs>` ni search global                                                                         | Revisión PR falla (out of scope; Future)            |
| VR-14 | Pipeline canónico Doc 21 §9.2 verde + tests E2E nuevos verdes                                                              | CI falla → bloquea merge                            |
| VR-15 | 12 placeholders de sidebar destinations creados                                                                            | Revisión PR / test E2E de navegación falla         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `<RoleGuard>` es **UX guard**, no security boundary (ADR-FE-003). Cualquier acción real al backend valida independientemente.                                       |
| SEC-02 | El frontend NO decide qué datos cargar basándose en `useSession().role` para autorización; solo para mostrar/ocultar UI. El backend decide en cada request.        |
| SEC-03 | El logout placeholder NO llama a `POST /auth/logout`. La limpieza efectiva de la cookie HTTP-only es responsabilidad del backend (US-AUTH-* + US-108).             |
| SEC-04 | Sin tokens en localStorage / sessionStorage (ADR-FE-015 / US-106 SEC-03). `<UserMenu>` solo lee `useSession()`.                                                     |
| SEC-05 | Iniciales de `<UserMenu>` no exponen el email completo en el DOM cuando hay `displayName` disponible.                                                              |
| SEC-06 | `<RoleGuard>` con `useSession()` que retorna `isLoading=true` NO debe mostrar children por defecto (evita flash de contenido prohibido).                            |
| SEC-07 | Sin Server Actions ni API Routes BFF (Doc 15 §6, ADR-FE-002/003).                                                                                                 |
| SEC-08 | `<MobileNav>` drawer NO contiene información sensible adicional a la del sidebar (no duplicar permissions ni claims).                                              |
| SEC-09 | Logs del placeholder logout en dev: `console.debug('userMenu.logout.placeholder')` sin valores de sesión.                                                          |

### Negative Authorization Scenarios

* Anonymous accediendo a un layout `(app)/*` o `(admin)/*` → middleware (US-105) redirige antes de que el layout se renderice. El layout nunca ve un usuario anónimo en producción.
* Usuario con `role=organizer` viendo `AdminLayout` accidentalmente → middleware redirige a `/403`; pero si por algún bug llega, `<RoleGuard allow={['admin']}>` en componentes admin críticos esconde el contenido. Defense in depth UX.
* Cookie de sesión revocada mid-session → `useQuery(['me'])` retorna 401 → `<SessionProvider>` expone `isAuthenticated=false`; el handler global 401 (US-106) limpia cache + redirect a `/login`.
* `<RoleGuard>` con `useSession()` aún `isLoading=true` → renderiza `fallback ?? null` (no flash).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

| Field                     | Value          |
| ------------------------- | -------------- |
| AI Feature                | None           |
| Provider Layer            | Not applicable |
| Human Validation Required | Not applicable |
| Persist AIRecommendation  | No             |
| Fallback Required         | Not applicable |

### Human-in-the-loop Rules

No aplica — esta historia no toca features IA. Los workspaces que en el futuro consumirán IA (organizer/events/[id]/ai, etc.) viven bajo los layouts creados aquí; la UX IA específica vive en historias `feature/ai-assistance/*`.

---

## 🎨 UX / UI Notes

| UX Area              | Notes                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screens              | Sin pantallas de feature nuevas. US-107 entrega los **marcos** (layouts) que las pantallas existentes y futuras habitarán.                                                                                |
| Componentes          | `<Topbar>`, `<Sidebar>`, `<NavLink>`, `<UserMenu>`, `<MobileNav>`, `<NotificationsBadge>` placeholder, `<SkipLink>`, `<Footer>`, `<Logo>`, `<RoleGuard>`.                                                |
| Primary Action       | N/A por layout (cada pantalla provee su CTA primaria).                                                                                                                                                  |
| Secondary Actions    | `<UserMenu>` → Mi perfil, Cerrar sesión; `<MobileNav>` → links de sidebar.                                                                                                                              |
| Loading State        | `<UserMenu>` con `useSession().isLoading=true`: skeleton (círculo gris). Sidebar items renderizan sin esperar sesión (no requieren rol para etiquetas).                                                  |
| Error State          | `useSession().isError=true`: `<UserMenu>` muestra fallback con CTA `router.refresh()`. `<RoleGuard>` retorna fallback. El layout sigue navegable.                                                       |
| Empty State          | N/A (los placeholders de US-105 + US-107 son el "empty" hasta que las features lleguen).                                                                                                                |
| Success State        | N/A                                                                                                                                                                                                    |
| Accessibility Notes  | WCAG 2.1 AA: `<SkipLink>`, `aria-current="page"`, focus trap en drawer, `<nav aria-label>`, contraste ≥ 4.5:1, `<html lang>` dinámico (heredado US-104), iconos decorativos `aria-hidden`, botones `type="button"`. |
| Responsive Notes     | Mobile-first; breakpoint `lg` (1024 px) cambia sidebar fija ↔ drawer. `<Topbar>` siempre fija. Tipografía responsive con Tailwind (`text-sm md:text-base`).                                              |
| i18n Notes           | 100 % i18n via `t('clave')`. Sin URLs traducidas (Doc 15 §17). Switcher montado en `PublicLayout`/`AuthLayout`/`AppLayout`.                                                                              |
| Currency Notes       | No aplica                                                                                                                                                                                              |

---

## 🛠 Technical Notes

### Frontend

| Topic            | Guidance                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / Page     | Sin rutas nuevas (los 12 placeholders nuevos viven bajo las rutas ya existentes en `(app)/organizer/*`, `(app)/vendor/*`, `(admin)/*`). Modifica 6 layouts.                                          |
| Components       | `src/shared/navigation/` (`Topbar`, `Sidebar`, `NavLink`, `UserMenu`, `MobileNav`, `NotificationsBadge`, `SkipLink`, `Footer`, `Logo`, `index.ts` barrel).                                            |
| State Management | Solo `useSession()` (US-106) y `useState` local para drawer abierto/cerrado. `useRouter()` para navegación. `useQueryClient()` para invalidar `['me']` en logout placeholder.                       |
| Forms            | No aplica (sin formularios).                                                                                                                                                                       |
| API Client       | No aplica (la única query es `['me']` via `useSession()` ya hidratada).                                                                                                                            |
| Middleware       | Sin cambios.                                                                                                                                                                                       |
| Tailwind tokens  | Mapear paleta semántica mínima en `tailwind.config.ts`: `colors.primary` → `blue-600`/`blue-700`/etc.; `colors.danger` → `red-*`; `colors.success` → `emerald-*`. Documentar en README.            |
| Path aliases     | `@/shared/navigation/...`, `@/shared/authorization/...`, `@/shared/auth-session/...` heredados.                                                                                                     |
| Iconos           | `lucide-react`. Importar named: `import { Menu, X, Bell, ChevronDown, LogOut, User, Calendar, Briefcase, etc. } from 'lucide-react'`.                                                                |
| Headless UI      | Usar `@headlessui/react` (instalado US-103) para `<Menu>` (dropdown del UserMenu), `<Dialog>` (drawer MobileNav con focus trap automático).                                                            |

---

### Backend

No aplica. US-107 no introduce endpoints ni consume nuevos. El logout placeholder NO llama a `/auth/logout` (US-AUTH-*).

---

### Database

No aplica.

---

### API

| Method | Endpoint              | Purpose                                                                          |
| ------ | --------------------- | -------------------------------------------------------------------------------- |
| —      | (no introduce nuevos) | El único endpoint consumido es `GET /api/v1/auth/me` heredado de US-106.         |

---

### Observability / Audit

| Topic                             | Required                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Correlation ID                    | No aplica directamente (no hay requests nuevos).                                          |
| Runtime logs                      | Dev: `console.debug('userMenu.logout.placeholder')` cuando se ejecuta. Prod: silencio.    |
| AdminAction                       | No aplica.                                                                                |
| AIRecommendation runtime creation | No aplica.                                                                                |
| CI logs                           | Lint + typecheck + test + build + test:e2e (heredado + nuevos tests de layouts y nav).   |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                  | Type           |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------- |
| TS-01 | `<NavLink>` aplica `aria-current="page"` cuando pathname coincide (exact) y cuando startsWith (no exact)  | Component      |
| TS-02 | `<RoleGuard allow={['admin']}>` con sesión `role='organizer'` NO renderiza children                       | Component      |
| TS-03 | `<RoleGuard allow={['organizer','vendor']}>` con sesión `role='organizer'` renderiza children            | Component      |
| TS-04 | `<RoleGuard>` con `isLoading=true` renderiza fallback                                                     | Component      |
| TS-05 | `<UserMenu>` con sesión anónima no se renderiza                                                            | Component      |
| TS-06 | `<UserMenu>` con `displayName='Ana Pérez'` muestra iniciales `AP`                                          | Component      |
| TS-07 | `<UserMenu>` color de círculo determinístico por `userId`                                                  | Component      |
| TS-08 | `<MobileNav>` cierra con `Escape`, overlay click y close button                                            | Component      |
| TS-09 | `<MobileNav>` con focus trap mientras abierto (Tab y Shift+Tab dentro)                                     | Component      |
| TS-10 | `<SkipLink>` aparece primero en orden de tab                                                              | Component      |
| TS-11 | `<Footer>` renderiza copyright con ICU MessageFormat `{year}`                                              | Component      |
| TS-12 | `<Logo variant='full' size='md'>` aplica clases correctas                                                  | Component      |
| TS-13 | E2E `layouts.public.spec.ts`: anonymous ve nav público + footer                                            | E2E            |
| TS-14 | E2E `layouts.auth.spec.ts`: anonymous en `/login` ve auth card sin sidebar                                | E2E            |
| TS-15 | E2E `layouts.organizer.spec.ts`: organizer ve sidebar `Eventos`/`Notificaciones`/`Perfil`                  | E2E            |
| TS-16 | E2E `layouts.vendor.spec.ts`: vendor ve sidebar 6 items                                                    | E2E            |
| TS-17 | E2E `layouts.admin.spec.ts`: admin ve sidebar 4 items                                                      | E2E            |
| TS-18 | E2E `layouts.mobile.spec.ts`: viewport 375 px, hamburguesa abre drawer                                     | E2E            |
| TS-19 | E2E `layouts.logout-placeholder.spec.ts`: click "Cerrar sesión" → `/login` + `['me']` invalidada           | E2E            |
| TS-20 | E2E `layouts.skip-link.spec.ts`: Tab → skip-link visible; Enter → foco a `#main-content`                  | E2E            |
| TS-21 | E2E `layouts.locale-switch.spec.ts`: cambiar locale en `(app)` re-renderiza sin perder sesión              | E2E            |
| TS-22 | Pipeline canónico Doc 21 §9.2 verde con tests nuevos                                                       | CI             |

---

### Negative Tests

| ID    | Scenario                                                                                                              | Expected Result                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| NT-01 | Anonymous accede a `/organizer` (sin cookie de sesión)                                                                 | Middleware (US-105) redirige antes de que `OrganizerLayout` renderice |
| NT-02 | `<RoleGuard>` con `isLoading=true` y sin fallback                                                                      | Renderiza `null`; no flash de contenido prohibido               |
| NT-03 | `<UserMenu>` con `useSession().isError=true`                                                                            | Muestra fallback "Sesión no disponible" con CTA refresh         |
| NT-04 | El PR introduce un formulario funcional de login en `(auth)/login/page.tsx`                                            | Revisión PR falla (VR-09; out of scope; US-AUTH-*)              |
| NT-05 | El PR introduce `<ToastProvider>` o un sistema de toasts                                                                | Revisión PR falla (VR-12)                                       |
| NT-06 | El PR introduce dark mode / `<ThemeProvider>`                                                                            | Revisión PR falla (VR-12)                                       |
| NT-07 | El PR introduce búsqueda global o command palette                                                                       | Revisión PR falla (VR-13)                                       |
| NT-08 | El PR introduce notificaciones reales con polling                                                                       | Revisión PR falla (out of scope)                                |
| NT-09 | El PR introduce avatares reales con upload                                                                              | Revisión PR falla (out of scope)                                |
| NT-10 | El PR introduce un endpoint backend o consume uno nuevo                                                                  | Revisión PR falla (out of scope)                                |
| NT-11 | Placeholder con string hardcoded en JSX                                                                                 | ESLint falla (VR-05; hereda VR de US-104)                       |
| NT-12 | `<RoleGuard>` con lógica de fetch propia                                                                                | Revisión PR falla (VR-03; SEC-01)                               |

---

### AI Tests

No aplica para esta historia.

### Authorization Tests

| ID         | Scenario                                                                          | Expected Result                                       |
| ---------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| AUTH-TS-01 | MSW retorna sesión `role='organizer'` → `/organizer` muestra `OrganizerLayout`     | Sidebar organizer + UserMenu con iniciales            |
| AUTH-TS-02 | MSW retorna sesión `role='vendor'` → `/vendor` muestra `VendorLayout`              | Sidebar vendor (6 items)                              |
| AUTH-TS-03 | MSW retorna sesión `role='admin'` → `/admin` muestra `AdminLayout`                 | Sidebar admin (4 items)                               |
| AUTH-TS-04 | MSW retorna 401 → anonymous accede a `/` (público)                                 | `PublicLayout` sin `<UserMenu>` visible              |
| AUTH-TS-05 | `<RoleGuard allow={['admin']}>` envuelve un link admin en `OrganizerLayout`        | Link no visible cuando sesión organizer               |
| AUTH-TS-06 | Click "Cerrar sesión" en `<UserMenu>`                                              | `['me']` invalidada + `router.replace('/login')`      |

---

### Accessibility Tests

| ID         | Scenario                                                                          | Expected Result                                  |
| ---------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-TS-01 | `<SkipLink>` primer focusable en cada layout; Enter lleva a `#main-content`        | E2E + manual                                     |
| A11Y-TS-02 | `<NavLink>` con `aria-current="page"` cuando pathname coincide                    | Component / DOM assertion                        |
| A11Y-TS-03 | `<MobileNav>` con focus trap (Tab y Shift+Tab no salen del drawer)                | Component + E2E                                  |
| A11Y-TS-04 | `<MobileNav>` cierra con `Escape`                                                  | E2E                                              |
| A11Y-TS-05 | `<UserMenu>` dropdown navegable con flechas, cierra con `Escape`                  | E2E                                              |
| A11Y-TS-06 | `<button aria-expanded>` en hamburguesa refleja estado del drawer                  | E2E                                              |
| A11Y-TS-07 | Contraste de texto principal y botones ≥ 4.5:1 (Tailwind defaults verificados)    | Manual + axe-core opcional                       |
| A11Y-TS-08 | `<html lang>` dinámico heredado de US-104 funciona en cada layout                  | E2E                                              |
| A11Y-TS-09 | `<nav aria-label>` semántico en cada `<Sidebar>`                                   | Component / DOM assertion                        |

---

## 📊 Business Impact

| Field               | Value                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | UX coherente por rol; demo readiness académica (la app se ve como producto, no como esqueleto); cumplimiento WCAG 2.1 AA baseline; reducción de re-trabajo en historias de feature (los layouts ya están) |
| Expected Impact     | Cierra PB-P0-013 y EPIC-FE-001 foundation; desbloquea visualmente todas las historias frontend de feature; permite presentación académica con navegación funcional   |
| Success Criteria    | PR mergeado + pipeline canónico verde + 22 tests funcionales / 12 negativos / 6 auth / 9 A11Y verdes + 6 layouts completos + 12 placeholders + i18n 4 locales        |
| Academic Demo Value | Alto — la app demuestra navegación profesional por rol, A11Y baseline, i18n funcional, RoleGuard UX vs backend authority (ADR-FE-003); evidencia clara de arquitectura UX-only |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear `src/shared/navigation/` con `Topbar.tsx`, `Sidebar.tsx`, `NavLink.tsx`, `UserMenu.tsx`, `MobileNav.tsx`, `NotificationsBadge.tsx`, `SkipLink.tsx`, `Footer.tsx`, `Logo.tsx`, `types.ts`, `index.ts`.
* Crear `src/shared/authorization/RoleGuard.tsx` (Client Component); actualizar barrel.
* Reemplazar `(public)/layout.tsx` (Server Component completo con header + footer).
* Reemplazar `(auth)/layout.tsx` (Server Component con auth card).
* Reemplazar `(app)/layout.tsx` (Client Component con `<Topbar>` + `<MobileNav>`).
* Reemplazar `(app)/organizer/layout.tsx` con sidebar organizer.
* Reemplazar `(app)/vendor/layout.tsx` con sidebar vendor.
* Reemplazar `(admin)/layout.tsx` (Client Component) con sidebar admin.
* Crear los 12 `page.tsx` placeholder bajo `(app)/organizer/*`, `(app)/vendor/*`, `(admin)/*`.
* Agregar paleta semántica mínima a `tailwind.config.ts`.
* Agregar todas las claves nuevas a `messages/<locale>/navigation.json` × 4 locales.

### Potential Backend Tasks

Ninguna. US-107 es 100 % frontend.

### Potential Database Tasks

Ninguna.

### Potential AI / PromptOps Tasks

Ninguna.

### Potential QA Tasks

* Tests component de los 9 componentes navegacionales (TS-01..TS-12).
* Tests component de `<RoleGuard>` (TS-02..TS-04).
* Tests E2E Playwright de los 6 layouts (TS-13..TS-17).
* Tests E2E mobile responsive (TS-18).
* Tests E2E logout placeholder (TS-19).
* Tests E2E skip-link y locale switch (TS-20, TS-21).
* Tests A11Y baseline (A11Y-TS-01..09).

### Potential DevOps / Config Tasks

* Validar que `tailwind.config.ts` con paleta semántica no rompe el build.
* (Opcional) Agregar test de bundle size por route group para evitar regresiones (Future).

### Potential Documentation Tasks

* `web/README.md` § "Layouts & Navigation": estructura de los 6 layouts, lista de componentes navegacionales, convención de `<RoleGuard>`, paleta semántica Tailwind, A11Y baseline, cómo agregar un nuevo item de sidebar.
* Housekeeping post-merge: amender Doc 15 §19/§20 con paths efectivos y simplificación del footer.

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: 6 layouts completos + componentes nav + `<RoleGuard>` + i18n + placeholders + tests.
* [x] Boundary formalizado con US-103/104/105/106/108/AUTH-* y features de dominio.
* [x] Decisiones cerradas (Doc 15 §19/§20/§22, Doc 5 §5, ADR-FE-003/015): layouts por área, items de sidebar por rol, RoleGuard UX, responsive strategy, A11Y baseline, logout placeholder, NotificationsBadge placeholder, UserMenu iniciales.
* [x] Acceptance Criteria testables y atómicos (AC-01..AC-10).
* [x] Edge cases documentados (EC-01..EC-06).
* [x] Out of Scope explícito (login real, toasts, theme, breadcrumbs, search, features, etc.).
* [x] Validation rules y SEC rules claros (VR-01..VR-15, SEC-01..SEC-09).
* [x] Tests definidos (TS-01..TS-22, NT-01..NT-12, AUTH-TS-01..06, A11Y-TS-01..09).
* [x] Trazabilidad a Doc 5/15/22 y ADRs FE-001/003/015.
* [ ] Tech Lead frontend validó.

---

## 🏁 Definition of Done

* [ ] Los 6 layouts completos reemplazan los esqueletos de US-105.
* [ ] `src/shared/navigation/` con los 9 componentes versionados.
* [ ] `<RoleGuard>` en `src/shared/authorization/` con tests.
* [ ] 12 placeholders nuevos de sidebar destinations creados.
* [ ] Catálogos i18n `navigation.json` actualizados en los 4 locales.
* [ ] Paleta semántica mínima agregada a `tailwind.config.ts`.
* [ ] Tests component / E2E / A11Y verdes (TS-01..TS-22, NT-01..NT-12, AUTH-TS-01..06, A11Y-TS-01..09).
* [ ] Pipeline canónico Doc 21 §9.2 verde.
* [ ] `web/README.md` § "Layouts & Navigation" actualizado.
* [ ] PR revisado por Tech Lead frontend.

---

## 📝 Notes

* US-107 cierra **PB-P0-013** y **EPIC-FE-001 foundation**. A partir de aquí, cada historia de feature reemplaza un placeholder y consume layouts existentes — sin re-trabajo de marco.
* Los componentes navegacionales son **transversales**: cualquier historia futura puede importarlos sin modificarlos. Cambios estructurales requieren ADR.
* `<NotificationsBadge>` y el avatar con iniciales son placeholders **visuales** intencionales — la demo académica luce profesional aunque las features de notificaciones y profile no estén implementadas.
* El logout placeholder es la única deuda funcional de US-107; US-AUTH-* la cierra al implementar `authApi.logout()`.

### Documentation Alignment Required (no bloqueante)

* **Doc 15 §19 Footer**: el documento menciona footer con links a `/about`, `/contact`, `/terms`, `/privacy`. US-107 simplifica a copyright + logo (decisión MVP; los links legales son Future). Acción: amender Doc 15 §19 post-merge.
* **Doc 15 §20 Sidebar items**: el documento lista items por rol sin paths exactos. US-107 formaliza los paths efectivos en `PO/BA Decisions Applied → Sidebar items por rol`. Acción: amender Doc 15 §20 post-merge para listar paths.
* **Doc 15 §20.3 Admin impersonation**: el documento menciona "puede impersonar vía endpoint admin si se habilita; Future". US-107 confirma fuera de scope. Sin acción adicional (ya está marcado Future).
* **Decisión "admin escribe URL /organizer"**: heredada de US-105. US-107 confirma que `AdminLayout` no ofrece links a `(app)/*` pero permite acceso por URL manual. Documentado en notas.

### Coordinación con historias siguientes

* **US-AUTH-*** reemplaza el logout placeholder por `authApi.logout()` real (llama `POST /auth/logout`, limpia cookies, invalida cache, redirige).
* **US-108** entrega la cookie de sesión real; sin cambios en US-107.
* **Historias por feature** reemplazan los 12 placeholders sin tocar layouts. Cada historia owner es libre de extender el sidebar de su rol si justifica un nuevo item (requiere amend de `navigation.json` y de la constante `*_NAV_ITEMS`).
* **Historia de notificaciones** (P1/P2) reemplaza `<NotificationsBadge>` placeholder por implementación real con polling/SSE.
* **Historia de User Profile** reemplaza iniciales de `<UserMenu>` por URL de avatar real si aplica.
