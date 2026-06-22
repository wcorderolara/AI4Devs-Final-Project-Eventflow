# Development Tasks — PB-P0-013 / US-107: Layouts completos y navegación por rol

## 1. Metadata

| Field                                  | Value                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| User Story ID                          | US-107                                                                                               |
| Source User Story                      | `management/user-stories/US-107-layouts-and-navigation.md`                                            |
| Source Technical Specification         | `management/technical-specs/P0/PB-P0-013/US-107-technical-spec.md`                                    |
| Decision Resolution Artifact           | No existe — decisiones formalizadas en `PO/BA Decisions Applied` de la historia (14 ítems)            |
| Priority                               | P0                                                                                                   |
| Backlog ID                             | PB-P0-013                                                                                            |
| Backlog Title                          | Frontend Data Layer: TanStack Query + MSW + Layouts                                                  |
| Backlog Execution Order                | 13 (de 18 items P0 priorizados)                                                                      |
| User Story Position in Backlog Item    | 2 de 2                                                                                               |
| Related User Stories in Backlog Item   | US-106 (data layer foundation), US-107 (layouts completos por rol)                                    |
| Epic                                   | EPIC-FE-001 — Frontend Next.js Application Foundation                                                |
| Backlog Item Dependencies              | PB-P0-012 (US-103/104/105 mergeadas) + US-106 mergeada                                                |
| Feature                                | Layouts completos por rol + navegación contextual + componentes navegacionales transversales         |
| Module / Domain                        | Platform / FE / Layouts                                                                              |
| Backlog Alignment Status               | Found                                                                                                |
| Task Breakdown Status                  | Ready for Sprint Planning                                                                            |
| Created Date                           | 2026-06-22                                                                                           |
| Last Updated                           | 2026-06-22                                                                                           |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                                                                          |
| ---------------------------- | ----- | ---- | ---------------------------------------------------------------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`; 10 AC, 6 EC, 15 VR, 9 SEC                                          |
| Technical Specification      | Yes   | Yes  | Fuente primaria — `Ready for Task Breakdown`                                                  |
| Decision Resolution Artifact | No    | N/A  | No existe; 14 decisiones en `PO/BA Decisions Applied`                                          |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P0-013, posición 13 de 18, depende de PB-P0-012 + US-106                                     |
| ADRs                         | Yes   | Yes  | ADR-FE-001, ADR-FE-003 (FE UX-only), ADR-FE-015                                                |

---

## 3. Backlog Execution Context

### Parent Backlog Item

**PB-P0-013 — Frontend Data Layer: TanStack Query + MSW + Layouts**. Item P0 que cierra EPIC-FE-001 foundation. US-107 lo finaliza. Acceptance summary backlog: "Layouts por rol con navegación específica; Smoke por route group pasa".

### Execution Order Rationale

PB-P0-013 ocupa la **posición 13 de 18**. US-107 es la **segunda y última historia** del item; cierra **PB-P0-013** y **EPIC-FE-001 foundation**. Depende de US-105 (route groups con layouts esqueleto a reemplazar) y US-106 (`useSession()` hidratado, consumido por `<UserMenu>` y `<RoleGuard>`). Las tareas se ordenan por dependencia de implementación: tipos/constantes/i18n → componentes simples → componentes con estado → componentes complejos → placeholders → 6 layouts → tests → docs.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                            | Suggested Order |
| ---------- | ------------------------------------------------------------------------------- | --------------- |
| US-106     | Data layer foundation                                                            | 1               |
| US-107     | Layouts completos por rol — consume `useSession()` hidratado                     | 2               |

---

## 4. Task Breakdown Summary

| Area                       | Number of Tasks | Notes                                                                                                  |
| -------------------------- | --------------: | ------------------------------------------------------------------------------------------------------ |
| Frontend (FE)              | 18              | Foundations + 9 componentes navegacionales + `<RoleGuard>` + 12 placeholders + 6 layouts               |
| QA / Testing               | 5               | Component tests + 9 E2E specs + A11Y + pipeline                                                         |
| Security / Authorization   | 1               | Audit SEC-01..SEC-09 + `<RoleGuard>` UX-only invariants                                                |
| DevOps / Environment       | 1               | Paleta semántica en `tailwind.config.ts`                                                                |
| Documentation              | 2               | `web/README.md` § "Layouts & Navigation"; housekeeping Doc 15 §19 / §20                                |
| **Total**                  | **27**          |                                                                                                        |

---

## 5. Traceability Matrix

| Acceptance Criterion                                                                                          | Technical Spec Section                                              | Task IDs                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| AC-01 6 layouts completos reemplazan esqueletos US-105                                                        | §6 (AC-01), §8 Routes/Pages, §18 paso 12                              | TASK-PB-P0-013-US-107-FE-013, FE-014, FE-015, FE-016, FE-017, FE-018                                     |
| AC-02 9 componentes navegacionales transversales                                                              | §6 (AC-02), §8 Components, §18 paso 4-10                              | TASK-PB-P0-013-US-107-FE-004, FE-005, FE-006, FE-007, FE-008, FE-009, FE-010, FE-011, FE-012             |
| AC-03 `<RoleGuard>` UX                                                                                        | §6 (AC-03), §12 Authorization, §18 paso 7                              | TASK-PB-P0-013-US-107-FE-008                                                                            |
| AC-04 Claves i18n nuevas × 4 locales                                                                          | §6 (AC-04), §8 i18n, §18 paso 3                                       | TASK-PB-P0-013-US-107-FE-003                                                                            |
| AC-05 12 placeholders nuevos de sidebar destinations                                                          | §6 (AC-05), §8 Routes/Pages, §18 paso 11                              | TASK-PB-P0-013-US-107-FE-019                                                                            |
| AC-06 Logout placeholder funcional UX                                                                         | §6 (AC-06), §12 SEC-03                                                | TASK-PB-P0-013-US-107-FE-009 (UserMenu)                                                                 |
| AC-07 Responsive WCAG 2.1 AA y mobile-first                                                                   | §6 (AC-07), §8 Accessibility, §17 Risks                                | TASK-PB-P0-013-US-107-FE-010 (MobileNav), FE-013..FE-018, QA-001..QA-004                                |
| AC-08 Pipeline canónico verde y sin artefactos fuera de scope                                                  | §6 (AC-08), §13 CI Checks, §4 Scope                                   | TASK-PB-P0-013-US-107-QA-005, TASK-PB-P0-013-US-107-SEC-001                                              |
| AC-09 Tests Playwright E2E + component                                                                         | §13 Component / E2E Tests                                              | TASK-PB-P0-013-US-107-QA-001, QA-002, QA-003                                                            |
| AC-10 A11Y baseline WCAG 2.1 AA validado                                                                      | §13 Accessibility Tests                                                | TASK-PB-P0-013-US-107-QA-004                                                                            |

Cada AC mapea a ≥ 1 tarea. Todas las tareas mapean a ≥ 1 sección del Technical Spec.

---

## 6. Development Tasks

### TASK-PB-P0-013-US-107-FE-001 — Crear tipos y constantes `NavItem` + `*_NAV_ITEMS`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | — (US-106 mergeada)                                                                                 |
| Source AC(s)              | AC-01, AC-02                                                                                        |
| Technical Spec Section(s) | §8 Components (firmas TypeScript), §18 paso 1                                                        |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Declarar tipos y constantes inmutables que alimentan todas las sidebars.

#### Scope

##### Include

* `web/src/shared/navigation/types.ts`:
  * `import type { LucideIcon } from 'lucide-react'`.
  * `export type NavItem = { href: string; labelKey: string; icon: LucideIcon; exact?: boolean }`.
* `web/src/shared/navigation/nav-items.ts`:
  * `ORGANIZER_NAV_ITEMS: NavItem[]` (3 items: events, notifications, profile).
  * `VENDOR_NAV_ITEMS: NavItem[]` (6 items: dashboard `exact: true`, profile, portfolio, quotes, reviews, notifications).
  * `ADMIN_NAV_ITEMS: NavItem[]` (4 items: vendors, reviews, users, seed).

##### Exclude

* No agregar items extra (decisión PO).
* No implementar lógica todavía.

#### Implementation Notes

* Importar iconos lucide named: `Calendar, Bell, User, LayoutDashboard, Briefcase, FileText, Star, ShieldCheck, MessageSquare, Users, Database`.

#### Acceptance Criteria Covered

AC-01, AC-02.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] `npm run typecheck` pasa.

---

### TASK-PB-P0-013-US-107-FE-002 — Agregar paleta semántica a `tailwind.config.ts`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Setup                                                                                               |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | —                                                                                                   |
| Source AC(s)              | AC-07                                                                                               |
| Technical Spec Section(s) | §8 Tailwind tokens, §18 paso 2                                                                       |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Introducir paleta semántica mínima para uso consistente en componentes.

#### Scope

##### Include

* Modificar `web/tailwind.config.ts > theme.extend.colors`:
  * `primary: { 50..900: blue-* }`.
  * `secondary: { 50..900: slate-* }`.
  * `danger: { 50..900: red-* }`.
  * `success: { 50..900: emerald-* }`.
  * `neutral: { 50..900: gray-* }` (o reutilizar `neutral` default).

##### Exclude

* No introducir design system completo (Future).
* No introducir tokens de tipografía o spacing.

#### Implementation Notes

* Mapear a paletas Tailwind existentes (sin valores HEX custom). Documentar en README (TASK-DOC-001).

#### Acceptance Criteria Covered

AC-07.

#### Definition of Done

- [ ] `tailwind.config.ts` modificado.
- [ ] `npm run build` pasa.

---

### TASK-PB-P0-013-US-107-FE-003 — Agregar 52 claves i18n a `navigation.json` × 4 locales

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | —                                                                                                   |
| Source AC(s)              | AC-04                                                                                               |
| Technical Spec Section(s) | §6 (AC-04), §8 i18n, §18 paso 3                                                                      |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Agregar todas las claves i18n nuevas listadas en AC-04 de la historia a los 4 catálogos.

#### Scope

##### Include

* Editar `web/src/messages/<locale>/navigation.json` (4 locales: `es-LATAM`, `es-ES`, `pt`, `en`):
  * 52 claves nuevas (logo, skipLink, public, footer, sidebar.* por rol, topbar, userMenu, notifications, mobile, placeholder.* por sub-página).
* `es-LATAM` 100 % traducido.
* `es-ES`/`pt`/`en` con valores `[<locale>] <traducción placeholder>` detectables.
* ICU MessageFormat en `navigation.footer.copyright` con `{year}`.

##### Exclude

* No agregar claves fuera de la lista AC-04.
* No duplicar claves heredadas de US-104/US-105 (`errors.envelope.UNEXPECTED`, `common.retry`, `errors.notFound.*`, `errors.forbidden.*`).

#### Implementation Notes

* Mantener orden alfabético para revisar diffs.
* Validar JSON con `npm run lint` o un test rápido.

#### Acceptance Criteria Covered

AC-04.

#### Definition of Done

- [ ] 4 archivos JSON válidos.
- [ ] `es-LATAM` sin prefijo placeholder.
- [ ] Las otras 3 locales contienen todas las claves de `es-LATAM`.

---

### TASK-PB-P0-013-US-107-FE-004 — Crear `<Logo>` componente

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-002, TASK-PB-P0-013-US-107-FE-003                                            |
| Source AC(s)              | AC-02                                                                                               |
| Technical Spec Section(s) | §8 Components, §18 paso 4                                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Crear `<Logo>` reutilizable como Server Component con variantes y tamaños.

#### Scope

##### Include

* `web/src/shared/navigation/Logo.tsx`:
  * Server Component (default; sin `'use client'`).
  * Props: `{ variant?: 'full' | 'icon'; size?: 'sm' | 'md' | 'lg' }`.
  * Renderiza `<Link href="/">` con texto "EventFlow" estilizado.
  * `aria-label={t('navigation.logo.label')}`.
  * Sin asset binario.

##### Exclude

* No introducir SVG inline complejo.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Importable desde `@/shared/navigation`.

---

### TASK-PB-P0-013-US-107-FE-005 — Crear `<SkipLink>` componente

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-003                                                                         |
| Source AC(s)              | AC-02, AC-07, AC-10                                                                                  |
| Technical Spec Section(s) | §8 Accessibility, §18 paso 4                                                                         |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Componente A11Y obligatorio: primer focusable de cada layout que lleva a `#main-content`.

#### Scope

##### Include

* `web/src/shared/navigation/SkipLink.tsx`:
  * Client Component (`'use client'`) si requiere `useTranslations`; alternativamente Server con `getTranslations`.
  * `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2">{t('navigation.skipLink')}</a>`.

##### Exclude

* No introducir múltiples destinos (solo `#main-content`).

#### Acceptance Criteria Covered

AC-02, AC-07, AC-10.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Tests component (TASK-QA-001 / TS-10).

---

### TASK-PB-P0-013-US-107-FE-006 — Crear `<Footer>` con copyright ICU

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-004, TASK-PB-P0-013-US-107-FE-003                                            |
| Source AC(s)              | AC-02                                                                                               |
| Technical Spec Section(s) | §8 Components, §18 paso 4                                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Footer público con logo + copyright ICU `{year}`.

#### Scope

##### Include

* `web/src/shared/navigation/Footer.tsx`:
  * Server Component (default).
  * `<footer>` con `<Logo size="sm" />` + `<p>{t('navigation.footer.copyright', { year: 2026 })}</p>`.

##### Exclude

* No agregar links legales (Future).
* No agregar redes sociales.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Tests component (TASK-QA-001 / TS-11).

---

### TASK-PB-P0-013-US-107-FE-007 — Crear `<NotificationsBadge>` placeholder

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-003                                                                         |
| Source AC(s)              | AC-02                                                                                               |
| Technical Spec Section(s) | §8 Components, §18 paso 4                                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Placeholder visual de notificaciones (icono campana + badge `•`).

#### Scope

##### Include

* `web/src/shared/navigation/NotificationsBadge.tsx` (`'use client'`):
  * `<button type="button" aria-label={t('navigation.notifications.label')}>` con icono `Bell` (lucide) `aria-hidden="true"` + `<span aria-hidden="true">•</span>` posicionado como badge con Tailwind.
  * Click no abre dropdown (placeholder).
* JSDoc: `Placeholder visual. La historia de notificaciones (P1/P2) lo reemplazará por implementación real con polling/SSE.`

##### Exclude

* No introducir count real, dropdown, polling, ni llamadas a backend.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] JSDoc claro.

---

### TASK-PB-P0-013-US-107-FE-008 — Crear `<NavLink>` + `<Sidebar>` + `<RoleGuard>`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-001, TASK-PB-P0-013-US-107-FE-003                                            |
| Source AC(s)              | AC-02, AC-03                                                                                        |
| Technical Spec Section(s) | §6 (AC-02/03), §8 Components, §18 paso 5-7                                                          |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Componentes navegacionales con estado de routing y `<RoleGuard>` UX.

#### Scope

##### Include

* `web/src/shared/navigation/NavLink.tsx` (`'use client'`):
  * Props: `{ href: string; icon?: LucideIcon; children: ReactNode; exact?: boolean }`.
  * Usa `usePathname()` para `aria-current="page"` con `pathname === href` (o `pathname.startsWith(href)` si `!exact`).
  * Aplica clase activa Tailwind (ej. `bg-primary-50 text-primary-700`).
* `web/src/shared/navigation/Sidebar.tsx` (`'use client'`):
  * Props: `{ items: NavItem[]; ariaLabel: string }`.
  * `<nav aria-label={ariaLabel}>` con `<ul>` y `<li><NavLink>...</NavLink></li>` por cada item.
  * Desktop: `sticky top-0 w-60`; mobile: `hidden lg:block`.
* `web/src/shared/authorization/RoleGuard.tsx` (`'use client'`):
  * Props: `{ allow: Role[]; fallback?: ReactNode; children: ReactNode }`.
  * Lee `useSession()` (US-106).
  * Si `isLoading` → `fallback ?? null`.
  * Si `role && allow.includes(role)` → `children`.
  * Si no → `fallback ?? null`.
  * No throw. No redirect.
  * JSDoc explícito: "UX guard; ADR-FE-003: backend es la única fuente de autorización".
* Actualizar `web/src/shared/authorization/index.ts` (barrel) re-export `RoleGuard`.

##### Exclude

* No introducir lógica de fetch en `<RoleGuard>`.
* No introducir lógica de autorización efectiva.

#### Acceptance Criteria Covered

AC-02, AC-03.

#### Definition of Done

- [ ] Archivos versionados.
- [ ] Tests component (TASK-QA-001 / TS-01, TS-02, TS-03, TS-04).
- [ ] Re-export desde `@/shared/authorization`.

---

### TASK-PB-P0-013-US-107-FE-009 — Crear `<UserMenu>` (Headless UI + iniciales + logout placeholder)

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-003                                                                         |
| Source AC(s)              | AC-02, AC-06                                                                                        |
| Technical Spec Section(s) | §6 (AC-02/06), §8 Components, §12 SEC-03/05, §18 paso 8                                              |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Componente complejo: dropdown accesible con iniciales determinísticas + logout placeholder.

#### Scope

##### Include

* `web/src/shared/navigation/UserMenu.tsx` (`'use client'`):
  * Lee `useSession()` (US-106). Si `!isAuthenticated` → return `null`.
  * Helper `getInitials(displayName: string | undefined, email: string): string` (max 2 caracteres).
  * Helper `getDeterministicColor(userId: string): { bg: string; text: string }` — hash simple `userId` → HSL hue (ej. `hue = sum(charCodes) % 360`, devolver `bg-[hsl(${hue}_60%_45%)] text-white` o equivalente).
  * Usa Headless UI `<Menu>`:
    * `<Menu.Button>` con círculo iniciales + `displayName` (oculto en mobile `hidden md:inline`) + chevron.
    * `<Menu.Items>` con: `<Menu.Item>` link `Mi perfil` (al perfil del rol: `/organizer/profile` / `/vendor/profile` / `/admin/users`), `<Menu.Item>` botón `Cerrar sesión` placeholder.
  * Logout placeholder:
    * `const queryClient = useQueryClient()`.
    * `const router = useRouter()`.
    * `onClick`: `queryClient.invalidateQueries({ queryKey: ['me'] })` + `router.replace('/login')`.
    * `console.debug('userMenu.logout.placeholder')` en dev.
    * JSDoc: `placeholder; reemplazar por authApi.logout() en US-AUTH-*`.
  * `aria-label` desde i18n.

##### Exclude

* No llamar a `POST /auth/logout` (VR-10).
* No mostrar email completo (usar `displayName` o iniciales).
* No introducir upload de avatar.

#### Implementation Notes

* `displayName='Ana Pérez'` → iniciales `AP`.
* Fallback: si `!displayName`, usar primera letra de email.

#### Acceptance Criteria Covered

AC-02, AC-06.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Tests component (TASK-QA-001 / TS-05, TS-06, TS-07; AUTH-TS-06).
- [ ] JSDoc del logout placeholder claro.

---

### TASK-PB-P0-013-US-107-FE-010 — Crear `<MobileNav>` con Headless UI `<Dialog>` y focus trap

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-008                                                                         |
| Source AC(s)              | AC-02, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-02/07), §8 Accessibility, §18 paso 9                                                          |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Drawer mobile responsive con focus trap automático (Headless UI).

#### Scope

##### Include

* `web/src/shared/navigation/MobileNav.tsx` (`'use client'`):
  * Props: `{ items: NavItem[]; isOpen: boolean; onClose: () => void }`.
  * Usa Headless UI `<Dialog>` (focus trap automático + Escape cierra).
  * `<Dialog.Overlay>` clickeable cierra (vía `onClose`).
  * `<Dialog.Panel>` con close button (`<button aria-label={t('navigation.mobile.close')}>` + icono `X` lucide) + lista de items renderizados como `<NavLink>` (o `<a>` que cierra al click).
  * `<Transition>` opcional para fade-in.

##### Exclude

* No duplicar información sensible adicional a sidebar (SEC-08).
* No introducir search en el drawer.

#### Acceptance Criteria Covered

AC-02, AC-07.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Tests component cubren `Escape`, overlay click, focus trap (TASK-QA-001 / TS-08, TS-09; A11Y-TS-03, A11Y-TS-04).

---

### TASK-PB-P0-013-US-107-FE-011 — Crear `<Topbar>` (composición)

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-004, FE-007, FE-009                                                          |
| Source AC(s)              | AC-02, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-02), §8 Components, §18 paso 10                                                              |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Barra superior compartida por áreas autenticadas.

#### Scope

##### Include

* `web/src/shared/navigation/Topbar.tsx` (`'use client'`):
  * Props: `{ navItems?: NavItem[]; onMenuToggle: () => void; isMenuOpen: boolean }`.
  * Estructura:
    * Mobile: `<button aria-expanded={isMenuOpen} aria-controls="mobile-nav" aria-label={t(isMenuOpen ? 'navigation.topbar.menuClose' : 'navigation.topbar.menuOpen')}>` con icono `Menu`/`X` + `<Logo size="sm" />`.
    * Desktop: título contextual opcional (omitir si no aplica).
    * Right side: `<NotificationsBadge>` + `<UserMenu>` + `<LocaleSwitcher>` (heredado US-104).
* Diseño responsive con Tailwind (`flex justify-between items-center h-16 px-4 border-b`).

##### Exclude

* No introducir search.
* No introducir breadcrumbs (Future).

#### Acceptance Criteria Covered

AC-02, AC-07.

#### Definition of Done

- [ ] Archivo versionado.
- [ ] Compose tests cubiertos por E2E de layouts.

---

### TASK-PB-P0-013-US-107-FE-012 — `shared/navigation/index.ts` barrel

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | FE-004 a FE-011                                                                                      |
| Source AC(s)              | AC-02                                                                                               |
| Technical Spec Section(s) | §18 Files impacted                                                                                  |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Exponer barrel `@/shared/navigation` con la API pública.

#### Scope

##### Include

* `web/src/shared/navigation/index.ts` re-exporta:
  * `<Topbar>`, `<Sidebar>`, `<NavLink>`, `<UserMenu>`, `<MobileNav>`, `<NotificationsBadge>`, `<SkipLink>`, `<Footer>`, `<Logo>`.
  * `ORGANIZER_NAV_ITEMS`, `VENDOR_NAV_ITEMS`, `ADMIN_NAV_ITEMS`.
  * Tipo `NavItem`.

##### Exclude

* No re-exportar internos no consumidos.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Importación `import { Topbar, Sidebar, ... } from '@/shared/navigation'` funciona desde layouts.

---

### TASK-PB-P0-013-US-107-FE-013 — Reemplazar `(public)/layout.tsx`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-012                                                                         |
| Source AC(s)              | AC-01, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §18 paso 12                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar el `(public)/layout.tsx` esqueleto de US-105 por layout completo con header + footer.

#### Scope

##### Include

* `web/src/app/(public)/layout.tsx`: Server Component.
* Estructura: `<><SkipLink /><header><Logo /><nav>{links público: /vendors, /login, /register}</nav><LocaleSwitcher /></header><main id="main-content">{children}</main><Footer /></>`.
* Links público con `<Link>` de Next.js y textos `t('navigation.public.directory|login|register')`.

##### Exclude

* No introducir search, banner promocional, ni elementos no listados.

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Layout modificado.
- [ ] Smoke E2E US-105 sigue verde.

---

### TASK-PB-P0-013-US-107-FE-014 — Reemplazar `(auth)/layout.tsx`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-012                                                                         |
| Source AC(s)              | AC-01, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-01), §8 Routes/Pages, §18 paso 12                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar `(auth)/layout.tsx` esqueleto por layout con card centrado.

#### Scope

##### Include

* `web/src/app/(auth)/layout.tsx`: Server Component.
* Estructura: `<><SkipLink /><header><Logo /><LocaleSwitcher /></header><main id="main-content"><div className="auth-card mx-auto max-w-md p-6 mt-12 bg-white rounded-lg shadow">{children}</div></main></>`.

##### Exclude

* No introducir formularios.

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Layout modificado.
- [ ] Placeholders `(auth)/login`, `(auth)/register`, `(auth)/forgot-password` heredados de US-105 siguen renderizando.

---

### TASK-PB-P0-013-US-107-FE-015 — Reemplazar `(app)/layout.tsx` con `<Topbar>` + `<MobileNav>`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-011, FE-010                                                                  |
| Source AC(s)              | AC-01, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-01/07), §8 Routes/Pages, §18 paso 12                                                          |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar `(app)/layout.tsx` esqueleto por Client Component con topbar y mobile nav.

#### Scope

##### Include

* `web/src/app/(app)/layout.tsx`: Client Component (`'use client'`).
* `const [isMenuOpen, setIsMenuOpen] = useState(false)`.
* Estructura: `<><SkipLink /><Topbar onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} /><MobileNav items={...} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} /><main id="main-content">{children}</main></>`.
* `items` de `<MobileNav>` se decide en sub-layouts (organizer/vendor). Una alternativa: el `(app)/layout.tsx` lee `usePathname()` y decide entre `ORGANIZER_NAV_ITEMS` y `VENDOR_NAV_ITEMS` según prefijo de URL. Decisión final en PR.

##### Exclude

* No introducir sidebar directamente (eso lo hacen sub-layouts).

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Layout modificado.
- [ ] Sub-layouts `organizer/` y `vendor/` siguen renderizando.

---

### TASK-PB-P0-013-US-107-FE-016 — Reemplazar `(app)/organizer/layout.tsx`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-008                                                                         |
| Source AC(s)              | AC-01                                                                                               |
| Technical Spec Section(s) | §6 (AC-01), §18 paso 12                                                                              |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar sub-layout organizer con sidebar contextual.

#### Scope

##### Include

* `web/src/app/(app)/organizer/layout.tsx`: Client Component.
* `<div className="flex"><Sidebar items={ORGANIZER_NAV_ITEMS} ariaLabel={t('navigation.sidebar.organizer.label')} /><section className="flex-1 p-6">{children}</section></div>`.

##### Exclude

* No introducir lógica de feature.

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Layout modificado.

---

### TASK-PB-P0-013-US-107-FE-017 — Reemplazar `(app)/vendor/layout.tsx`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-008                                                                         |
| Source AC(s)              | AC-01                                                                                               |
| Technical Spec Section(s) | §6 (AC-01), §18 paso 12                                                                              |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar sub-layout vendor con sidebar contextual.

#### Scope

##### Include

* `web/src/app/(app)/vendor/layout.tsx`: Client Component.
* `<div className="flex"><Sidebar items={VENDOR_NAV_ITEMS} ariaLabel={t('navigation.sidebar.vendor.label')} /><section className="flex-1 p-6">{children}</section></div>`.

##### Exclude

* No introducir lógica de feature.

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Layout modificado.

---

### TASK-PB-P0-013-US-107-FE-018 — Reemplazar `(admin)/layout.tsx`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-011, FE-010, FE-008                                                          |
| Source AC(s)              | AC-01, AC-07                                                                                        |
| Technical Spec Section(s) | §6 (AC-01/07), §18 paso 12                                                                           |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Reemplazar `(admin)/layout.tsx` con topbar + sidebar admin propios.

#### Scope

##### Include

* `web/src/app/(admin)/layout.tsx`: Client Component.
* Estructura: `<SkipLink /><Topbar onMenuToggle={...} isMenuOpen={...} /><MobileNav items={ADMIN_NAV_ITEMS} ... /><div className="flex"><Sidebar items={ADMIN_NAV_ITEMS} ariaLabel={t('navigation.sidebar.admin.label')} /><section className="flex-1 p-6"><main id="main-content">{children}</main></section></div>`.
* Confirmar que la navegación NO ofrece links a `(app)/*` (decisión MVP heredada US-105).

##### Exclude

* No introducir links a `/organizer` o `/vendor`.
* No introducir impersonación (Future).

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Layout modificado.
- [ ] `<main id="main-content">` presente (puede vivir en `<section>` o directamente).

---

### TASK-PB-P0-013-US-107-FE-019 — Crear 12 placeholders nuevos de sidebar destinations

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Frontend                                                                                            |
| Type                      | Implementation                                                                                      |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-003                                                                         |
| Source AC(s)              | AC-05                                                                                               |
| Technical Spec Section(s) | §6 (AC-05), §8 Routes/Pages, §18 paso 11                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Crear 12 placeholders mínimos que sirvan como destinos de los nav links sin romper navegación.

#### Scope

##### Include

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
* Cada placeholder: Server Component con `getTranslations` + `<h1>{t('navigation.placeholder.<key>.title')}</h1>` + `<p>{t('navigation.placeholder.<key>.body')}</p>`.

##### Exclude

* No introducir lógica de feature ni contenido funcional.

#### Acceptance Criteria Covered

AC-05.

#### Definition of Done

- [ ] 12 archivos versionados.
- [ ] Navegación E2E (TASK-QA-003) verifica que cada link de sidebar renderiza su placeholder.

---

### TASK-PB-P0-013-US-107-QA-001 — Tests component de los 9 navegacionales + `<RoleGuard>`

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                        |
| Type                      | Test                                                                                                |
| Priority                  | Must                                                                                                |
| Estimate                  | M                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-004 .. FE-011                                                               |
| Source AC(s)              | AC-02, AC-03, AC-06                                                                                  |
| Technical Spec Section(s) | §13 Component Tests (TS-01..TS-12)                                                                   |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | QA / Frontend                                                                                       |
| Status                    | To Do                                                                                               |

#### Objective

Cubrir con Vitest + Testing Library los 9 componentes navegacionales y `<RoleGuard>`.

#### Scope

##### Include

* `tests/unit/navigation/NavLink.test.tsx` (TS-01) — `aria-current="page"` con exact y startsWith.
* `tests/unit/authorization/RoleGuard.test.tsx` (TS-02, TS-03, TS-04) — allow/disallow/isLoading.
* `tests/unit/navigation/UserMenu.test.tsx` (TS-05, TS-06, TS-07; AUTH-TS-06) — anónimo no renderiza; iniciales `AP` para `Ana Pérez`; color determinístico; logout placeholder.
* `tests/unit/navigation/MobileNav.test.tsx` (TS-08, TS-09; A11Y-TS-03, A11Y-TS-04) — `Escape`, overlay click, focus trap.
* `tests/unit/navigation/SkipLink.test.tsx` (TS-10; A11Y-TS-01) — primer focusable.
* `tests/unit/navigation/Footer.test.tsx` (TS-11) — copyright ICU `{year}`.
* `tests/unit/navigation/Logo.test.tsx` (TS-12) — variants y sizes.
* Wrap con `<NextIntlClientProvider>` + `<QueryClientProvider>` + `<SessionProvider>` mocked en testing.

##### Exclude

* No probar layouts completos (TASK-QA-003).

#### Acceptance Criteria Covered

AC-02, AC-03, AC-06.

#### Definition of Done

- [ ] Tests pasan.
- [ ] Cobertura `shared/navigation/` y `shared/authorization/RoleGuard` ≥ 85 %.

---

### TASK-PB-P0-013-US-107-QA-002 — Tests A11Y assertions (DOM + axe-core opcional)

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                        |
| Type                      | Test                                                                                                |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-QA-001                                                                         |
| Source AC(s)              | AC-10                                                                                               |
| Technical Spec Section(s) | §13 Accessibility Tests (A11Y-TS-01..09)                                                            |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | QA                                                                                                  |
| Status                    | To Do                                                                                               |

#### Objective

Validar WCAG 2.1 AA baseline en assertions DOM (algunos cubiertos por TASK-QA-001; aquí se agregan los faltantes).

#### Scope

##### Include

* A11Y-TS-02: `<NavLink>` con `aria-current="page"` — cubierto por TS-01.
* A11Y-TS-05: `<UserMenu>` flechas + `Escape` (Headless UI lo hace nativo; assertion smoke).
* A11Y-TS-06: `<button aria-expanded>` en hamburguesa cambia con state.
* A11Y-TS-07: contraste con `@axe-core/playwright` o assertions manuales documentadas.
* A11Y-TS-08: `<html lang>` dinámico funciona en cada layout — assertion E2E.
* A11Y-TS-09: `<nav aria-label>` semántico en cada `<Sidebar>` — assertion DOM en TS-15..TS-17.

##### Exclude

* No reemplaza auditoría Lighthouse completa (Future).

#### Acceptance Criteria Covered

AC-10.

#### Definition of Done

- [ ] Assertions A11Y verdes.

---

### TASK-PB-P0-013-US-107-QA-003 — 9 Tests E2E Playwright de layouts y navegación

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                        |
| Type                      | Test                                                                                                |
| Priority                  | Must                                                                                                |
| Estimate                  | L                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-FE-013 .. FE-019                                                               |
| Source AC(s)              | AC-09                                                                                               |
| Technical Spec Section(s) | §13 E2E Tests (TS-13..TS-21)                                                                         |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | QA                                                                                                  |
| Status                    | To Do                                                                                               |

#### Objective

Cubrir end-to-end los 6 layouts + responsive + skip-link + logout placeholder + locale switch. **Nota**: tarea `L`; sugerido split en sub-tareas (una por spec) durante sprint planning.

#### Scope

##### Include

* `tests/e2e/layouts.public.spec.ts` (TS-13).
* `tests/e2e/layouts.auth.spec.ts` (TS-14).
* `tests/e2e/layouts.organizer.spec.ts` (TS-15) — MSW retorna `role: 'organizer'`.
* `tests/e2e/layouts.vendor.spec.ts` (TS-16) — MSW retorna `role: 'vendor'`.
* `tests/e2e/layouts.admin.spec.ts` (TS-17) — MSW retorna `role: 'admin'`.
* `tests/e2e/layouts.mobile.spec.ts` (TS-18) — viewport 375 px.
* `tests/e2e/layouts.logout-placeholder.spec.ts` (TS-19) — click logout → `/login`.
* `tests/e2e/layouts.skip-link.spec.ts` (TS-20) — Tab → skip-link visible.
* `tests/e2e/layouts.locale-switch.spec.ts` (TS-21) — locale switch en `(app)` sin perder sesión.
* Override MSW `/auth/me` con `worker.use(...)` (US-106) para sesiones por rol.

##### Exclude

* No probar features de dominio (out of scope).

#### Implementation Notes

* Reutilizar `NEXT_PUBLIC_API_MOCKING=enabled` (US-106) para activar MSW en E2E.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] 9 specs verdes en `npm run test:e2e`.

---

### TASK-PB-P0-013-US-107-QA-004 — Test E2E de regresión de placeholders US-105

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                        |
| Type                      | Test                                                                                                |
| Priority                  | Should                                                                                              |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-013..FE-018                                                                 |
| Source AC(s)              | AC-01                                                                                               |
| Technical Spec Section(s) | §17 Risks (placeholders regresión)                                                                   |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | QA                                                                                                  |
| Status                    | To Do                                                                                               |

#### Objective

Verificar que los placeholders de US-105 (`(public)/page.tsx`, `(auth)/login`, etc.) siguen renderizando dentro de los nuevos layouts sin regresión.

#### Scope

##### Include

* Ejecutar suite E2E heredada de US-105 (`routing.public`, `routing.app-guard`, `routing.role-guard`, `routing.auth-redirect`, `routing.not-found`, `seo.robots-sitemap`) y confirmar verde después del reemplazo de layouts.
* Documentar resultado en PR.

##### Exclude

* No modificar specs heredadas (a menos que un assertion específico choque con el nuevo layout).

#### Acceptance Criteria Covered

AC-01.

#### Definition of Done

- [ ] Suite US-105 verde.

---

### TASK-PB-P0-013-US-107-QA-005 — Pipeline canónico Doc 21 §9.2 + PR hygiene

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | QA / Testing                                                                                        |
| Type                      | Review                                                                                              |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-QA-001, QA-002, QA-003, QA-004                                                  |
| Source AC(s)              | AC-08                                                                                               |
| Technical Spec Section(s) | §4 Scope Boundary, §13 CI Checks                                                                    |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | QA / Tech Lead                                                                                       |
| Status                    | To Do                                                                                               |

#### Objective

Validar pipeline canónico en local + auditar PR contra lista negativa.

#### Scope

##### Include

* Ejecutar desde `web/`: `npm ci && npm run lint && npm run typecheck && npm run test && npm run build && npm run test:e2e && npm run check:no-msw` exit 0.
* PR review checklist:
  * **VR-09**: NO formularios reales de login/register/forgot-password.
  * **VR-10**: NO `authApi.login`/`logout`/`register` reales.
  * **VR-11**: NO features de dominio (event wizard, vendor profile real, admin moderation).
  * **VR-12**: NO `<ToastProvider>` ni `<ThemeProvider>`.
  * **VR-13**: NO `<Breadcrumbs>` ni search global.
  * VR-15: 12 placeholders nuevos creados.
* Verificar absence de: Server Actions, API Routes BFF, tokens en localStorage, notificaciones reales (polling), avatares con upload, endpoint backend nuevo.

##### Exclude

* No reemplaza CI remoto.

#### Acceptance Criteria Covered

AC-08.

#### Definition of Done

- [ ] Pipeline exit 0.
- [ ] Checklist completado.

---

### TASK-PB-P0-013-US-107-SEC-001 — Audit SEC-01..SEC-09 `<RoleGuard>` UX-only

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Security / Authorization                                                                            |
| Type                      | Review                                                                                              |
| Priority                  | Must                                                                                                |
| Estimate                  | XS                                                                                                  |
| Depends On                | TASK-PB-P0-013-US-107-FE-008, FE-009                                                                  |
| Source AC(s)              | AC-08                                                                                               |
| Technical Spec Section(s) | §12 Security & Authorization                                                                         |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Security / Tech Lead                                                                                 |
| Status                    | To Do                                                                                               |

#### Objective

Auditar invariantes SEC-01..SEC-09 antes del merge.

#### Scope

##### Include

* SEC-01..SEC-09 checklist en PR:
  * `<RoleGuard>` UX-only (JSDoc explícito, sin fetch propio).
  * Frontend no decide qué datos cargar por rol para autorización.
  * Logout placeholder NO llama backend; JSDoc claro.
  * Sin tokens en localStorage.
  * `<UserMenu>` no expone email completo con displayName presente.
  * `<RoleGuard>` con `isLoading=true` no flash de contenido prohibido.
  * Sin Server Actions ni API Routes BFF.
  * `<MobileNav>` no duplica info sensible.
  * Logs placeholder limpios.

##### Exclude

* No auditar políticas backend.

#### Acceptance Criteria Covered

AC-08.

#### Definition of Done

- [ ] Checklist documentado en PR.

---

### TASK-PB-P0-013-US-107-DOC-001 — `web/README.md` § "Layouts & Navigation"

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Documentation / Traceability                                                                        |
| Type                      | Documentation                                                                                       |
| Priority                  | Must                                                                                                |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-QA-005                                                                         |
| Source AC(s)              | AC-02, AC-08                                                                                        |
| Technical Spec Section(s) | §19 Group I                                                                                          |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Frontend / Tech Lead                                                                                 |
| Status                    | To Do                                                                                               |

#### Objective

Documentar arquitectura de layouts + componentes navegacionales para el equipo.

#### Scope

##### Include

* Sección "Layouts & Navigation":
  * Estructura de los 6 layouts (qué Server, qué Client).
  * Lista de componentes navegacionales con responsabilidad y API.
  * Convención de `<RoleGuard>` (UX-only, no autorización).
  * Paleta semántica Tailwind y cómo usarla.
  * A11Y baseline (SkipLink, aria-current, focus trap, contraste).
  * Cómo agregar un nuevo item de sidebar (paso a paso: editar `nav-items.ts` + agregar clave i18n + crear placeholder).
  * Logout placeholder limitación (referencia US-AUTH-*).
  * `<NotificationsBadge>` placeholder (referencia historia notificaciones).

##### Exclude

* No documentar features de dominio.

#### Acceptance Criteria Covered

AC-02, AC-08.

#### Definition of Done

- [ ] Sección versionada y revisada por Tech Lead.

---

### TASK-PB-P0-013-US-107-DOC-002 — Housekeeping Doc 15 §19/§20 + cierre PB-P0-013

| Field                     | Value                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Area                      | Documentation / Traceability                                                                        |
| Type                      | Documentation                                                                                       |
| Priority                  | Should                                                                                              |
| Estimate                  | S                                                                                                   |
| Depends On                | TASK-PB-P0-013-US-107-DOC-001                                                                        |
| Source AC(s)              | AC-08                                                                                               |
| Technical Spec Section(s) | §16 Documentation Alignment Required                                                                 |
| Backlog ID                | PB-P0-013                                                                                            |
| User Story ID             | US-107                                                                                              |
| Owner Role                | Tech Lead                                                                                            |
| Status                    | To Do                                                                                               |

#### Objective

Cerrar housekeeping documental y consolidar PB-P0-013.

#### Scope

##### Include

* Amender **Doc 15 §19 Footer** post-merge: simplificar a copyright + logo (links legales Future).
* Amender **Doc 15 §20** post-merge: listar paths efectivos de sidebar items por rol.
* Confirmar **Doc 15 §20.3** (admin impersonation Future) — sin cambios.
* (Opcional) Consolidar `management/development-tasks/P0/PB-P0-013/tasks.md` end-to-end con tasks de US-106 + US-107.
* Issue de seguimiento para US-AUTH-* recordando reemplazo de logout placeholder.

##### Exclude

* No bloquear el merge de US-107.

#### Acceptance Criteria Covered

AC-08.

#### Definition of Done

- [ ] Doc 15 §19/§20 amended o issues abiertos.
- [ ] Issue US-AUTH-* abierto.

---

## 7. Required QA Tasks

| Task ID                          | Test Type             | Purpose                                                                          |
| -------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| TASK-PB-P0-013-US-107-QA-001     | Component             | 9 componentes navegacionales + `<RoleGuard>` (AC-02/03/06)                       |
| TASK-PB-P0-013-US-107-QA-002     | A11Y                  | Assertions DOM WCAG 2.1 AA (AC-10)                                                |
| TASK-PB-P0-013-US-107-QA-003     | E2E (Playwright)      | 9 specs layouts + responsive + skip-link + logout placeholder + locale switch (AC-09) |
| TASK-PB-P0-013-US-107-QA-004     | E2E (regresión)       | Suite US-105 sigue verde con nuevos layouts (AC-01)                              |
| TASK-PB-P0-013-US-107-QA-005     | Pipeline + PR review  | Pipeline canónico + checklist (AC-08)                                            |

---

## 8. Required Security Tasks

| Task ID                           | Security Concern                                  | Purpose                                                                                            |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TASK-PB-P0-013-US-107-SEC-001     | SEC-01..SEC-09 audit (`<RoleGuard>` UX-only)      | Auditar invariantes de seguridad antes del merge                                                    |

---

## 9. Required Seed / Demo Tasks

`No aplica`. US-107 no toca seed/demo. **Habilita** demo académica visualmente evaluable (navegación profesional por rol con MSW de US-106).

---

## 10. Observability / Audit Tasks

`No aplica`. Solo log dev `console.debug('userMenu.logout.placeholder')` cubierto por TASK-FE-009.

---

## 11. Documentation / Traceability Tasks

| Task ID                          | Document / Artifact                                                | Purpose                                                                          |
| -------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| TASK-PB-P0-013-US-107-DOC-001    | `web/README.md` § "Layouts & Navigation"                            | Documentar layouts, componentes, RoleGuard, paleta, A11Y, agregar sidebar item   |
| TASK-PB-P0-013-US-107-DOC-002    | Doc 15 §19 + §20, issue US-AUTH-*, consolidación PB-P0-013          | Housekeeping post-merge no bloqueante                                            |

---

## 12. Dependency Graph

```mermaid
flowchart TD
  FE001[FE-001 Tipos + nav-items] --> FE008[FE-008 NavLink + Sidebar + RoleGuard]
  FE002[FE-002 Tailwind palette] --> FE004[FE-004 Logo]
  FE003[FE-003 i18n keys × 4 locales] --> FE004
  FE003 --> FE005[FE-005 SkipLink]
  FE003 --> FE006[FE-006 Footer]
  FE003 --> FE007[FE-007 NotificationsBadge]
  FE003 --> FE009[FE-009 UserMenu]
  FE003 --> FE010[FE-010 MobileNav]
  FE003 --> FE019[FE-019 12 placeholders]
  FE004 --> FE006
  FE008 --> FE010
  FE004 --> FE011[FE-011 Topbar]
  FE007 --> FE011
  FE009 --> FE011

  FE004 --> FE012[FE-012 barrel index.ts]
  FE005 --> FE012
  FE006 --> FE012
  FE007 --> FE012
  FE008 --> FE012
  FE009 --> FE012
  FE010 --> FE012
  FE011 --> FE012

  FE012 --> FE013[FE-013 (public)/layout]
  FE012 --> FE014[FE-014 (auth)/layout]
  FE011 --> FE015[FE-015 (app)/layout]
  FE010 --> FE015
  FE008 --> FE016[FE-016 (app)/organizer/layout]
  FE008 --> FE017[FE-017 (app)/vendor/layout]
  FE011 --> FE018[FE-018 (admin)/layout]
  FE010 --> FE018
  FE008 --> FE018

  FE004 --> QA001[QA-001 Component tests]
  FE005 --> QA001
  FE006 --> QA001
  FE007 --> QA001
  FE008 --> QA001
  FE009 --> QA001
  FE010 --> QA001
  FE011 --> QA001

  QA001 --> QA002[QA-002 A11Y]
  FE013 --> QA003[QA-003 9 E2E specs]
  FE014 --> QA003
  FE015 --> QA003
  FE016 --> QA003
  FE017 --> QA003
  FE018 --> QA003
  FE019 --> QA003

  FE013 --> QA004[QA-004 Regression US-105]
  FE014 --> QA004
  FE015 --> QA004
  FE016 --> QA004
  FE017 --> QA004
  FE018 --> QA004

  FE008 --> SEC001[SEC-001 audit]
  FE009 --> SEC001

  QA001 --> QA005[QA-005 Pipeline + PR hygiene]
  QA002 --> QA005
  QA003 --> QA005
  QA004 --> QA005
  SEC001 --> QA005

  QA005 --> DOC001[DOC-001 README]
  DOC001 --> DOC002[DOC-002 Doc 15 §19/§20 + cierre PB-P0-013]
```

---

## 13. Suggested Implementation Order

### Phase 1 — Foundation

1. TASK-PB-P0-013-US-107-FE-001 (tipos + `nav-items`).
2. TASK-PB-P0-013-US-107-FE-002 (Tailwind paleta).
3. TASK-PB-P0-013-US-107-FE-003 (52 claves i18n × 4 locales).

### Phase 2 — Componentes simples

4. TASK-PB-P0-013-US-107-FE-004 (`<Logo>`).
5. TASK-PB-P0-013-US-107-FE-005 (`<SkipLink>`).
6. TASK-PB-P0-013-US-107-FE-006 (`<Footer>`).
7. TASK-PB-P0-013-US-107-FE-007 (`<NotificationsBadge>`).

### Phase 3 — Componentes con estado y complejos

8. TASK-PB-P0-013-US-107-FE-008 (`<NavLink>` + `<Sidebar>` + `<RoleGuard>`).
9. TASK-PB-P0-013-US-107-FE-009 (`<UserMenu>` + logout placeholder).
10. TASK-PB-P0-013-US-107-FE-010 (`<MobileNav>`).
11. TASK-PB-P0-013-US-107-FE-011 (`<Topbar>`).
12. TASK-PB-P0-013-US-107-FE-012 (barrel).

### Phase 4 — Placeholders + Layouts

13. TASK-PB-P0-013-US-107-FE-019 (12 placeholders).
14. TASK-PB-P0-013-US-107-FE-013 (`(public)/layout`).
15. TASK-PB-P0-013-US-107-FE-014 (`(auth)/layout`).
16. TASK-PB-P0-013-US-107-FE-015 (`(app)/layout`).
17. TASK-PB-P0-013-US-107-FE-016 (`(app)/organizer/layout`).
18. TASK-PB-P0-013-US-107-FE-017 (`(app)/vendor/layout`).
19. TASK-PB-P0-013-US-107-FE-018 (`(admin)/layout`).

### Phase 5 — Validation / Security / QA

20. TASK-PB-P0-013-US-107-QA-001 (component tests).
21. TASK-PB-P0-013-US-107-QA-002 (A11Y).
22. TASK-PB-P0-013-US-107-QA-003 (9 E2E specs).
23. TASK-PB-P0-013-US-107-QA-004 (regresión US-105).
24. TASK-PB-P0-013-US-107-SEC-001 (audit).
25. TASK-PB-P0-013-US-107-QA-005 (pipeline + PR hygiene).

### Phase 6 — Documentation / Review

26. TASK-PB-P0-013-US-107-DOC-001 (README).
27. TASK-PB-P0-013-US-107-DOC-002 (Doc 15 §19/§20 + cierre PB-P0-013 — post-merge).

---

## 14. Risks & Mitigations

| Risk                                                                                                              | Impact                                                          | Mitigation                                                                                                       | Related Task                            |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Reemplazo de 6 layouts rompe placeholders US-105                                                                  | Smoke US-105 falla                                              | Los placeholders NO se modifican; solo layouts. TASK-QA-004 ejecuta suite US-105                                  | TASK-QA-004                              |
| `<MobileNav>` con focus trap mal implementado                                                                     | Focus atrapado, UX rota                                          | Usar Headless UI `<Dialog>` (focus trap probado); tests cubren `Escape` y overlay click                          | TASK-FE-010, TASK-QA-001                 |
| `<RoleGuard>` mal compuesto oculta toda la sidebar                                                                 | Navegación rota                                                  | Sidebars renderizan sin `<RoleGuard>` (middleware US-105 garantiza rol). `<RoleGuard>` reservado para acciones    | TASK-FE-016, FE-017, FE-018              |
| Logout placeholder con backend caído deja loop `/login` ↔ dashboard                                                | Usuario no puede salir hasta US-AUTH-* + US-108                  | Documentar limitación en JSDoc + EC-04; coordinar reemplazo                                                       | TASK-FE-009, TASK-DOC-002                |
| Admin entrando a `(app)` por URL manual confunde                                                                   | Admin ve placeholders sin contexto                              | Decisión MVP heredada US-105; `<RoleGuard>` disponible si se quiere cambiar política                              | (decisión PO existente)                   |
| `<UserMenu>` con `isLoading=true` causa flash                                                                      | UX pobre en primera carga                                        | `staleTime: 60_000` (US-106) + skeleton intencional                                                              | TASK-FE-009                              |
| Tailwind paleta colisiona con utility classes                                                                     | Estilos rotos                                                    | Solo `theme.extend.colors` sin overrides de clases base                                                          | TASK-FE-002                              |
| `lucide-react` no tree-shake bien                                                                                  | Bundle inflado                                                    | Importar named (`import { Bell } from 'lucide-react'`); confirmado por Next.js + Webpack                          | TASK-FE-007, FE-009, FE-010, FE-011      |
| 52 claves i18n con typos rompen render                                                                            | `[<locale>] navigation.xxx` en dev                                | `getMessageFallback` US-104 expone keys faltantes; revisar en PR                                                  | TASK-FE-003                              |
| Layouts Client con `useSession()` causan hydration mismatch                                                       | Warnings; UX rota                                                | Patrón oficial: RootLayout Server con providers; layouts privados Client; tests E2E con dev y prod                | TASK-FE-015, FE-016, FE-017, FE-018      |
| ICU `{year}` formatea con separador de miles en algunos locales                                                   | `2.026` en `es-LATAM`                                              | Pasar `year` como string o usar `{year, number, ::Y}` / sin formato                                              | TASK-FE-006                              |
| TASK-QA-003 (9 E2E specs) estimada `L`                                                                             | Tarea grande, riesgo subestimación                                | Split en sub-tareas por spec durante sprint planning                                                              | TASK-QA-003                              |
| Componente test-only (`data-testid`) heredado de US-106 colisiona con layouts                                      | E2E US-106 fallan                                                 | Validar que el placeholder en landing sigue funcionando tras reemplazar `(public)/layout.tsx`                      | TASK-QA-004                              |

---

## 15. Out of Scope Confirmation

Las siguientes capacidades NO deben implementarse como parte de US-107 (referencia: §4 Out of Scope del Technical Spec):

* **Login/Register/Forgot-password/Logout funcionales** → **US-AUTH-***.
* **Emisión real de cookies** → **US-108**.
* **Notificaciones reales** (lista, polling, contador, dropdown) → historia de notificaciones (P1/P2).
* **Avatares reales** (upload + storage) → historia de User Profile.
* **Features de dominio** (event wizard, vendor profile real, admin moderation, etc.).
* **`VendorPublicLayout`** → historia vendor public profile.
* **`<ToastProvider>`** → diferido / historia UI dedicada.
* **`<ThemeProvider>`** y dark mode → Future.
* **Design system completo** → Future.
* **`<Breadcrumbs>`** → Future.
* **Search global / command palette** → Future.
* **Impersonación admin** → Future.
* **Footer links legales** → Future.
* **Server Actions, API Routes BFF** → prohibidos.

---

## 16. Readiness for Sprint Planning

| Check                                      | Status      |
| ------------------------------------------ | ----------- |
| Product Backlog mapping found              | Pass        |
| Every AC maps to tasks                     | Pass (AC-01..AC-10 cubiertos en §5) |
| Technical Spec used when available         | Pass        |
| QA tasks included                          | Pass (5 tareas QA: component, A11Y, E2E, regresión, pipeline) |
| Security tasks included if applicable      | Pass (SEC-001 audit)                  |
| Seed/demo tasks included if applicable     | N/A (habilita demo visualmente; sin tareas propias) |
| Observability tasks included if applicable | N/A (log dev placeholder cubierto en FE-009)         |
| Documentation tasks included if applicable | Pass (2 tareas DOC) |
| Task dependencies clear                    | Pass (Mermaid §12) |
| Tasks small enough                         | Pass (XS/S/M excepto TASK-QA-003 `L` con propuesta de split) |
| Ready for Sprint Planning                  | Yes         |

---

## 17. Final Recommendation

**Ready for Sprint Planning.**

El breakdown entrega 27 tareas atómicas (19 FE + 5 QA + 1 SEC + 0 OPS dedicado — paleta integrada en `FE-002` + 2 DOC) trazables a los 10 Acceptance Criteria, todas mapeadas a secciones específicas del Technical Spec y ordenadas por dependencia de implementación. El alcance es amplio pero quirúrgicamente delimitado (6 layouts + 9 componentes + `<RoleGuard>` + 52 claves i18n + 12 placeholders) con decisiones cerradas (ADR-FE-001/003/015, Doc 15 §11/§17-22, Doc 5 §5), sin gaps bloqueantes.

Los tres `Documentation Alignment Required` (Doc 15 §19 footer simplificado, Doc 15 §20 sidebar paths formalizados, Doc 15 §20.3 admin impersonation Future) están encapsulados en TASK-DOC-002 como housekeeping post-merge. La deuda funcional del logout placeholder está aceptada, documentada con JSDoc y coordinada con US-AUTH-*. Las decisiones MVP de placeholders visuales (`<NotificationsBadge>`, avatar iniciales) hacen la demo evaluable sin requerir scope adicional.

La única tarea estimada `L` (TASK-QA-003 con 9 E2E specs) tiene propuesta de split sugerida durante sprint planning. Al cerrarse US-107 quedará completo PB-P0-013 y EPIC-FE-001 foundation, desbloqueando US-AUTH-*, US-108 y todas las historias frontend de feature por dominio.
