# Execution Record — PB-P0-012 / US-104: Configurar `next-intl` con 4 locales, detección por cookie + `Accept-Language`, locale switcher y catálogos base

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-104 |
| User Story Title | Configurar `next-intl` con 4 locales, detección por cookie + `Accept-Language`, locale switcher y catálogos base por área |
| Phase | P0 |
| Backlog Position | PB-P0-012 |
| User Story Path | management/user-stories/US-104-i18n-config-4-locales.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-012/US-104-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-012/US-104-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-09T22:39:53Z |
| Last Updated At | 2026-07-09T22:54:11Z |
| Completed At | 2026-07-09T22:54:11Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: el working tree contiene los cambios NO commiteados de **US-103** (`web/`, `web-ci.yml`,
> su execution record; misma sesión y branch `foundation/PB-PO-012_PB-P0-013`). US-104 construye
> sobre ellos y los **preserva**; no se commitea/push/PR ni se descarta nada sin solicitud explícita.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) — US-104
- [x] Phase coincide entre Tech Spec y Tasks — P0
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P0-012
- [x] Documentos legibles
- [x] IDs de tarea extraídos (21 tareas: TASK-PB-P0-012-US-104-FE-001 … TASK-PB-P0-012-US-104-DOC-002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - US status `Approved` / `Approved with Minor Notes`, `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-12 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 21 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencia US-103 (bootstrap): presente en working tree (`web/` con `next-intl@3.26.5` instalado, `shared/i18n/` y `messages/` vacías). PASS (W1)
  - Node 20+ disponible (v22.22.2). PASS
  - Backlog priorizado incluye PB-P0-012. PASS
  - No execution record previo para US-104. PASS
- Warnings:
  - W1: US-103 está en working tree, **no mergeada**. US-104 depende de su scaffolding; se construye sobre él y lo preserva (Git Safety). No bloqueante.
  - W2: 4 Documentation Alignment Required no bloqueantes (ADR-FE-007 por redactar, Doc 15 §17, mapeo `es-LATAM→es-419`, ubicación `src/middleware.ts`) → housekeeping DOC-002.
  - W3: `attachLocaleHeader` queda listo pero sin cablear hasta US-106 (httpClient) — handoff documentado.
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-104-*` → No existe (N/A; decisiones en `PO/BA Decisions Applied`)
- Refinement files: `refinement-reviews/US-104-*` → No existe (US declara `Ready for Development Tasks: Yes`)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: Las 21 tareas derivan de la spec (§6, §8, §13, §18). Orden respeta el grafo (§12). Cubren core lib, catálogos, componentes, middleware, layout, lint, env, tests (unit/component/integration/E2E), security y docs. PASS
- Tech Spec vs Conventions: next-intl App Router (getRequestConfig server + provider + middleware), npm, `shared/i18n/`, sin Server Actions/API Routes BFF, sin `next.config.i18n` legacy. PASS
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → FE-001, FE-002, FE-003, FE-006 · AC-02 → FE-008 · AC-03 → FE-009 · AC-04 → FE-004
  - AC-05 → FE-007 · AC-06 → FE-008 · AC-07 → FE-008 · AC-08 → FE-005 · AC-09 → FE-002, FE-006
  - AC-10 → FE-010 · AC-11 → QA-004 · AC-12 → QA-005, SEC-002
  - Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. Sin persistencia backend, sin role guards, sin BFF; middleware solo locale (componible con roleGuardMiddleware de US-105). Respeta ADR-FE-001/003 y ADR-FE-007 (por formalizar).
- Ajustes requeridos: Notas menores (D1..D3, ver §9). Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-012-US-104-FE-001 | `shared/i18n/config.ts` | 1 | — | Done | 2026-07-09 | 2026-07-09 | AC-01 | `locales`/`defaultLocale`/`cookieName`/`localeLabels` `as const` + `isSupportedLocale` |
| TASK-PB-P0-012-US-104-FE-002 | `shared/i18n/format.ts` + mapeo es-419 | 2 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-01,09 | `mapToBcp47`, `formatDate/Number/Currency`, try/catch EC-05 |
| TASK-PB-P0-012-US-104-FE-004 | Catálogos `messages/<locale>/{common,navigation,errors,validation}.json` | 3 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-04 | 16 JSON, 4 locales traducidos (supera placeholders, D3) |
| TASK-PB-P0-012-US-104-OPS-001 | Normalizar `.env.local.example` (locales) | 4 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-01 | +`NEXT_PUBLIC_DEFAULT_LOCALE`, +`NEXT_PUBLIC_SUPPORTED_LOCALES` |
| TASK-PB-P0-012-US-104-FE-003 | `shared/i18n/request.ts` (getRequestConfig + fallback) | 5 | FE-001, FE-004 | Done | 2026-07-09 | 2026-07-09 | AC-01 | merge sobre es-LATAM + `createMessageFallback` dev/prod; import estático (D2) |
| TASK-PB-P0-012-US-104-FE-005 | `shared/i18n/attachLocaleHeader.ts` | 6 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-08 | cliente (cookie) + server (locale explícito) → `{Accept-Language: BCP-47}` |
| TASK-PB-P0-012-US-104-FE-006 | `shared/i18n/Money.tsx` | 7 | FE-002 | Done | 2026-07-09 | 2026-07-09 | AC-09 | Client `<Money>` sin conversión; fallback EC-05 |
| TASK-PB-P0-012-US-104-FE-007 | `useLocale` + `LocaleSwitcher.tsx` | 8 | FE-001, FE-004 | Done | 2026-07-09 | 2026-07-09 | AC-05 | `<select>` accesible (aria-label t()); cookie flags + `router.refresh()` |
| TASK-PB-P0-012-US-104-FE-008 | `src/middleware.ts` con `localeMiddleware` | 9 | FE-001 | Done | 2026-07-09 | 2026-07-09 | AC-02,06,07 | cookie→Accept-Language(localematcher)→default; `x-locale`; matcher; sin cookie auto |
| TASK-PB-P0-012-US-104-FE-009 | `layout.tsx`: provider + `<html lang>` dinámico | 10 | FE-003, FE-008 | Done | 2026-07-09 | 2026-07-09 | AC-03 | `NextIntlClientProvider` + `<html lang={mapToBcp47(locale)}>` + hreflang x-default |
| TASK-PB-P0-012-US-104-FE-011 | `shared/i18n/index.ts` (barrel) | 11 | FE-001,002,003,005,006,007 | Done | 2026-07-09 | 2026-07-09 | AC-01,05,08,09 | barrel sin `request.ts` (server-only) |
| TASK-PB-P0-012-US-104-FE-010 | Lint anti-hardcoded (`react/jsx-no-literals`) | 12 | FE-009 | Done | 2026-07-09 | 2026-07-09 | AC-10 | regla activa + allowList símbolos + override tests; `page.tsx` usa `t()` |
| TASK-PB-P0-012-US-104-QA-001 | Unit tests (config, format, request, attachLocaleHeader) | 13 | FE-001,002,003,005 | Done | 2026-07-09 | 2026-07-09 | AC-01,08,09 | 4 specs, todos verdes |
| TASK-PB-P0-012-US-104-QA-002 | Component tests (`<Money>`, `<LocaleSwitcher>`) | 14 | FE-006, FE-007 | Done | 2026-07-09 | 2026-07-09 | AC-05,09 | RTL + userEvent; aria-label, valor activo, cookie+refresh |
| TASK-PB-P0-012-US-104-QA-003 | Integration tests `localeMiddleware` | 15 | FE-008 | Done | 2026-07-09 | 2026-07-09 | AC-02,06,07 | 7 casos (`@vitest-environment node`); x-locale verificado |
| TASK-PB-P0-012-US-104-QA-004 | E2E Playwright (switcher, detección, fallback) | 16 | FE-007,008,009 | Done | 2026-07-09 | 2026-07-09 | AC-11 | 3 specs verdes (usan `test.use({locale})`, D4) |
| TASK-PB-P0-012-US-104-SEC-001 | Cookie técnica `eventflow_locale` separada de auth | 17 | FE-007 | Done | 2026-07-09 | 2026-07-09 | AC-05 | flags SameSite=Lax/Secure-prod/no-HttpOnly verificados; README § Cookies |
| TASK-PB-P0-012-US-104-SEC-002 | Audit secrets/XSS catálogos + `npm audit` | 18 | FE-004 | Done | 2026-07-09 | 2026-07-09 | AC-12 | 0 secrets en catálogos; log middleware sin Accept-Language completo; audit 1 High tracked |
| TASK-PB-P0-012-US-104-QA-005 | Pipeline canónico + PR hygiene | 19 | QA-001,002,003,004 | Done | 2026-07-09 | 2026-07-09 | AC-12 | ci/lint/typecheck/test/build/e2e exit 0; 0 artefactos fuera de scope |
| TASK-PB-P0-012-US-104-DOC-001 | `web/README.md` § i18n + § Cookies | 20 | QA-005 | Done | 2026-07-09 | 2026-07-09 | AC-01,04,05,09,10 | secciones i18n (locales, detección, es-419, ICU, fallback, lint, handoff) + Cookies |
| TASK-PB-P0-012-US-104-DOC-002 | Housekeeping ADR-FE-007 + Doc 15 §17/§15 (post-merge) | 21 | DOC-001 | Done | 2026-07-09 | 2026-07-09 | AC-12 | Registrado/trackeado en README § Documentation Alignment (5 ítems). Redacción ADR/edición Doc base diferida (guardrail ADR, ver D5) |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Comandos globales (desde `web/`, pipeline canónico Doc 21 §9.2 desde `npm ci` limpio):
> `npm ci` → exit 0; `npm run lint` (`react/jsx-no-literals` + `jsx-a11y` + prettier, `--max-warnings=0`) → exit 0;
> `npm run typecheck` → exit 0; `npm run test` (Vitest) → exit 0 (**35 passed / 8 files**);
> `npm run build` → exit 0 (Middleware 33.6 kB, `/` dynamic `ƒ`); `npm run test:e2e` (Playwright) → exit 0 (**4 passed**: 3 i18n + smoke US-103).
> Se instaló `@formatjs/intl-localematcher@^0.5` como dep directa (autorizado FE-008; ya transitive de next-intl).

### FE-001 / FE-002 (Done) — config + format
- `config.ts`: `locales` (4), `defaultLocale='es-LATAM'`, `cookieName='eventflow_locale'`, `localeLabels`, `isSupportedLocale` (whitelist).
- `format.ts`: `mapToBcp47` (`es-LATAM→es-419`), `formatDate/formatNumber/formatCurrency` (delegan en `Intl.*`), `try/catch` en currency (EC-05).

### FE-004 (Done) — catálogos
- 16 JSON en `messages/<locale>/{common,navigation,errors,validation}.json`. Los 4 locales con traducciones reales (es-LATAM 100% + es-ES/pt/en traducidos — supera el mínimo de placeholders, D3), habilitando aserciones E2E locale-distintas y mejor valor de demo (NFR-I18N-001).

### FE-003 (Done) — request config
- `request.ts`: `getRequestConfig` (App Router sin routing; resuelve locale desde header `x-locale`→cookie→default). `loadMessages` mergea sobre base es-LATAM (fallback runtime); `createMessageFallback` dev (`[<locale>] ns.key`) / prod (ruta). Import estático de JSON (D2). Helpers `deepMerge`/`createMessageFallback`/`loadMessages` exportados para tests.

### FE-005 (Done) — attachLocaleHeader
- Cliente (lee cookie) + server (locale explícito) → `{ 'Accept-Language': mapToBcp47(locale) }`; fallback default. Handoff US-106 documentado en README.

### FE-006 / FE-007 (Done) — componentes + hook
- `Money.tsx` (Client): `formatCurrency` con locale activo, sin conversión (Doc 15 §32). `useLocale.ts`: `{locale, supportedLocales, setLocale}`; `setLocale` escribe cookie (SameSite=Lax, Secure prod, Max-Age 1 año, path=/, sin HttpOnly) + `router.refresh()`. `LocaleSwitcher.tsx`: `<select>` nativo accesible, `aria-label` vía `t('navigation.localeSwitcher.label')`.

### FE-008 (Done) — middleware
- `src/middleware.ts`: `resolveLocale` (puro, exportado) cookie(whitelist)→`Accept-Language`(`@formatjs/intl-localematcher` sobre tags mapeados)→default; `localeMiddleware` propaga `x-locale`; `default`+`config.matcher` (excluye `_next|static|api|favicon|robots|sitemap`). No setea cookie auto, no redirect URL, no role guard (componible con US-105). Log dev solo `{locale, source}` (SEC-05).

### FE-009 / FE-010 / FE-011 (Done) — layout, lint, barrel
- `layout.tsx`: `async`, `getLocale()`+`getMessages()`, `<html lang={mapToBcp47(locale)}>` (D1), `NextIntlClientProvider`, `<link hrefLang="x-default">`. `next.config.mjs`: `createNextIntlPlugin('./src/shared/i18n/request.ts')`, sin `i18n` legacy (VR-05). `page.tsx`: `t('appName')`/`t('welcome')` + `<LocaleSwitcher>`. `.eslintrc.cjs`: `react/jsx-no-literals` (allowList símbolos + override tests). `index.ts` barrel.

### QA-001..004 (Done) — tests
- Unit: `config.test.ts`, `format.test.ts` (spy `Intl.*` con locale mapeado; EC-05), `request.test.ts` (deepMerge/fallback/loadMessages), `attachLocaleHeader.test.ts`. Component: `Money.test.tsx`, `LocaleSwitcher.test.tsx` (RTL + userEvent, `next/navigation` mock). Integration: `middleware/locale.test.ts` (7 casos, `@vitest-environment node`, x-locale). E2E: `i18n.switcher/detection/fallback.spec.ts`. Total 35 unit/comp/int + 4 E2E.

### SEC-001 / SEC-002 (Done)
- Cookie `eventflow_locale`: SameSite=Lax, Secure solo prod, sin HttpOnly, Max-Age 1 año, sin PII/firma; separada de la cookie auth de US-108 (README § Cookies). Catálogos: 0 secrets/URLs/keys (grep). Middleware no loguea `Accept-Language` completo. `npm audit --omit=dev`: 1 High (advisory agregada `next`, tracked — heredado US-103) + 2 Moderate (bajo umbral).

### QA-005 (Done) — pipeline + hygiene
- Pipeline canónico exit 0 (ver comandos globales). PR hygiene: 0 `'use server'`, 0 `app/api`, 0 `QueryClient`/MSW/route-groups/`roleGuardMiddleware`/`i18n` legacy/`language_code` en código (únicos hits: README + JSDoc de boundary).

### DOC-001 / DOC-002 (Done)
- README § i18n (locales, detección, mapeo es-419, claves/ICU, fallback dev/prod, lint anti-hardcoded, cómo agregar locale, handoff US-106) + § Cookies + § Documentation Alignment (5 ítems). DOC-002: registrado/trackeado; redacción de ADR-FE-007 y edición de Doc 15/22 **diferidas** (guardrail: no crear/superar ADRs sin autorización explícita — D5).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | `<html lang={locale}>` (spec AC-03) | `<html lang={mapToBcp47(locale)}>` (`es-LATAM→es-419`) | `es-LATAM` no es BCP-47 válido → rompería `jsx-a11y/lang` y WCAG. Coherente con la excepción D1 de US-103. | Bajo (mejora a11y) | Ninguna | §8, §16 | No | Documentado en layout + README § i18n |
| D2 | `request.ts` con dynamic import por área (spec §18 paso 3) | Import estático de los 16 JSON + merge sobre es-LATAM | Robusto y testeable en Vitest y Next sin depender del context dinámico de webpack; catálogos pequeños. Mismo resultado funcional (merge + fallback). | Bajo | Ninguna | §8 i18n, §13 | No | Documentado en `request.ts` |
| D3 | es-ES/pt/en con placeholders `[ES-LATAM]` (spec AC-04) | 4 locales con traducciones reales de las áreas transversales | Mejor valor de demo (NFR-I18N-001, "inglés no negociable"), aserciones E2E locale-distintas. es-LATAM sigue 100%. La spec permite placeholders pero no prohíbe traducir. | Bajo (positivo) | Ninguna | §6 AC-04 | No | Sin gaps; fallback igualmente probado en unit tests |
| D4 | E2E de detección con `Accept-Language` header (spec §13) | `test.use({ locale })` de Playwright | Chromium ignora `extraHTTPHeaders` para el `Accept-Language` de navegación; `locale` lo fija de forma fiable. Mismo objetivo (detección por header). | Bajo | Ninguna | §13 E2E | No | 3 E2E verdes |
| D5 | DOC-002: redactar ADR-FE-007 + amender Doc 15 §17/§15 | Registrado/trackeado en README § Documentation Alignment; redacción/edición diferida | Guardrail de la skill: no crear/superar ADRs ni editar docs base sin autorización explícita. Housekeeping post-merge no bloqueante. | Bajo | §13 inmutabilidad | §16 | Sí (post-merge, con autorización) | 5 ítems registrados; pendiente housekeeping autorizado |

## 10. Final Validation

- Task completion: 21/21 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped)
- Acceptance Criteria coverage: 12/12 (AC-01..AC-12) con evidencia (§5 mapeo + §7)
- Lint: `npm run lint` (`react/jsx-no-literals` activo + `jsx-a11y` + prettier, `--max-warnings=0`) → **Passed** (exit 0)
- Typecheck: `npm run typecheck` (strict + noUncheckedIndexedAccess) → **Passed** (exit 0)
- Tests: `npm run test` → **Passed** — 35 passed / 8 files (unit + component + integration)
- Build: `npm run build` → **Passed** (exit 0; Middleware compilado 33.6 kB; `/` server-rendered)
- E2E: `npm run test:e2e` → **Passed** — 4 passed (switcher, detección pt, fallback es-LATAM, smoke US-103)
- Migrations / Seed: **Not Applicable** — sin backend/persistencia (habilita NFR-I18N-006 para EPIC-SEED-001)
- Authorization: **Not Applicable** — frontend UX-only (ADR-FE-003); anonymous puede usar el switcher
- Security: **Passed** — cookie técnica separada de auth (flags correctos); 0 secrets en catálogos; log middleware sin `Accept-Language` completo (SEC-05); sin Server Actions/API Routes BFF/`i18n` legacy. `npm audit --omit=dev`: 1 High tracked (advisory `next`, heredado US-103) + 2 Moderate.
- Accessibility: **Passed** — `<LocaleSwitcher>` accesible (aria-label vía `t()`, `<select>` nativo keyboard/announce); `<html lang>` BCP-47 válido; `jsx-a11y` activo.
- i18n: **Passed** — 4 locales, detección cookie+Accept-Language sin prefijo URL, fallback dev/prod, ICU, lint anti-hardcoded.
- Documentation: **Passed** — README § i18n + § Cookies + § Documentation Alignment.
- Out of scope (AC-12): **Passed** — 0 artefactos fuera de scope.
- Cambios no relacionados en working tree: Ninguno (solo `web/` y `management/workflows/`; US-103 preservada).
- Unresolved debt: (a) advisory `next` (heredada, tracked); (b) DOC-002 housekeeping (ADR-FE-007 + Doc 15 §17/§15) diferido post-merge con autorización; (c) `attachLocaleHeader` sin cablear hasta US-106 (handoff documentado); (d) script de cobertura i18n de los 4 locales diferido (Future).
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T22:39:53Z | Initialized | Execution record creado |
| 2026-07-09T22:39:53Z | Readiness | READY_WITH_WARNINGS (W1 US-103 en working tree, W2 doc-alignment, W3 handoff US-106) |
| 2026-07-09T22:39:53Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-09T22:54:11Z | Implementación | 21 tareas Not Started → Done; módulo `shared/i18n/` (config/format/request/attachLocaleHeader/Money/useLocale/LocaleSwitcher/index) + `middleware.ts` + layout/page + 16 catálogos + lint anti-hardcoded + `@formatjs/intl-localematcher` |
| 2026-07-09T22:54:11Z | Validación | ci/lint/typecheck/test(35)/build/e2e(4) = Passed; audit 1 High tracked + 2 Moderate; hygiene AC-12 limpio |
| 2026-07-09T22:54:11Z | Done | User Story US-104 completada (Execution Record Status → Done) |
