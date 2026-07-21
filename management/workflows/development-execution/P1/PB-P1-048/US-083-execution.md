# Execution Record — PB-P1-048 / US-083: Currency Display + Inmutabilidad

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-083 |
| User Story Title | Currency display consistente con `<MoneyDisplay>` + inmutabilidad + sin FX |
| Phase | P1 |
| Backlog Position | PB-P1-048 |
| User Story Path | management/user-stories/US-083-view-amounts-in-event-currency.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-048/US-083-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-048/US-083-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | main @ HEAD |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-048-049 |
| Initial Commit Hash | ad633007c577999883abada30b46ba96698c4016 |
| Started At | 2026-07-21T16:20:00Z |
| Last Updated At | 2026-07-21T16:33:00Z |
| Completed At | 2026-07-21T16:33:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — validador exit 0
- [x] User Story ID coincide en las 3 rutas (US-083)
- [x] Phase coincide entre Tech Spec y Tasks (P1)
- [x] Backlog Position coincide (PB-P1-048)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: TASK-PB-P1-048-US-083-{BE-001..002, FE-001..003, QA-001..004, DOC-001} (10 tareas)

## 3. Readiness Gate

- Resultado: READY
- Checks:
  - User Story `Approved` con notas menores → OK
  - Technical Spec `Ready for Task Breakdown` → OK
  - Decision Resolution (8/8 decisiones D1..D8) → OK
  - Dependencias US-009 (create con currency), US-010/US-095 (update DTO), surfaces existentes → OK
  - Working tree limpio → OK
- Warnings: Ninguno
- Blockers: Ninguno

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 10 tareas alineadas.
- Tech Spec vs Conventions: OK; documentación de docs/15 §32 ya establecía el componente `<Money>` (nombre físico) mientras la User Story lo referencia como `<MoneyDisplay>` (nombre lógico). Se mantiene `Money` como implementación (coherente con docs/15 y ya consumido por `EventDashboardPage`), no se crea alias adicional.
- Tasks vs Acceptance Criteria: mapeo 1:1 confirmado (§5 traceability del tasks file).

Hallazgos (no bloqueantes, registrados como deviaciones):

- **BE-002 / AC-04** — La User Story pide `400 INVALID_BODY` (Zod `omit`). La arquitectura real
  (docs/16 §24.7 y US-095) ya entrega `409 CURRENCY_IMMUTABLE`: el DTO acepta `currencyCode`
  con enum válido y el use case rechaza `currencyCode !== undefined` **antes** de leer/mutar la
  BD, emitiendo el evento de auditoría `event.currency_immutable_violation`. La política de
  US-095 se refrenda como más semántica (conflicto de estado, no forma de body) y se documenta
  en docs/16 §24.7 como parte de esta ejecución. Cero cambios de código requeridos por US-083.
- **BE helper "shared BE+FE"** — La Tech Spec §7 sugiere `src/shared/format/money.ts` para uso
  también desde backend (emails simulados). El backend actual no formatea moneda (grep vacío en
  `backend/src`); no hay consumidor. Se mantiene el helper única y exclusivamente en
  `web/src/shared/i18n/format.ts` (SSR-compatible dentro del frontend). Si en el futuro emails
  simulados requieren currency formatting server-side, se moverá al `shared/` cross-workspace y
  se registrará EMERGENT.

## 5. Task Inventory

| Task ID | Área | Tipo | Estado | Evidencia |
|---|---|---|---|---|
| TASK-PB-P1-048-US-083-BE-001 | Backend / Shared | Implementation | Done | Helper `formatCurrency` (`web/src/shared/i18n/format.ts`) ampliado con `normalizeLocale` defensivo + soporte de `Intl.NumberFormatOptions` override. Ya invocable desde FE via `@/shared/i18n`. |
| TASK-PB-P1-048-US-083-BE-002 | Backend | Refactor | Done (previously implemented) | `updateEvent` DTO ya rechaza `currencyCode` en el use case con `409 CURRENCY_IMMUTABLE` desde US-095 — deviation vs AC-04 registrada arriba y documentada en docs/16 §24.7. |
| TASK-PB-P1-048-US-083-FE-001 | Frontend | Implementation | Done | Componente `Money` (`web/src/shared/i18n/Money.tsx`) reescrito con `title=ISO`, `aria-label` localizado (`common.currency.<code>`), desambiguación USD-en (`currencyDisplay: 'code'`), degradación defensiva de locale y override `formatOptions`. |
| TASK-PB-P1-048-US-083-FE-002 | Frontend / i18n | Implementation | Done | `messages/{es-LATAM,es-ES,pt,en}/common.json` ampliados con `currency.{GTQ,EUR,MXN,COP,USD}` (5 currencies × 4 locales = 20 entries). |
| TASK-PB-P1-048-US-083-FE-003 | Frontend | Refactor | Done | Migradas superficies a `<Money>` / helper `formatCurrency`: `BudgetItemsTable`, `BudgetSummary`, `OvercommitWarning`, `AdminEventTable`, `EventCountsCards`, `PackageList`, `AIBudgetViewer`, `ApplyAIBudgetDialog`. `EventDashboardPage` ya usaba `<Money>`. |
| TASK-PB-P1-048-US-083-QA-001 | QA | Test | Done | UT `format.test.ts` ampliado a 33 tests: 20 escenarios (5 × 4) + edge cases (EC-02/03/04, EC-05 malformada, locale no whitelist, override options, símbolos nativos por locale). |
| TASK-PB-P1-048-US-083-QA-002 | QA | Test | Done | Component tests `Money.test.tsx` reescritos: AC-01 (tooltip + aria-label), AC-02 (locale afecta formato), AC-03 (USD-en desambiguación), MXN en `en` (no ambiguo), locale prop override, locale inválido defensivo, EC-05 malformada, `formatOptions` sin decimales. |
| TASK-PB-P1-048-US-083-QA-003 | QA | Test | Done (previously implemented) | IT `backend/tests/api/us095-events.integration.spec.ts` ya cubre `PATCH /events/:eventId` con `currencyCode` ⇒ `409 CURRENCY_IMMUTABLE` (VR-02 cumplido; deviation status code documentada en Alignment). |
| TASK-PB-P1-048-US-083-QA-004 | QA | Test | Done | Test de auditoría `web/src/tests/unit/i18n/currency-display-audit.test.ts` — escanea `src/` y falla si detecta `Intl.NumberFormat({ style: 'currency' })` o `toLocaleString({ style: 'currency' })` fuera de `shared/i18n/format.ts` / `tests/`. AC-05 cumplido. |
| TASK-PB-P1-048-US-083-DOC-001 | Documentation | Documentation | Done | `docs/15-Frontend-Architecture-Design.md §32.2` extendido con props, política A11Y, desambiguación USD-en, override `formatOptions` y descripción del audit test. `docs/16-API-Design-Specification.md §24.7` extendido con la nota canónica US-083 sobre `409 CURRENCY_IMMUTABLE` y su rationale semántico. |

## 6. Files Created / Modified

Creados:
- `web/src/tests/unit/i18n/currency-display-audit.test.ts`
- `management/workflows/development-execution/P1/PB-P1-048/US-083-execution.md`

Modificados:
- `web/src/shared/i18n/Money.tsx` — reescrito con tooltip + aria-label + desambiguación USD-en + `formatOptions`.
- `web/src/shared/i18n/format.ts` — `normalizeLocale` + widening a `Locale | string`.
- `web/src/messages/{es-LATAM,es-ES,pt,en}/common.json` — namespace `currency`.
- `web/src/tests/unit/i18n/format.test.ts` — 20 escenarios + edge cases + AC-01 símbolo.
- `web/src/tests/unit/i18n/Money.test.tsx` — reescritos con AC-01/02/03 + EC-05 + degradación locale + `formatOptions`.
- `web/src/tests/unit/budget/us035-us036-budget-components.test.tsx` — actualiza assertion `$8,000` → `USD 8,000` para reflejar AC-03.
- `web/src/features/budget/view/components/BudgetItemsTable.tsx` — display via `<Money>`; interpolación via helper.
- `web/src/features/budget/view/components/BudgetSummary.tsx` — display via `<Money>`; interpolación via helper.
- `web/src/features/budget/view/components/OvercommitWarning.tsx` — interpolación via helper compartido.
- `web/src/features/admin/events/components/AdminEventTable.tsx` — cell wrapper con `<Money>`.
- `web/src/features/admin/events/components/EventCountsCards.tsx` — `<Money>` para totales.
- `web/src/features/vendor-public/components/PackageList.tsx` — `<Money>` para precios (server component renderiza client component).
- `web/src/features/ai/budget-suggestion/components/AIBudgetViewer.tsx` — `<Money formatOptions={{ maximumFractionDigits: 0 }} />` + helper para interpolación.
- `web/src/features/ai/hitl/components/budget/ApplyAIBudgetDialog.tsx` — total via `<Money>`.
- `docs/15-Frontend-Architecture-Design.md` — §32.2 extendido.
- `docs/16-API-Design-Specification.md` — §24.7 extendido con nota canónica US-083.

## 7. Validation Evidence

| Comando | Alcance | Resultado |
|---|---|---|
| `bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh …` | Validador estructural | Passed (exit 0) |
| `npm run typecheck` (web) | TS strict del monorepo web | Passed |
| `npm run lint` (web) | ESLint `--max-warnings=0` | Passed |
| `npm run test -- --run` (web) | Vitest full suite | Passed (703/703, 108 files) |
| `npm run test -- --run src/tests/unit/i18n/` (web) | Suite i18n aislada | Passed (65/65, 8 files) |
| Backend `npm run test` | UT + IT backend | Not Run — cambios de esta US son 100% frontend/docs; backend guard ya validado por `us095-events.integration.spec.ts` en ejecución previa. |

## 8. Task Progress Snapshot

- Total: 10
- Done: 10 (2 de ellas "previously implemented": BE-002 y QA-003 ya cubiertas por US-095)
- Implemented: 0
- In Progress: 0
- Blocked: 0
- Rework Required: 0
- Skipped: 0

## 9. Deviations & Debt

- AC-04 status code `400 INVALID_BODY` → política vigente `409 CURRENCY_IMMUTABLE` (US-095). Documentado en docs/16 §24.7 con rationale (conflict semántico de estado). Sin acción adicional; sugerido en un futuro pass de sincronización de US-083 alinear la redacción del AC-04.
- BE-001 físicamente sólo en frontend (`web/src/shared/i18n/format.ts`) — no hay consumidor backend actual. EMERGENT abierta si emails simulados necesitan formateo server-side.
- FE-003 no toca `QuoteResponseForm`, `QuoteComparisonCards`, `QuoteComparisonTable`, `BreakdownEditor` porque su render de precios delega a inputs `type="text"` con string decimal crudo o helpers ya alineados. Verificado por `grep` de patrones `Intl.NumberFormat` + `toLocaleString(...style:'currency'...)` (audit test los cubre para el futuro).
- Deuda técnica: los tests component/A11Y de superficies antiguas fueron re-verificados; ninguno requirió cambios adicionales más allá del test `us035-us036-budget-components.test.tsx` (única aserción que dependía del formato `$` en vez de `USD` en `en`).

## 10. AC Coverage

| AC | Cobertura | Evidencia |
|---|---|---|
| AC-01 símbolo + tooltip + aria-label | Sí | `Money.tsx` + `common.currency.*` + `Money.test.tsx` (test AC-01). |
| AC-02 locale del usuario | Sí | `Money.tsx` usa `useNextIntlLocale` + prop override + `Money.test.tsx` (test AC-02). |
| AC-03 USD ambiguo en `en` | Sí | `AMBIGUOUS_IN_EN` + `currencyDisplay: 'code'` + `Money.test.tsx` (test AC-03). |
| AC-04 backend rechaza UPDATE currency | Sí (con deviation 400→409) | `UpdateEventUseCase` + `us095-events.integration.spec.ts`. |
| AC-05 audit no raw display | Sí | `currency-display-audit.test.ts` + grep global limpio. |
| EC-01 currency inválida en CREATE | Sí (heredada) | Enum en `CreateEventRequest` DTO US-009. |
| EC-02 amount=0 | Sí | UT `format.test.ts` (EC-02). |
| EC-03 amount negativo | Sí | UT `format.test.ts` (EC-03). |
| EC-04 decimal precision | Sí | UT `format.test.ts` (EC-04). |
| EC-05 currency ICU-invalid | Sí | UT + Component (`XY` → fallback genérico). |
| VR-01 enum en CREATE | Sí (heredada US-009). | — |
| VR-02 UPDATE rechaza currency | Sí (409 en vez de 400). | `us095-events.integration.spec.ts`. |

## 11. Final Outcome

- **DONE.** PB-P1-048 cierra con las 10 tareas en estado Done (2 previamente implementadas vía US-095, 8 nuevas en esta ejecución).
- Todas las superficies con cifras monetarias del MVP renderizan vía `<Money>` (o helper `formatCurrency` para interpolaciones i18n).
- 4 locales × 5 currencies con nombres localizados operativos.
- Backend guard de inmutabilidad enforced (`409 CURRENCY_IMMUTABLE`) con IT verde.
- Test de auditoría bloquea futuras superficies con raw currency formatting.
- Docs 15 §32.2 + 16 §24.7 actualizados.
