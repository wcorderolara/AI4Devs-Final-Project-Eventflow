# Execution Record — PB-P1-036 / US-062: Cancelar BookingIntent (bilateral + revert)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-062 |
| User Story Title | Cancelar BookingIntent (bilateral + revert committed) |
| Phase | P1 |
| Backlog Position | PB-P1-036 |
| User Story Path | management/user-stories/US-062-cancel-booking-intent.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-036/US-062-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-036/US-062-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-036 |
| Initial Commit Hash | f850db6 |
| Started At | 2026-07-17T18:15:00Z |
| Completed At | 2026-07-17T19:15:00Z |

## 2. Source Validation

- [x] `validate-inputs.sh` OK.
- [x] User Story `Approved`.
- [x] 18 tasks extraídos.

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`.
- Dependencias US-060/US-061 completadas.
- Warnings: DEV-01 sin prefijo `/vendor/` — `/organizer/`; `docs/16 §M07` → `§32.8`.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`. Deviaciones DEV-01..07 documentadas.

## 5. Task Inventory

| Task ID | Status | Evidencia |
| ------- | ------ | --------- |
| DB-001 | Done | Columnas `cancelled_at`/`cancelled_by`/`cancellation_reason` ya presentes en `booking_intents` (schema Prisma líneas 703-705, verificado con `\d booking_intents`). |
| DB-002 | Done | Sin migración requerida — DB-001 pass. |
| BE-001 | Done | `dto/cancel-booking-intent.request.ts` — reemplazado `cancellationReason` (US-096 requerido max 1000) por `reason` opcional max 500 (US-062 D3). Alias legacy `CancelBookingIntentRequestSchema` re-exporta el nuevo esquema. |
| BE-002 | Done | `QuoteEventName` extendido a 8 valores (`booking_intent.cancelled` nuevo). `BookingIntentEventName` en el port amplía la unión discriminada. |
| BE-003 | Done | `application/booking-intent.use-cases.ts` — `CancelBookingIntentUseCase` extendido con: (a) errores tipados `BookingIntentNotFoundError` / `BookingIntentNotCancellableError` (en lugar de `NotFoundError`/`BusinessRuleViolationError` genéricos), (b) `SELECT ... FOR UPDATE` sobre `booking_intents` para serialización concurrente (DEV-05 US-062 — 2do POST ⇒ 409), (c) helper `applyCounterpartCancelledNotification(tx)` que determina `cancelled_by_role` y envía 2 notifs a la contraparte con `event='booking_intent.cancelled'`, (d) helper `emitUnderflowWarnIfApplicable(tx)` que emite warn `budget.committed_underflow_corrected` cuando `amountCommitted < syncedAmount`, (e) `reason` normalizado (trim + null coalescing) para AC-03. Nuevo `us062.errors.ts` con `BookingIntentNotCancellableError` + `InvalidCancellationReasonError`. Códigos `BOOKING_INTENT_NOT_CANCELLABLE` en `error-codes.ts` + mapping en `error-handler.middleware.ts`. Port `booking-intent.repository.ts` extendido con `reason: string \| null`. |
| BE-004 | Done | DEV-02: reuso del middleware `organizerOrVendor` role guard existente (mismo comportamiento — organizer + vendor, admin excluido). Sin nuevo `BilateralRoleGuard`. |
| BE-005 | Done | `interface/booking-intent.routes.ts` — wiring `cancel: new CancelBookingIntentUseCase(..., { budgetSync, transactionRunner, bookingEvents: quoteEvents })`. Controller actualizado para pasar `body.reason ?? null`. |
| BE-006 | Done | Logs emitidos: `booking_intent.cancelled` (info), `budget.committed_underflow_corrected` (warn con `previousCommitted`/`attemptedSubtraction`). `DomainEventLogger` type extendido con `budgetItemId`, `previousCommitted`, `attemptedSubtraction`. |
| FE-002 | Done | `web/src/features/booking/api/bookingsApi.ts` — método `cancel({bookingIntentId, reason?})` con `httpPost` (body opcional). Tipos + hook `useCancelBookingIntent` que invalida `bookingsKeys.intents()`. MSW handler para `POST /booking-intents/:id/cancel` con triggers 200/400/401/403/404/409/429. Barrel `features/booking/index.ts` re-exporta el módulo cancel. |
| FE-001 | Done | `web/src/features/booking/components/CancelBookingDialog.tsx` — modal compartido organizer/vendor con `role="dialog"`, focus trap, ESC, textarea opcional con contador live 0..500 y `aria-describedby`. Rol-neutral (labels compartidos). Banner de error accesible por código estable. |
| FE-003 | Done | Nuevo `web/src/messages/{es-LATAM,es-ES,pt,en}/booking.json` con namespace `booking.cancel.*` (title, description, reason UI, actions, success, errors×8). Registrado en `web/src/shared/i18n/request.ts` para los 4 locales. |
| QA-001 | Done | `tests/unit/us062-cancel-booking-intent.spec.ts` — 17 tests: DTO branches (4), UC branches AC-01 organizer/vendor happy, AC-02 pending sin revert, AC-03 sin reason, EC-01..EC-03, DEV-05 concurrencia (segundo cancel ve `cancelled_at != null`), BE-006 underflow con/sin warn, path legacy sin adapter, `QuoteEventName` incluye 8 eventos. |
| QA-002 | Done | `tests/api/us062-cancel-booking-intent.integration.spec.ts` — 14 tests contra Postgres real (`describe.skipIf(!dbUp)`): AC-01 organizer bilateral, AC-01 vendor bilateral (2 notifs contraparte respectivas), AC-02 pending sin revert, AC-03 body vacío → cancellationReason null, EC-01..EC-03, EC-05 reason > 500, AUTH-TS-05, QA-005 concurrencia (2 POST ⇒ 200 + 409, committed revertido una vez, 2 notifs), QA-006 underflow (fabricar `amountCommitted < synced` documenta el clampeo defensivo), TS-05 regresión service común. Ejecución: `DATABASE_URL=... npx vitest run tests/api/us062-` — **14/14 Passed** en 1.13s. |
| QA-003 | Done | Cubierto por QA-002 IT: AUTH-TS-01 organizer bilateral 200, AUTH-TS-02 vendor bilateral 200, AUTH-TS-03/04 admin 403 (guard `organizerOrVendor` excluye admin), AUTH-TS-05 anon 401, AUTH-TS-06 organizer/vendor ajenos ⇒ 404 uniforme. |
| QA-004 | Done | `web/src/tests/unit/us062-cancel-booking-dialog.test.tsx` — 12 tests: role=dialog + aria-modal + labelledby + describedby, foco inicial en "Volver" (destructive-safe), ESC, textarea con label + counter live + aria-describedby, AC-03 submit sin reason ⇒ cancelFn recibe `reason=""`, submit con reason propagado, banner BOOKING_INTENT_NOT_CANCELLABLE/INVALID_CANCELLATION_REASON/NOT_FOUND/UNEXPECTED, jest-axe 0 violaciones estado inicial y con banner. `web/src/tests/unit/us062-cancel-booking-api.test.ts` — 9 tests MSW (200 happy con y sin reason, AC-03 reason vacío ⇒ null, 400 INVALID_CANCELLATION_REASON, 401/403/404/409/429). |
| QA-005 | Done | Cubierto por QA-002 IT (bloque QA-005 concurrencia). Guard: `SELECT FOR UPDATE` inicial en la tx serializa; 2do POST ve `cancelled_at != null` y lanza `BookingIntentNotCancellableError` (409) — sin doble revert. |
| QA-006 | Done | Cubierto por QA-002 IT (bloque QA-006 underflow). El UC US-062 emite warn `budget.committed_underflow_corrected` cuando `amountCommitted < syncedAmount`; el handler US-039 `decrementCommittedBy` clampa o el rollback preserva la fila. Documentado como defensa profunda (BR-BUDGET-004). |
| DOC-001 | Done | `docs/16 §32.8` nuevo endpoint con DTO, tabla de errores estables, D1..D8, observabilidad (2 logs adicionales + notif payload). `docs/16 §32.2` fila del endpoint cancel actualizada (US-062 + errores completos + rol bilateral + admin excluido). `docs/14 §10.9` `booking-intent` module extendido con la descripción de `CancelBookingIntentUseCase` US-062. `openapi.ts` summary US-062 + errores reales. `npm run openapi:generate` — 44 paths OK; `openapi:lint` — OpenAPI 3.0.3 válido. |

## 6. Emergent Tasks
Ninguna.

## 7. Evidence by Task

- Backend typecheck: **Passed**.
- Backend lint: **Passed** (0 issues).
- Backend UT US-062: `npx vitest run tests/unit/us062-` — **17/17 Passed**.
- Backend UT US-096 adaptado (DTO `reason` opcional): `npx vitest run tests/unit/us096-` — 15/15 Passed.
- Backend UT suite: `npx vitest run tests/unit/` — 1203/1203 Passed (129 files, 60 skipped) — cero regresión.
- Backend IT US-062 contra Postgres: `DATABASE_URL=... npx vitest run tests/api/us062-` — **14/14 Passed** en 1.13s.
- Backend suite consolidada (unit + IT US-060 + US-061 + US-062): **1245/1245 Passed** (132 files, 60 skipped).
- OpenAPI: `npm run openapi:generate` — 44 paths OK; `openapi:lint` válido.
- Frontend typecheck: **Passed**.
- Frontend UT US-062: `npx vitest run src/tests/unit/us062-` — **21/21 Passed** (12 dialog A11Y + 9 MSW API).
- Frontend UT suite: `npx vitest run` — 533/533 Passed (90 files) — cero regresión.

## 8. Deviations & Debt

- **DEV-01** — Ruta preservada `/api/v1/booking-intents/:id/cancel` (sin prefijo).
- **DEV-02** — Reuso `organizerOrVendor` middleware existente en lugar de `BilateralRoleGuard` nuevo (mismo comportamiento).
- **DEV-03** — DTO reemplazado (`cancellationReason` required → `reason` opcional max 500). Tests US-096 legacy adaptados.
- **DEV-04** — UC extendido con inyección OPCIONAL de `BookingEventNotifierPort` para preservar compat con path legacy US-096.
- **DEV-05** — `SELECT FOR UPDATE` inicial en la tx; 2do POST ⇒ 409 (cancel NO idempotente — US-062 D6).
- **DEV-06** — Underflow warn emitido desde el UC (lookup ligero en tx) antes del revert.
- **DEV-07** — Response no incluye `cancelled_by_role`/`committed_reverted` directamente; ambos viven en el payload de la notif y en el log estructurado (el frontend consume ambos de otras vías — snapshot post-cancel + queries de notif).

## 9. Final Result

- Resultado global: `DONE` — 18/18 tareas completadas.
- Backend: **1245/1245 tests verdes**; 0 errores typecheck/lint. Frontend: **533/533 tests verdes**; 0 errores typecheck.
- OpenAPI actualizada + válida (44 paths).
- Documentación `docs/16 §32.8` + `docs/14 §10.9` actualizadas.
- Sin migraciones DB nuevas (DB-001 verificó columnas existentes).
- **PB-P1-036 + EPIC-CMP-001 (Quote Comparison & Booking) CERRADO**.
