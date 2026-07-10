# Execution Record — PB-P0-012 / US-105: Route groups del App Router por rol + middleware UX role guard + layouts esqueleto + SEO base

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-105 |
| User Story Title | Route groups `(public)`/`(auth)`/`(app)`/`(admin)` + middleware UX role guard + layouts esqueleto + robots/sitemap/not-found |
| Phase | P0 |
| Backlog Position | PB-P0-012 |
| User Story Path | management/user-stories/US-105-route-groups-by-role.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-012/US-105-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-012/US-105-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T13:53:17Z |
| Last Updated At | 2026-07-10T14:06:21Z |
| Completed At | 2026-07-10T14:06:21Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree contiene los cambios NO commiteados de US-103 y US-104 (misma sesión y
> branch). US-105 construye sobre ellos y los preserva; sin commit/push/PR ni descartes sin solicitud.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas — US-105
- [x] Phase coincide — P0
- [x] Backlog Position coincide — PB-P0-012
- [x] Documentos legibles
- [x] IDs de tarea extraídos (24 tareas: TASK-PB-P0-012-US-105-FE-001 … DOC-002; FE-010 absorbida en FE-004..FE-007)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS (con **override explícito del usuario** — ver W1/D1)
- Checks:
  - **US status `Ready for Approval`** (NO `Approved`; sin `Approved By`/`Approval Date`; DoR "Tech Lead frontend validó" sin marcar). ⚠️ No habilita implementación de forma inequívoca según el Readiness Gate.
  - AC-01..AC-10 testeables. PASS
  - Tech Spec `Ready for Task Breakdown` + §20 "Ready for Development Task Breakdown: Yes". PASS
  - Tasks File con 24 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencias US-103 + US-104: presentes en working tree (`web/` con `src/middleware.ts` + `localeMiddleware` + catálogos). PASS
  - Node 20+ (v22.22.2). PASS
  - Backlog priorizado incluye PB-P0-012. PASS
  - No execution record previo para US-105. PASS
- Warnings:
  - **W1 (gobernanza)**: la User Story está en `Ready for Approval`, no `Approved`. El Readiness Gate normalmente **bloquearía** (`BLOCKED_BY_REFINEMENT`). Se consultó al usuario vía AskUserQuestion; **el usuario autorizó explícitamente proceder con override**. Registrado como desviación de gobernanza D1. La aprobación formal PO/BA queda pendiente como acción post-implementación.
  - W2: 4 Documentation Alignment Required no bloqueantes (cookie `eventflow_role` en Doc 19; ubicación `src/middleware.ts` en Doc 15 §15; decisión "admin entra a (app)"; `NEXT_PUBLIC_SITE_URL`) → housekeeping DOC-002.
  - W3: cookies `eventflow_session`/`eventflow_role` reales las emite US-108 (backend); US-105 solo las lee; los E2E "con sesión" las simulan con Playwright.
  - W4: `<SessionProvider>` es esqueleto (valor default), hidratación real en US-106.
- Blockers: Ninguno (el bloqueo de readiness fue resuelto por override del usuario)
- Decision files: `decision-resolutions/US-105-*` → No existe (decisiones en historia)
- Refinement files: `refinement-reviews/US-105-*` → No existe

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 24 tareas derivan de la spec (§6, §8, §12, §13, §18, §19). Orden respeta el grafo (§12). Cubren authorization module, roleGuardMiddleware, composición, 4 route groups, error/loading/404/403, robots/sitemap, i18n keys, SessionProvider, tests, security, docs. PASS
- Tech Spec vs Conventions: App Router route groups, middleware UX-only (ADR-FE-003/015), sin Server Actions/BFF, i18n `t()`, segmentos URL inglés. PASS
- Tasks vs Acceptance Criteria: AC-01→FE-004..008; AC-02→FE-001..003; AC-03→FE-009; AC-04→FE-011,012,OPS-001; AC-05..08→FE-002+QA-003; AC-09→QA-005,SEC; AC-10→QA-003. Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. Middleware UX-only; no decodifica JWT; whitelist de rol; backend autoritativo. Respeta ADR-FE-001/003/015.
- Ajustes requeridos: Notas menores (D2..D5). Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-012-US-105-OPS-001 | `NEXT_PUBLIC_SITE_URL` en `.env.local.example` | 1 | —| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-012-US-105-FE-013 | Claves i18n nuevas (errors + navigation.placeholder) | 2 | —| Done | 2026-07-10 | 2026-07-10 | AC-01,03 | |
| TASK-PB-P0-012-US-105-FE-001 | Módulo `shared/authorization/` + `SessionProvider` | 3 | —| Done | 2026-07-10 | 2026-07-10 | AC-02,08 | |
| TASK-PB-P0-012-US-105-FE-002 | `roleGuardMiddleware` puro (13 reglas) | 4 | FE-001| Done | 2026-07-10 | 2026-07-10 | AC-02,06,07,08 | |
| TASK-PB-P0-012-US-105-FE-003 | Composición en `src/middleware.ts` + matcher | 5 | FE-002| Done | 2026-07-10 | 2026-07-10 | AC-02 | |
| TASK-PB-P0-012-US-105-FE-008 | `layout.tsx` envuelve `<SessionProvider>` | 6 | FE-001| Done | 2026-07-10 | 2026-07-10 | AC-01 | |
| TASK-PB-P0-012-US-105-FE-009 | `not-found.tsx` global i18n | 7 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-03 | |
| TASK-PB-P0-012-US-105-FE-004 | Route group `(public)` + `/403` + vendors | 8 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-01,05 | |
| TASK-PB-P0-012-US-105-FE-005 | Route group `(auth)` + placeholders | 9 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-01,05 | |
| TASK-PB-P0-012-US-105-FE-006 | Route group `(app)` + organizer + vendor | 10 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-01,06,08 | |
| TASK-PB-P0-012-US-105-FE-007 | Route group `(admin)` | 11 | FE-013| Done | 2026-07-10 | 2026-07-10 | AC-01,07 | |
| TASK-PB-P0-012-US-105-FE-010 | loading/error por área (absorbida en FE-004..007) | 12 | FE-004..007| Done | 2026-07-10 | 2026-07-10 | AC-03 | |
| TASK-PB-P0-012-US-105-FE-011 | `robots.ts` | 13 | OPS-001| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-012-US-105-FE-012 | `sitemap.ts` placeholder | 14 | OPS-001| Done | 2026-07-10 | 2026-07-10 | AC-04 | |
| TASK-PB-P0-012-US-105-QA-001 | Unit `roleGuardMiddleware` (13 reglas + EC/NT) | 15 | FE-002, FE-003| Done | 2026-07-10 | 2026-07-10 | AC-02,06,07,08 | |
| TASK-PB-P0-012-US-105-QA-002 | Unit robots/sitemap + component layouts/placeholders | 16 | FE-004..012| Done | 2026-07-10 | 2026-07-10 | AC-01,03,04 | |
| TASK-PB-P0-012-US-105-QA-003 | 6 E2E Playwright (routing + SEO) | 17 | FE-003..013| Done | 2026-07-10 | 2026-07-10 | AC-05..10 | |
| TASK-PB-P0-012-US-105-QA-004 | Tests A11Y (A11Y-TS-01..03) | 18 | QA-002, QA-003| Done | 2026-07-10 | 2026-07-10 | AC-01,03 | |
| TASK-PB-P0-012-US-105-SEC-001 | Audit SEC-01..SEC-07 | 19 | FE-002, FE-003| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-012-US-105-SEC-002 | Documentar SEC `from=` para US-AUTH-* (EC-04) | 20 | FE-002| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-012-US-105-QA-005 | Pipeline canónico + PR hygiene (VR-05/06/07) | 21 | QA-001..004, SEC-001| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-012-US-105-QA-006 | Negative scripts NT-05..NT-09 | 22 | QA-005| Done | 2026-07-10 | 2026-07-10 | AC-09 | |
| TASK-PB-P0-012-US-105-DOC-001 | `web/README.md` § Routing (13 reglas) | 23 | QA-005| Done | 2026-07-10 | 2026-07-10 | AC-02,09 | |
| TASK-PB-P0-012-US-105-DOC-002 | Housekeeping Doc 19 / Doc 15 §15 / issues | 24 | DOC-001| Done | 2026-07-10 | 2026-07-10 | AC-09 | |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Comandos globales (desde `web/`, pipeline canónico Doc 21 §9.2 desde `npm ci` limpio):
> `npm ci` → exit 0; `npm run lint` (`react/jsx-no-literals` + `jsx-a11y` + prettier, `--max-warnings=0`) → exit 0;
> `npm run typecheck` → exit 0; `npm run test` (Vitest) → exit 0 (**56 passed / 12 files**);
> `npm run build` → exit 0 (rutas: `/`, `/403`, `/admin`, `/login`, `/register`, `/forgot-password`, `/organizer`, `/vendor`, `/vendors`, `/robots.txt`, `/sitemap.xml`; Middleware 36.2 kB);
> `npm run test:e2e` (Playwright) → exit 0 (**24 passed**: 6 routing/SEO US-105 + 3 i18n US-104 + smoke).

### OPS-001 / FE-013 (Done) — env + i18n keys
- `.env.local.example`: +`NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- Catálogos (4 locales): +`errors.notFound.{body,cta}`, +`errors.forbidden.cta`, +`navigation.placeholder.{landing,vendors,login,register,forgotPassword,organizer,vendor,admin}.{title,body}`. Reusa `errors.notFound.title`/`errors.forbidden.title`/`errors.envelope.UNEXPECTED`/`common.retry` de US-104. 4 locales traducidos (D2/US-104 pattern).

### FE-001 (Done) — authorization module
- `src/shared/authorization/`: `types.ts` (`Role`, `ROLE_WHITELIST`, `COOKIE_SESSION`, `COOKIE_ROLE`, `SessionClaims`, `isRole`), `SessionProvider.tsx` (Client, valor default `{isAuthenticated:false, role:null}`, `useSession`), `index.ts` barrel.

### FE-002 (Done) — roleGuardMiddleware
- `roleGuardMiddleware.ts`: función pura Edge-compatible, 13 reglas AC-02; cookie session (presencia) + role (whitelist `isRole`); `/login?from=<encoded>`; log dev solo `{from,to,reason}` (SEC-07). Sin JWT decode.

### FE-003 (Done) — composición
- `src/middleware.ts`: `middleware(req) = roleGuardMiddleware(req) ?? localeMiddleware(req)` (redirect del guard tiene prioridad; pass-through preserva `x-locale`). Matcher de US-104 ya excluye `robots.txt`/`sitemap.xml`/`_next`/`api`/`favicon`.

### FE-004..FE-009 / FE-010 (Done) — route groups + error pages
- 4 route groups bajo `src/app/`: `(public)` (layout `<main>`, landing appName+welcome+LocaleSwitcher, `/403`, `/vendors`), `(auth)` (layout auth-card, login/register/forgot placeholders), `(app)` (layout `<main>`, `organizer`/`vendor` con sublayout `<section>` + placeholder), `(admin)` (layout `<section>`, `admin/page.tsx`). `not-found.tsx` global. `loading.tsx` (skeleton) + `error.tsx` (`'use client'`, retry, sin `<main>` anidado — D4) por área. Página admin movida a `(admin)/admin/page.tsx` para producir `/admin` (D3). `src/app/page.tsx` raíz removido (colisión `/` con `(public)/page.tsx`). Todos los textos vía `t()`.

### FE-008 (Done) — root layout
- `src/app/layout.tsx`: `<body><SessionProvider><NextIntlClientProvider>…`. `useSession()` accesible en descendientes.

### FE-011 / FE-012 (Done) — SEO
- `robots.ts`: `allow: ['/', '/vendors']` (D5), `disallow` 7 rutas privadas, `sitemap: <baseUrl>/sitemap.xml`. `sitemap.ts`: `/` + `/vendors` (fecha fija). `<baseUrl>` = `NEXT_PUBLIC_SITE_URL` fallback local.

### QA-001..QA-004 (Done) — tests
- Unit `roleGuardMiddleware.test.ts` (13 reglas + EC-01/02 + NT-02/03 + distinción `/vendors`↔`/vendor` + 2 composición). Unit `robots.test.ts` (VR-08), `sitemap.test.ts` (VR-09). Component `not-found.test.tsx` (main+h1+link, A11Y-TS-01). 6 E2E: `routing.public`, `routing.app-guard`, `routing.role-guard`, `routing.auth-redirect`, `routing.not-found`, `seo.robots-sitemap` (A11Y-TS-02 via `<html lang>`). Total 56 unit/comp + 24 E2E.

### SEC-001 / SEC-002 (Done)
- SEC audit: 0 JWT decode/jwt libs, 0 `localStorage`, 0 logs con valor de cookie (`grep`), middleware UX-only, sin Server Actions/BFF. `npm audit --omit=dev`: 1 High (advisory `next` agregada, tracked — heredado US-103) + 2 Moderate. SEC-002: TODO `from=` (regex interno) en `(auth)/login/page.tsx` + README § "Open redirect prevention".

### QA-005 / QA-006 (Done) — pipeline + hygiene
- Pipeline canónico exit 0. PR hygiene (grep): 0 `'use server'`, 0 `app/api`, 0 `QueryClient/useQuery/MSW` en código, 0 auth endpoints en `(auth)`, 0 `next.config.i18n`, 0 `<nav>`/sidebar. Únicos hits: JSDoc/README (boundary docs). QA-006 documentado como greps de verificación en README/evidencia.

### DOC-001 / DOC-002 (Done)
- README § "Routing" (4 route groups, composición middleware, tabla 13 reglas, SEO baseline, open redirect handoff, `<SessionProvider>` esqueleto) + § "Cookies" (3 cookies) + § "Documentation Alignment" (ítems 6-9: Doc 19 `eventflow_role`, contrato US-108, SEC `from=` US-AUTH-*, decisión admin→app). DOC-002: edición de Doc 19/Doc 15 §15 e issues **diferidos post-merge** (guardrail docs base — D6).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno (readiness resuelto por override del usuario) | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 (gobernanza) | Implementar solo con US `Approved` | Implementado con US en `Ready for Approval` | **Override explícito del usuario** (AskUserQuestion) ante el Readiness Gate. La aprobación PO/BA formal queda pendiente post-implementación. | Medio (proceso) | Readiness Gate (§7 SKILL) | §20 | No (aprobación US pendiente) | Autorizado por el usuario; registrado |
| D2 | es-ES/pt/en con placeholders `[<locale>]` | 4 locales traducidos (áreas nuevas) | Coherencia con US-104 (traducciones reales); aserciones E2E robustas. es-LATAM 100%. | Bajo (positivo) | Ninguna | §8 i18n | No | Fallback igualmente válido |
| D3 | `(admin)/page.tsx` (diagrama AC-01) | `(admin)/admin/page.tsx` | `(admin)/page.tsx` resuelve a `/` (paréntesis no crean segmento) y colisiona con `(public)/page.tsx`. Para producir `/admin` se requiere el segmento `admin/`. | Bajo | Ninguna (corrige el diagrama) | §8 Routes | No | URL `/admin` correcta; documentado |
| D4 | `error.tsx` con `<main>` (spec §8) | `error.tsx` con `<div role="alert">`; landing/403 con `<div>` | Evita landmark `<main>` anidado dentro del `<main>` del layout (HTML inválido + rompía el smoke de US-103). El layout es el único dueño del landmark. | Bajo (mejora a11y) | Ninguna | §8 Loading/Error | No | Un solo `<main>` por página |
| D5 | `robots` solo `Allow: /` (AC-04) | `allow: ['/', '/vendors']` | `Disallow: /vendor` prefija a `/vendors` (directorio público que debe indexarse); el `allow` más específico lo rehabilita. | Bajo (corrección SEO) | Ninguna | §6 AC-04 | No | `/vendors` indexable; disallows intactos |
| D6 | DOC-002: editar Doc 19 / Doc 15 §15 + abrir issues | Registrado/trackeado en README § Documentation Alignment | Guardrail de la skill: no editar docs base ni crear ADRs sin autorización explícita. Housekeeping post-merge no bloqueante. | Bajo | §13 inmutabilidad | §16 | Sí (post-merge, con autorización) | 4 ítems registrados; edición diferida |

## 10. Final Validation

- Task completion: 24/24 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 10/10 (AC-01..AC-10) con evidencia (§5 mapeo + §7)
- Lint: `npm run lint` (`react/jsx-no-literals` + `jsx-a11y` + prettier, `--max-warnings=0`) → **Passed** (exit 0)
- Typecheck: `npm run typecheck` (strict + noUncheckedIndexedAccess) → **Passed** (exit 0)
- Tests: `npm run test` → **Passed** — 56 passed / 12 files (unit middleware + robots/sitemap + component)
- Build: `npm run build` → **Passed** (exit 0; 11 rutas + middleware 36.2 kB)
- E2E: `npm run test:e2e` → **Passed** — 24 passed (6 routing/SEO US-105 + 3 i18n US-104 + smoke US-103)
- Migrations / Seed: **Not Applicable** — sin backend/DB (cookies simuladas con Playwright)
- Authorization: **UX-only Passed** — middleware guarda de UX (ADR-FE-003/015); 13 reglas cubiertas por unit + E2E; sin JWT decode; whitelist de rol; backend autoritativo. **No es security boundary.**
- Security: **Passed** — SEC-01..07: middleware UX-only, sin JWT decode, `eventflow_role` whitelist, sin `localStorage`, logs sin valor de cookie, sin Server Actions/BFF, robots `Disallow` correcto. SEC `from=` documentado (EC-04). `npm audit --omit=dev`: 1 High tracked + 2 Moderate.
- Accessibility: **Passed** — `<main>`/`<section>` landmarks por área, `<h1>` único, `<html lang>` dinámico (US-104); un solo `<main>` por página (D4).
- i18n: **Passed** — todos los placeholders vía `t()`; catálogos 4 locales; lint anti-hardcoded activo.
- Documentation: **Passed** — README § Routing + § Cookies + § Documentation Alignment.
- Out of scope (AC-09): **Passed** — 0 artefactos fuera de scope (VR-05/06/07: sin forms funcionales, sin QueryClient/MSW, sin sidebars).
- Cambios no relacionados en working tree: Ninguno (solo `web/` y `management/workflows/`; US-103/US-104 preservadas).
- Unresolved debt: (a) **aprobación PO/BA formal de US-105 pendiente** (D1, override); (b) advisory `next` (heredada, tracked); (c) DOC-002 housekeeping (Doc 19 `eventflow_role`, Doc 15 §15, issues US-108/US-AUTH-*) diferido post-merge; (d) cookies reales + hidratación de sesión → US-108/US-106; (e) `attachLocaleHeader` sin cablear hasta US-106.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T13:53:17Z | Initialized | Execution record creado |
| 2026-07-10T13:53:17Z | Readiness | Gate detecta US `Ready for Approval` (pre-aprobación); consultado al usuario |
| 2026-07-10T13:53:17Z | Override | Usuario autoriza proceder (AskUserQuestion) → READY_WITH_WARNINGS con desviación de gobernanza D1 |
| 2026-07-10T13:53:17Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-10T14:06:21Z | Implementación | 24 tareas Not Started → Done; módulo `shared/authorization/` + `roleGuardMiddleware` + composición + 4 route groups + not-found/loading/error + `/403` + robots/sitemap + i18n keys + `<SessionProvider>` |
| 2026-07-10T14:06:21Z | Validación | ci/lint/typecheck/test(56)/build/e2e(24) = Passed; audit 1 High tracked + 2 Moderate; SEC UX-only limpio; hygiene AC-09 limpio |
| 2026-07-10T14:06:21Z | Done | User Story US-105 completada (Execution Record Status → Done). PB-P0-012 cerrado (US-103/104/105). Aprobación PO/BA de US-105 pendiente (D1) |
