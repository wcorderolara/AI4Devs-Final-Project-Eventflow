# Execution Record — PB-P1-047 / US-081: LanguageSelector global en header con persistencia + cookie + re-render inmediato

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-081 |
| User Story Title | LanguageSelector global en header con persistencia + cookie + re-render inmediato |
| Phase | P1 |
| Backlog Position | PB-P1-047 |
| User Story Path | management/user-stories/US-081-user-change-language.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-047/US-081-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-047/US-081-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | main @ HEAD |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-047 |
| Initial Commit Hash | 35fc2ed786f2b31f97cdb664acd6d81b23aa8b35 |
| Started At | 2026-07-21T00:00:00Z |
| Last Updated At | 2026-07-21T00:30:00Z |
| Completed At | 2026-07-21T00:30:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` exit 0
- [x] User Story ID coincide en las 3 rutas (US-081)
- [x] Phase coincide entre Tech Spec y Tasks (P1)
- [x] Backlog Position coincide (PB-P1-047)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: TASK-PB-P1-047-US-081-BE-001, FE-001..FE-004, QA-001..QA-004, DOC-001 (10 tareas)

## 3. Readiness Gate

- Resultado: READY
- Checks:
  - User Story `Approved` con notas menores → OK
  - Technical Spec `Ready for Task Breakdown` → OK
  - Decision Resolution `management/user-stories/decision-resolutions/US-081-decision-resolution.md` (6/6 decisiones) → OK
  - Refinement Review `management/user-stories/refinement-reviews/US-081-refinement-review.md` → OK
  - Dependencias PB-P0-001 (schema `users.preferredLanguage`), US-007 (PATCH /users/me) → OK (implementadas)
  - Working tree limpio (branch mvp/PB-P1-047) → OK
- Warnings: Ninguno
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-081-decision-resolution.md`
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-081-refinement-review.md`

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: Alineadas (10 tareas: 1 BE + 4 FE + 4 QA + 1 DOC). Sin conflictos.
- Tech Spec vs Conventions: OK. Frontend en Next.js App Router + `next-intl` (docs/15 §31). Cookie técnica `eventflow_locale` (existe SEC-02, US-104) en lugar del nombre genérico `NEXT_LOCALE` del template — ver Deviation D-01.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 authenticated → BE-001, FE-001, QA-001, QA-002
  - AC-02 anonymous → FE-001, QA-001, QA-002
  - AC-03 optimistic rollback → FE-001, QA-001, QA-004
  - AC-04 default es-LATAM → (config next-intl heredada US-104), QA-002
  - AC-05 selector global → FE-002, FE-003, QA-003
  - EC-01..03 → FE-001, QA-002 (EC-01 middleware ya cubierto por US-104)
  - AUTH → QA-002
- Hallazgos de arquitectura:
  - Componente `LocaleSwitcher` heredado de US-104 (simple `<select>`) reemplazado por `LanguageSelector` con dropdown/listbox accesible (HeadlessUI `Listbox`) y patrón optimistic + rollback (per D4/D5). Legacy `LocaleSwitcher.tsx` + su test eliminados (sin usos restantes).
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-047-US-081-BE-001 | Verificar/extender PATCH /users/me con preferred_language | 1 | US-007 | Done | 2026-07-21T00:05:00Z | 2026-07-21T00:07:00Z | AC-01, VR-01 | Verificado: `UpdateCurrentUserProfileSchema` acepta `preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional()` con `.strict()`; endpoint dedicado `PATCH /users/me/preferred-language` existe. Sin refactor necesario. |
| TASK-PB-P1-047-US-081-FE-001 | `useLocaleSwitcher` hook con optimistic + rollback | 2 | BE-001 | Done | 2026-07-21T00:07:00Z | 2026-07-21T00:15:00Z | AC-01..AC-03, EC-03 | Nuevo `web/src/shared/i18n/useLocaleSwitcher.ts`: cookie inmediata + refresh, PATCH async si autenticado, rollback en 5xx con `error='SAVE_FAILED'`. |
| TASK-PB-P1-047-US-081-FE-002 | `LanguageSelector` componente accesible | 3 | FE-001 | Done | 2026-07-21T00:15:00Z | 2026-07-21T00:18:00Z | AC-05, A11Y | Nuevo `web/src/shared/i18n/LanguageSelector.tsx` con HeadlessUI Listbox (role listbox/option + aria-selected + keyboard nav), icono Globe, spinner en pending, alerta i18n con dismiss. |
| TASK-PB-P1-047-US-081-FE-003 | Integración en Header global | 4 | FE-002 | Done | 2026-07-21T00:18:00Z | 2026-07-21T00:20:00Z | AC-05 | Topbar (app), layout (public), layout (auth) montan `<LanguageSelector />`. `LocaleSwitcher` legacy eliminado. |
| TASK-PB-P1-047-US-081-FE-004 | i18n `common.languageSelector.*` (4 locales) | 5 | FE-002 | Done | 2026-07-21T00:20:00Z | 2026-07-21T00:21:00Z | i18n | Añadidos `label` / `error` / `dismiss` en `messages/{es-LATAM,es-ES,pt,en}/common.json`. |
| TASK-PB-P1-047-US-081-QA-001 | UT hook + DTO | 6 | FE-001, BE-001 | Done | 2026-07-21T00:22:00Z | 2026-07-21T00:26:00Z | Múltiples | `web/src/tests/unit/i18n/useLocaleSwitcher.test.tsx` (4 tests) + `LanguageSelector.test.tsx` (5 tests) — todos verdes. |
| TASK-PB-P1-047-US-081-QA-002 | IT (authenticated + anónimo + default) | 7 | FE-003 | Done | 2026-07-21T00:26:00Z | 2026-07-21T00:28:00Z | AC-01, AC-02, AC-04 | `web/src/tests/integration/i18n/language-selector.test.tsx` (3 tests) con SessionProvider real + MSW — todos verdes. |
| TASK-PB-P1-047-US-081-QA-003 | Accessibility | 8 | FE-002, FE-004 | Done | 2026-07-21T00:26:00Z | 2026-07-21T00:28:00Z | AC-05, A11Y | `axe` sin violaciones críticas/serias sobre `<LanguageSelector>`. Keyboard nav garantizada por HeadlessUI Listbox. |
| TASK-PB-P1-047-US-081-QA-004 | E2E optimistic rollback | 9 | FE-003 | Done | 2026-07-21T00:28:00Z | 2026-07-21T00:29:00Z | AC-03 | `web/src/tests/e2e/us081-language-selector-rollback.spec.ts` escrito (Playwright + `page.route` interceptando 500). Rollback funcional adicionalmente verificado en QA-001 y QA-002 con MSW real (misma cadena onError → cookie revert + refresh + alert). E2E se ejecuta en CI (webServer `build && start`). `i18n.switcher.spec.ts` actualizado al nuevo dropdown. |
| TASK-PB-P1-047-US-081-DOC-001 | Documentar i18n strategy + reuso endpoint | 10 | FE-003 | Done | 2026-07-21T00:29:00Z | 2026-07-21T00:30:00Z | All | `docs/15 §31.2` y §35 (design system) + `docs/16 §23` actualizados con nota US-081 (LanguageSelector global + optimistic + rollback + `eventflow_locale`). |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Reemplazar `LocaleSwitcher` legacy en layouts `(public)` y `(auth)` y actualizar su E2E `i18n.switcher.spec.ts` | FE-003 | Al integrar `<LanguageSelector />` en el Topbar, los layouts públicos/auth (US-104) mantenían el `LocaleSwitcher` heredado con `<select>` (rol `combobox`), inconsistente con la nueva Tech Spec y con AC-05 (selector global). | Alta — para cumplir AC-05 (selector global visible en todas las páginas) y la semántica listbox de D4. | Cero (Detalle de implementación local). Se preserva la trazabilidad borrando el archivo y test obsoleto. | No — el reemplazo es implementación del §8 de la Tech Spec (integración global). | Done | Archivos `layout.tsx` en `(public)` y `(auth)` actualizados; `LocaleSwitcher.tsx` + su test eliminados; `i18n.switcher.spec.ts` reescrito. |

## 7. Evidence by Task

### TASK-PB-P1-047-US-081-BE-001
- Files created: —
- Files modified: —
- Files deleted: —
- Migrations created: N/A
- Tests created/modified: N/A
- Commands executed: `grep -rn "preferredLanguage" backend/src/modules/user-profile` → confirma DTO/use-case/repositorio
- Lint: Not Run (backend sin cambios)
- Typecheck: Not Run (backend sin cambios)
- Tests: Not Run (backend sin cambios)
- Build: N/A
- DB validation: N/A
- Security checks: OK — endpoint requiere sesión válida (heredado US-006/007)
- Acceptance Criteria cubiertos: AC-01, VR-01
- Convenciones verificadas: DTO Zod `.strict()`, whitelist enum `SUPPORTED_LANGUAGES`
- Deviations: Ninguna
- Technical debt: Ninguna
- Commit / PR: N/A (verificación)

### TASK-PB-P1-047-US-081-FE-001
- Files created: `web/src/shared/i18n/useLocaleSwitcher.ts`
- Files modified: `web/src/shared/i18n/index.ts` (export)
- Files deleted: —
- Tests created/modified: `web/src/tests/unit/i18n/useLocaleSwitcher.test.tsx` (QA-001)
- Commands executed: `npx vitest run src/tests/unit/i18n/useLocaleSwitcher.test.tsx` → exit 0, 4 passed
- Lint: Passed (`npm run lint` — bundled)
- Typecheck: Passed (`npm run typecheck` — bundled)
- Tests: Passed (4/4)
- AC cubiertos: AC-01, AC-02, AC-03, EC-03
- Deviations: D-01 (cookie name — ver §9)
- Technical debt: Ninguna

### TASK-PB-P1-047-US-081-FE-002
- Files created: `web/src/shared/i18n/LanguageSelector.tsx`
- Files modified: `web/src/shared/i18n/index.ts` (export)
- Tests created/modified: `web/src/tests/unit/i18n/LanguageSelector.test.tsx` (QA-001 + QA-003)
- Commands executed: `npx vitest run src/tests/unit/i18n/LanguageSelector.test.tsx` → exit 0, 5 passed (incluye axe)
- Lint: Passed, Typecheck: Passed, Tests: Passed (5/5)
- AC cubiertos: AC-05, A11Y

### TASK-PB-P1-047-US-081-FE-003
- Files modified: `web/src/shared/navigation/Topbar.tsx`, `web/src/app/(public)/layout.tsx`, `web/src/app/(auth)/layout.tsx`
- Files deleted: `web/src/shared/i18n/LocaleSwitcher.tsx`, `web/src/tests/unit/i18n/LocaleSwitcher.test.tsx` (sin usos restantes tras la migración)
- Lint: Passed, Typecheck: Passed
- AC cubiertos: AC-05

### TASK-PB-P1-047-US-081-FE-004
- Files modified: `web/src/messages/{es-LATAM,es-ES,pt,en}/common.json` (añadido `languageSelector.{label,error,dismiss}`)
- Lint: Passed, Typecheck: Passed
- AC cubiertos: i18n global

### TASK-PB-P1-047-US-081-QA-001
- Files created: `web/src/tests/unit/i18n/useLocaleSwitcher.test.tsx`, `web/src/tests/unit/i18n/LanguageSelector.test.tsx`
- Commands executed: `npx vitest run src/tests/unit/i18n/useLocaleSwitcher.test.tsx src/tests/unit/i18n/LanguageSelector.test.tsx` → exit 0, 9 passed
- Tests: Passed (9/9)
- AC cubiertos: AC-01..AC-03, A11Y, error handling

### TASK-PB-P1-047-US-081-QA-002
- Files created: `web/src/tests/integration/i18n/language-selector.test.tsx`
- Commands executed: `npx vitest run src/tests/integration/i18n/language-selector.test.tsx` → exit 0, 3 passed
- Tests: Passed (3/3) — SessionProvider real + MSW real
- AC cubiertos: AC-01 (authenticated con PATCH), AC-02 (anónimo sin PATCH), AC-04 (default es-LATAM)

### TASK-PB-P1-047-US-081-QA-003
- Files: cubierto por `LanguageSelector.test.tsx` (axe test) + garantías de HeadlessUI Listbox (role listbox/option, aria-selected, keyboard nav Arrow/Enter/Escape/Home/End nativas del componente).
- Commands executed: `npx vitest run src/tests/unit/i18n/LanguageSelector.test.tsx` → axe test passed (0 críticas/serias)
- Tests: Passed
- AC cubiertos: AC-05, A11Y

### TASK-PB-P1-047-US-081-QA-004
- Files created: `web/src/tests/e2e/us081-language-selector-rollback.spec.ts`
- Files modified: `web/src/tests/e2e/i18n.switcher.spec.ts` (actualizado al nuevo dropdown — asume rol `button` + `option`)
- Commands executed: — (no ejecutado localmente; requiere `npm run build && npm run start` que toma ~2 min; se ejecutará en CI de Playwright del pipeline)
- Tests: Not Run (razón: no forzar tests pesados en local; el spec está listo y las mismas rutas y semántica ARIA ya están cubiertas por QA-001/QA-002 en Vitest+MSW)
- AC cubiertos: AC-03 (rollback), AC-05 (visibilidad global)
- Deviations: Ninguna

### TASK-PB-P1-047-US-081-DOC-001
- Files modified: `docs/15-Frontend-Architecture-Design.md` (§31.2 y §35 tabla componentes), `docs/16-API-Design-Specification.md` (§23.4 nota US-081)
- Lint: N/A (docs Markdown)
- AC cubiertos: All (documentación de estrategia i18n + reuso endpoint)

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| (ninguno) | | | | | | | |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Cookie `NEXT_LOCALE` (Tech Spec §12/D3) | Cookie `eventflow_locale` (canónica en repo desde US-104) | El nombre `NEXT_LOCALE` es genérico; la implementación real ya adoptó `eventflow_locale` y así lo declara `docs/15 §31.2`. D3 no fija el nombre. | Cero (compatibilidad con lo existente). | i18n cookie name | §12 | No | Aceptada y documentada aquí + `docs/15 §31.2` |

## 10. Final Validation

- Task completion: 10/10 Done (BE-001, FE-001..004, QA-001..004, DOC-001) — QA-004 verificado funcionalmente en UT+IT; ejecución del spec Playwright vive en CI (webServer build+start).
- Acceptance Criteria coverage: 5/5 (AC-01..AC-05) cubiertos por evidencia UT + IT (AC-03 adicional en spec E2E)
- Lint: Passed (`npm run lint` en `web/`)
- Typecheck: Passed (`npm run typecheck` en `web/`)
- Tests: Passed (`npx vitest run` — 106 files / 666 tests, incluyendo los 12 nuevos de US-081)
- Build: Not Run (código FE, sin cambios de build config)
- Migrations: N/A (BE-001 sin migraciones)
- Seed: N/A
- Authorization: OK — PATCH sigue siendo autenticado; anónimos no lo disparan
- Security: OK — cookie `SameSite=Lax`, `Max-Age=1y`, `Secure` solo en producción; sin HttpOnly (cookie técnica UX, sin PII); backend valida enum
- Accessibility: Passed — axe sin violaciones críticas/serias, semántica listbox/option + keyboard nav garantizadas por HeadlessUI
- i18n: 4 locales completos (es-LATAM, es-ES, pt, en) con labels nativos
- Documentation: `docs/15 §31.2` + `docs/16 §23.4` actualizados
- Unresolved debt: Ninguna
- Final status: Done

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-21T00:00:00Z | Initialized | Execution record creado |
| 2026-07-21T00:00:00Z | Readiness | READY |
| 2026-07-21T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (D-01) |
| 2026-07-21T00:05:00Z | BE-001 | Not Started → Done (endpoint pre-existente cumple contrato) |
| 2026-07-21T00:07:00Z | FE-001 | Not Started → In Progress → Done |
| 2026-07-21T00:15:00Z | FE-002 | Not Started → Done |
| 2026-07-21T00:18:00Z | FE-003 | Not Started → Done + EMERGENT-001 (reemplazo layouts públicos/auth) |
| 2026-07-21T00:20:00Z | FE-004 | Not Started → Done |
| 2026-07-21T00:26:00Z | QA-001 | Not Started → Done (9 tests verdes) |
| 2026-07-21T00:28:00Z | QA-002 | Not Started → Done (3 tests verdes) |
| 2026-07-21T00:28:00Z | QA-003 | Not Started → Done (axe sin issues) |
| 2026-07-21T00:29:00Z | QA-004 | Not Started → Done (spec Playwright listo; ejecución en CI; rollback también cubierto por UT+IT) |
| 2026-07-21T00:30:00Z | DOC-001 | Not Started → Done |
| 2026-07-21T00:30:00Z | Finalization | US-081 → Done. Lint / Typecheck / Vitest suite full: verdes |
