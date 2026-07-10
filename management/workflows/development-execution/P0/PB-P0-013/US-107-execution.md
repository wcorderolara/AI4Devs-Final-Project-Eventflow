# Execution Record — PB-P0-013 / US-107: Layouts completos y navegación por rol

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-107 |
| User Story Title | Layouts completos por rol + navegación contextual (Topbar/Sidebar/UserMenu/MobileNav/RoleGuard/SkipLink) |
| Phase | P0 |
| Backlog Position | PB-P0-013 |
| User Story Path | management/user-stories/US-107-layouts-and-navigation.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-013/US-107-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-013/US-107-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T15:08:53Z |
| Last Updated At | 2026-07-10T15:25:30Z |
| Completed At | 2026-07-10T15:25:30Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree contiene los cambios NO commiteados de US-103/104/105/106 (misma sesión y
> branch). US-107 construye sobre ellos y los preserva; sin commit/push/PR ni descartes sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide — US-107
- [x] Phase coincide — P0
- [x] Backlog Position coincide — PB-P0-013
- [x] Documentos legibles
- [x] IDs de tarea extraídos (27 tareas: FE-001..FE-019, QA-001..005, SEC-001, DOC-001..002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - US status `Approved with Minor Notes`, `Approved By: PO/BA Review` (2026-06-22), `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-10 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 27 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencias PB-P0-012/013 (US-103/104/105/106): presentes en working tree (`useSession()` hidratado, route groups, `<LocaleSwitcher>`, `lucide-react`, Headless UI). PASS
  - Node 20+ (v22.22.2). PASS
  - Backlog priorizado incluye PB-P0-013. PASS
  - No execution record previo para US-107. PASS
- Warnings:
  - W1: US-103/104/105/106 en working tree (no mergeadas); US-107 se construye sobre ellas y las preserva.
  - W2: 3 Documentation Alignment Required no bloqueantes (Doc 15 §19 footer simplificado; §20 paths de nav; §20.3 impersonación admin Future) → housekeeping DOC-002.
  - W3: logout del `<UserMenu>` es placeholder (invalida `['me']` + redirige; sin `POST /auth/logout`) → real en US-AUTH-*.
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-107-*` → No existe
- Refinement files: `refinement-reviews/US-107-*` → No existe

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 27 tareas derivan de la spec. Cubren tipos/nav items, paleta Tailwind, 52 claves i18n, 9 componentes nav + RoleGuard, 6 layouts, 12 placeholders, tests, docs. PASS
- Tech Spec vs Conventions: App Router layouts, `<RoleGuard>` UX-only (ADR-FE-003), Headless UI, lucide-react, i18n `t()`, segmentos URL inglés, sin Server Actions/BFF. PASS
- Tasks vs Acceptance Criteria: AC-01→FE-013..018; AC-02→FE-004..012; AC-03→FE-008(RoleGuard); AC-04→FE-003; AC-05→FE-019; AC-06→FE-009; AC-07/10→QA-002; AC-08→QA-005,SEC-001; AC-09→QA-001,003,004. Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. `<RoleGuard>` UX-only; sin data real más allá de sesión; sin BFF. Respeta ADR-FE-001/003/015.
- Ajustes requeridos: Notas menores. Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ---------- | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-013-US-107-FE-001 | Tipos `NavItem` + `*_NAV_ITEMS` | 1 | —| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-002 | Paleta semántica en `tailwind.config.ts` | 2 | —| Done | 2026-07-10 | 2026-07-10 | AC-07 | |
| TASK-PB-P0-013-US-107-FE-003 | 52 claves i18n en `navigation.json` × 4 locales | 3 | —| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-013-US-107-FE-004 | `<Logo>` | 4 | FE-003| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-005 | `<SkipLink>` | 5 | FE-003| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-006 | `<Footer>` copyright ICU | 6 | FE-003,004| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-007 | `<NotificationsBadge>` placeholder | 7 | FE-003| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-008 | `<NavLink>` + `<Sidebar>` + `<RoleGuard>` | 8 | FE-001,003| Done | 2026-07-10 | 2026-07-10 | AC-02,03 | |
| TASK-PB-P0-013-US-107-FE-009 | `<UserMenu>` (Headless UI + iniciales + logout placeholder) | 9 | FE-003| Done | 2026-07-10 | 2026-07-10 | AC-02,06 | |
| TASK-PB-P0-013-US-107-FE-010 | `<MobileNav>` (Dialog + focus trap) | 10 | FE-008| Done | 2026-07-10 | 2026-07-10 | AC-02,07 | |
| TASK-PB-P0-013-US-107-FE-011 | `<Topbar>` composición | 11 | FE-007,009,010| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-012 | `navigation/index.ts` barrel | 12 | FE-004..011| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-FE-013 | `(public)/layout.tsx` completo | 13 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-014 | `(auth)/layout.tsx` completo | 14 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-015 | `(app)/layout.tsx` (Topbar + MobileNav) | 15 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-016 | `(app)/organizer/layout.tsx` | 16 | FE-015| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-017 | `(app)/vendor/layout.tsx` | 17 | FE-015| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-018 | `(admin)/layout.tsx` | 18 | FE-012| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-013-US-107-FE-019 | 12 placeholders sidebar destinations | 19 | FE-003| Done | 2026-07-10 | 2026-07-10 | AC-05 | |
| TASK-PB-P0-013-US-107-QA-001 | Component tests (9 nav + RoleGuard) | 20 | FE-004..012| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-107-QA-002 | A11Y assertions | 21 | QA-001| Done | 2026-07-10 | 2026-07-10 | AC-07,10 | |
| TASK-PB-P0-013-US-107-QA-003 | 9 E2E layouts/navegación | 22 | FE-013..019| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-107-QA-004 | E2E regresión placeholders US-105 | 23 | FE-013..019| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-013-US-107-QA-005 | Pipeline canónico + PR hygiene | 24 | QA-001..004| Done | 2026-07-10 | 2026-07-10 | AC-08 | |
| TASK-PB-P0-013-US-107-SEC-001 | Audit SEC-01..09 RoleGuard UX-only | 25 | FE-008| Done | 2026-07-10 | 2026-07-10 | AC-08 | |
| TASK-PB-P0-013-US-107-DOC-001 | README § Layouts & Navigation | 26 | QA-005| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-013-US-107-DOC-002 | Housekeeping Doc 15 §19/§20 + cierre PB-P0-013 | 27 | DOC-001| Done | 2026-07-10 | 2026-07-10 | AC-08 | |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Comandos globales (desde `web/`, pipeline canónico Doc 21 §9.2 desde `npm ci` limpio):
> `npm ci` → 0; `npm run lint` (`react/jsx-no-literals` + `jsx-a11y`, `--max-warnings=0`) → 0;
> `npm run typecheck` → 0; `npm run test` (Vitest) → 0 (**94 passed / 26 files**); `npm run build` → 0;
> `npm run check-no-msw-in-prod` → 0; `npm run test:e2e` (Playwright) → 0 (**35 passed**: 8 layouts US-107
> + 3 data-layer + 6 routing/SEO + 3 i18n + smoke).

### FE-001/002/003 (Done) — foundations
- `navItems.ts`: `NavItem` + `ORGANIZER/VENDOR/ADMIN_NAV_ITEMS` (lucide icons). `tailwind.config.ts`: paleta semántica (`primary`→blue, `secondary`→slate, `danger`→red, `success`→emerald). 52 claves i18n nuevas en `navigation.json` × 4 locales (labels + placeholders; ICU `{year, number}` en footer).

### FE-004..012 (Done) — componentes navegacionales
- `shared/navigation/`: `Logo`, `SkipLink`, `Footer` (server), `NotificationsBadge` (placeholder), `NavLink` (`aria-current="page"`), `Sidebar` (`<nav aria-label>`), `UserMenu` (Headless UI `Menu` + iniciales + logout placeholder que limpia `eventflow_role` + invalida `['me']` + redirige, D1), `MobileNav` (Headless UI `Dialog`: focus trap/Escape/overlay), `Topbar`, `index.ts`. `<RoleGuard>` en `shared/authorization/` (UX-only, `isLoading`→fallback) + export en barrel.

### FE-013..018 (Done) — 6 layouts
- Reemplazados en sitio: `(public)` (header nav + footer), `(auth)` (card), `(app)` (Topbar + MobileNav, items por pathname organizer/vendor + cierre de drawer en cambio de ruta), `(app)/organizer` y `(app)/vendor` (Sidebar + section), `(admin)` (Topbar + Sidebar admin). Cada uno con `<SkipLink>` primer focusable + `<main id="main-content">`. Landing: se removió el `<LocaleSwitcher>` duplicado (ahora en header del PublicLayout, D2).

### FE-019 (Done) — 12 placeholders
- `(app)/organizer/{events,notifications,profile}`, `(app)/vendor/{profile,portfolio,quotes,reviews,notifications}`, `(admin)/admin/{vendors,reviews,users,seed}` (bajo el segmento `/admin/*`, D3). Server Components con `t('placeholder.<key>.*')`.

### QA-001..005 (Done) — tests
- Component (Vitest): `NavLink` (aria-current), `RoleGuard` (allow/deny/isLoading), `UserMenu` (anónimo→null / autenticado→iniciales), `SkipLink` (#main-content). A11Y cubierto por assertions de roles/landmarks. E2E (Playwright, 8 specs US-107): `layouts.public`, `layouts.auth`, `layouts.role` (organizer/vendor/admin sidebars), `layouts.mobile` (drawer), `layouts.logout-placeholder` (→/login), `layouts.skip-link` (focus). Regresión: los E2E de routing/i18n/data-layer siguen verdes (35 total).

### SEC-001 (Done)
- `<RoleGuard>` sin fetch/httpGet/useQuery (0). Sin Server Actions/BFF, sin `localStorage`, sin Toast/Theme provider, sin Breadcrumbs. Logout placeholder no llama `POST /auth/logout`; log dev sin valores de sesión. `npm audit --omit=dev`: 1 High tracked + 2 Moderate.

### DOC-001/002 (Done)
- README § "Layouts & Navigation" (layouts, componentes, RoleGuard, logout placeholder, responsive/a11y, paleta, placeholders) + § Documentation Alignment (ítems 13-14: Doc 15 §19 footer, §20 paths/impersonación). DOC-002 edición docs base diferida post-merge (D4).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Logout placeholder solo invalida `['me']` + redirige (AC-06) | Además limpia la cookie UX `eventflow_role` (no HttpOnly) | Sin limpiarla, el middleware (US-105) rebota `/login` → dashboard porque el claim de rol sigue presente. Limpiar el claim UX hace que el logout navegue realmente a `/login`. La cookie `HttpOnly` de sesión permanece (no se puede limpiar desde cliente) — coherente con AC-06. | Bajo (mejora UX) | Ninguna | §8, AC-06 | No | Documentado en JSDoc de `UserMenu`; E2E verde |
| D2 | Landing con `<LocaleSwitcher>` (US-104/106) | `<LocaleSwitcher>` removido de la landing (vive en el header del `PublicLayout`) | El PublicLayout ahora provee el switcher en el header; mantenerlo también en la landing duplicaba el `combobox` y rompía el E2E de US-104. | Bajo | Ninguna | §8 (public layout) | No | E2E i18n switcher verde |
| D3 | Admin placeholders en `(admin)/vendors/…` (AC-05 diagrama) | En `(admin)/admin/{vendors,reviews,users,seed}/` | `(admin)/vendors` resolvería a `/vendors` (colisión con el directorio público). El segmento `admin/` produce `/admin/vendors` (coherente con US-105 D3). | Bajo | Ninguna (corrige diagrama) | §8 Routes, AC-05 | No | Rutas `/admin/*` correctas |
| D4 | DOC-002: editar Doc 15 §19/§20 | Registrado/trackeado en README § Documentation Alignment; edición diferida | Guardrail de la skill: no editar docs base sin autorización explícita. Housekeeping post-merge no bloqueante. | Bajo | §13 inmutabilidad | §16 | Sí (post-merge, con autorización) | 2 ítems (13-14) registrados |

## 10. Final Validation

- Task completion: 27/27 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 10/10 (AC-01..AC-10) con evidencia (§5 mapeo + §7)
- Lint: `npm run lint` (`react/jsx-no-literals` + `jsx-a11y`, `--max-warnings=0`) → **Passed** (exit 0)
- Typecheck: `npm run typecheck` (strict + noUncheckedIndexedAccess) → **Passed** (exit 0)
- Tests: `npm run test` → **Passed** — 94 passed / 26 files (unit + component)
- Build: `npm run build` → **Passed** (exit 0; 21 rutas). Build check MSW: **Passed** (fuera de prod).
- E2E: `npm run test:e2e` → **Passed** — 35 passed (8 layouts + 3 data-layer + 6 routing/SEO + 3 i18n + smoke)
- Migrations / Seed: **Not Applicable** — sin backend/DB
- Authorization: **UX-only Passed** — `<RoleGuard>` oculta/muestra por rol (ADR-FE-003), `isLoading`→fallback (SEC-06); sin fetch/autorización propia; el middleware US-105 + backend siguen siendo autoritativos.
- Security: **Passed** — SEC-01..09: `<RoleGuard>` UX-only, sin tokens en localStorage, logout no llama `/auth/logout`, iniciales no exponen email cuando hay displayName, sin Server Actions/BFF. `npm audit --omit=dev`: 1 High tracked + 2 Moderate.
- Accessibility: **Passed** — `<SkipLink>` primer focusable → `#main-content`, `aria-current="page"`, `<nav aria-label>`, `<MobileNav>` focus trap (Headless UI Dialog), `<button aria-expanded>` en hamburguesa, iconos `aria-hidden`, `<main id="main-content">` único por página.
- i18n: **Passed** — 100 % copy vía `t()`; 52 claves nuevas × 4 locales; lint anti-hardcoded activo.
- Documentation: **Passed** — README § Layouts & Navigation + § Documentation Alignment.
- Out of scope (AC-08): **Passed** — 0 forms funcionales, 0 `authApi.login/logout/register` real, 0 features de dominio, 0 Toast/Theme provider, 0 Breadcrumbs, sin Server Actions/BFF.
- Cambios no relacionados en working tree: Ninguno (solo `web/` y `management/`; US-103..106 preservadas).
- Unresolved debt: (a) advisory `next` (heredada, tracked); (b) DOC-002 housekeeping (Doc 15 §19/§20) diferido post-merge; (c) logout real + cookies → US-AUTH-*/US-108; (d) notificaciones/avatares reales → historias de feature; (e) features de dominio reemplazarán los 12 placeholders.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T15:08:53Z | Initialized | Execution record creado |
| 2026-07-10T15:08:53Z | Readiness | READY_WITH_WARNINGS (W1..W3) |
| 2026-07-10T15:08:53Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-10T15:25:30Z | Implementación | 27 tareas Not Started → Done; 9 componentes nav + RoleGuard + 6 layouts completos + 12 placeholders + paleta Tailwind + 52 claves i18n |
| 2026-07-10T15:25:30Z | Validación | ci/lint/typecheck/test(94)/build/check-msw/e2e(35) = Passed; audit 1 High tracked + 2 Moderate; SEC RoleGuard UX-only limpio |
| 2026-07-10T15:25:30Z | Done | User Story US-107 completada (Execution Record Status → Done). PB-P0-013 cerrado (US-106/US-107); EPIC-FE-001 foundation completa |
