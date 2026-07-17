# Execution Record — PB-P1-036 / US-061: Confirmar BookingIntent + UPDATE committed

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-061 |
| User Story Title | Confirmar BookingIntent + UPDATE committed (vendor) |
| Phase | P1 |
| Backlog Position | PB-P1-036 |
| User Story Path | management/user-stories/US-061-vendor-confirm-booking-intent.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-036/US-061-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-036/US-061-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (2026-07-17) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-036 |
| Initial Commit Hash | ec89be5 |
| Started At | 2026-07-17T17:00:00Z |
| Last Updated At | 2026-07-17T18:00:00Z |
| Completed At | 2026-07-17T18:00:00Z |
| Claude Session ID | 6c74b20e-4fd0-457c-ae01-50f08708fc4c |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` OK (US=US-061, PHASE=P1, BACKLOG=PB-P1-036).
- [x] User Story `Approved`.
- [x] IDs de tarea extraídos: 16 tasks (DB-001, BE-001..005, FE-001..003, QA-001..006, DOC-001).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Dependencias US-060 (create), US-039 (sync BudgetItem.committed), US-035..038 (Budget CRUD) — todas ya en `Done` en el índice global. Commit base: `ec89be5` (cierre US-060).
- Warnings:
  - Ruta canónica del Tech Spec `/api/v1/vendor/booking-intents/:id/confirm` — el repo mantiene endpoints bajo `/api/v1/booking-intents/:id/confirm` (DEV-01 idéntico a US-060). Se preserva la ruta ya montada con guard `vendor` role.
  - `docs/16 §M07` referencia imprecisa — sección canónica de Booking Intents API es `docs/16 §32`. DOC-001 documentó bajo `§32.7 US-061`.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Hallazgos de arquitectura:
  - **DEV-01** — Ruta preservada `/api/v1/booking-intents/:id/confirm` (sin prefijo `/vendor/`).
  - **DEV-02** — Currency mismatch: US-039 handler LANZA `BookingSyncCurrencyMismatchError` cuando `quote.currency ≠ event.currency` (defensa profunda). El Tech Spec US-061 §7 pide log warn + continue, pero preservamos la semántica de US-039 (throw). Documentado; el test QA-006 IT valida que el intent queda en `pending` (rollback).
  - **DEV-03** — El `ConfirmBookingIntentUseCase` original (US-096 + US-039) NO emitía notifs al organizer. US-061 lo extendió inyectando un `BookingEventNotifierPort` OPCIONAL — si está presente, después del `applyOnConfirm` exitoso emite `booking_intent.confirmed` con payload completo dentro de la MISMA tx. Preserva compat con tests unitarios legacy US-096 (sin adapter).
  - **DEV-04** — El log warn `budget.committed_exceeds_planned` se emite desde el UC de confirm (no desde US-039 handler que no tiene acceso a `Budget.totalPlanned`). Lookup ligero al final de la tx: `Budget.findFirst({items:{amountCommitted}})` + suma agregada + comparación decimal.
  - **DEV-05** — Reemplazo de excepciones genéricas (`NotFoundError`/`BusinessRuleViolationError`) por errores tipados de dominio (`BookingIntentNotFoundError`/`BookingIntentNotConfirmableError`) que mapean 1:1 al contrato §7. Sin cambios en el status code de las respuestas legacy (los tests unit se actualizaron para consumir los nuevos errores).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-036-US-061-DB-001 | Verificar índice + UNIQUE en budget_items | 1 | PB-P0-001 | Done | 2026-07-17T17:00Z | 2026-07-17T17:02Z | Precondiciones | Schema físico verificado con `docker exec ef-eventflow psql -c "\d budget_items"`: existe `budget_items_budget_id_idx`; sin UNIQUE compuesto `(budget_id, category_code)` — el handler US-039 (`lockBudgetForSync` advisory lock + `SELECT FOR UPDATE`) cubre la serialización sin requerir UNIQUE DB. No se crea migración. |
| TASK-PB-P1-036-US-061-BE-001 | Extender QuoteEventNotificationService con booking_intent.confirmed | 2 | US-060 BE-002 | Done | 2026-07-17T17:02Z | 2026-07-17T17:03Z | AC-01 | `services/quote-event-notification.service.ts` — `QuoteEventName` amplía a 7 valores (agrega `'booking_intent.confirmed'`). `ports/quote-event-notifier.port.ts` — `BookingIntentEventName` acota los nombres consumidos por el módulo booking-intent (`'booking_intent.created'` \| `'booking_intent.confirmed'`); alias legacy `EmitBookingIntentCreatedInput` preservado para US-060. |
| TASK-PB-P1-036-US-061-BE-002 | ConfirmBookingIntent UseCase con notifs + warn | 3 | BE-001, DB-001 | Done | 2026-07-17T17:03Z | 2026-07-17T17:20Z | AC-01..03, EC-01..04 | `application/booking-intent.use-cases.ts` — `ConfirmBookingIntentUseCase` extendido: (a) errores tipados `BookingIntentNotFoundError`/`BookingIntentNotConfirmableError` en lugar de genéricos, (b) idempotencia explícita `isAlreadyConfirmed(status)` con early return sin abrir tx, (c) helper `applyOrganizerNotification(tx)` que emite `event='booking_intent.confirmed'` al organizer con payload completo (booking_intent_id, quote_id, quote_request_id, event_id, vendor_profile_id, total_price, currency_code) dentro de la MISMA tx, (d) helper `emitBudgetExceedsPlannedWarnIfApplicable(tx)` que reúne `Budget.totalPlanned` + `sum(items.amountCommitted)` y emite warn cuando `total_committed > total_planned`. Nuevo helper `isAlreadyConfirmed` en `domain/booking-policies.ts`. Errores nuevos en `domain/us061.errors.ts` + códigos `BOOKING_INTENT_NOT_FOUND`, `BOOKING_INTENT_NOT_CONFIRMABLE` en `error-codes.ts` + mappings en `error-handler.middleware.ts`. |
| TASK-PB-P1-036-US-061-BE-003 | Controller + ruta | 4 | BE-002 | Done | 2026-07-17T17:20Z | 2026-07-17T17:21Z | AC-01 | `interface/booking-intent.routes.ts` — wiring `confirm: new ConfirmBookingIntentUseCase(..., { budgetSync, transactionRunner, bookingEvents: quoteEvents })`. Ruta `POST /api/v1/booking-intents/:bookingIntentId/confirm` preservada (DEV-01 sin prefijo /vendor/), con guards `sessionAuth + vendor` role. Path param `bookingIntentId` validado por Zod UUID. |
| TASK-PB-P1-036-US-061-BE-004 | Logger 3 eventos | 5 | BE-002 | Done | 2026-07-17T17:20Z | 2026-07-17T17:21Z | AC-01..03 | Logs emitidos desde el UC + helpers: `booking_intent.confirmed` (info; `{correlationId, actorId, bookingIntentId}`), `budget.committed_exceeds_planned` (warn; `{correlationId, budgetId, bookingIntentId, eventId, totalCommitted, totalPlanned}`), y logs cross-domain de US-039 (`budget.committed.synced`, `budget.item.auto_created_by_booking`, `budget.committed.currency_mismatch`) que participan del mismo path. `DomainEventLogger` type extendido con `budgetId`, `totalCommitted`, `totalPlanned` opcionales. |
| TASK-PB-P1-036-US-061-BE-005 | Response mapper | 6 | BE-002 | Done | 2026-07-17T17:21Z | 2026-07-17T17:21Z | AC-01 | `dto/booking-intent.response.ts` — `toBookingIntentResponse(view)` existente cubre el shape completo devuelto por el UC. Sin campos internos filtrados; mismo shape que el response de US-060 create (consistencia intra-módulo). |
| TASK-PB-P1-036-US-061-FE-002 | vendorBookingsApi.confirm + MSW | 7 | BE-003 | Done | 2026-07-17T17:30Z | 2026-07-17T17:35Z | AC-01 | `web/src/features/booking/api/vendorBookingsApi.ts` — método `confirm({bookingIntentId})` con `httpPost` (body vacío). Tipos `ConfirmBookingIntentInput/DTO/Envelope/View` + `ConfirmBookingIntentErrorCode` en `vendorBookingsApi.types.ts`. Hook `useConfirmBookingIntent()` invalida `bookingsKeys.intents()` tras éxito. MSW handler para `POST /api/v1/booking-intents/:id/confirm` con triggers en el path param: 200 happy + 200 idempotente + 401 + 403 + 404 + 409 + 429. Barrel `features/booking/index.ts` re-exporta el módulo vendor. |
| TASK-PB-P1-036-US-061-FE-001 | ConfirmBookingDialog accesible | 8 | FE-002 | Done | 2026-07-17T17:35Z | 2026-07-17T17:40Z | AC-01, A11Y | `web/src/features/booking/components/ConfirmBookingDialog.tsx` — modal `role="dialog"` con `aria-modal="true"`, `aria-labelledby`/`aria-describedby`, foco inicial en el botón "Cancelar" (destructive-safe), focus trap Tab/Shift+Tab, ESC cierra. Texto disclaimer FR-BOOKING-006 (bloque con `role="note"` implícito vía styling) enlazado en `aria-describedby`. Sin CTA controlada por checkbox (US-061 D8: no requiere disclaimer server-side; el disclaimer se enforced una vez en US-060 create). Resumen opcional `{eventTitle, quoteAmount, currencyCode}`. Banner de error accesible por código estable. |
| TASK-PB-P1-036-US-061-FE-003 | i18n vendor.booking.confirm.* 4 locales | 9 | FE-001 | Done | 2026-07-17T17:40Z | 2026-07-17T17:42Z | i18n | `web/src/messages/{es-LATAM,es-ES,pt,en}/vendor.json` — namespace `booking.confirm.*` con `title`, `description`, `summary.{event,amount}`, `disclaimer`, `actions.{cancel,submit,submitting}`, `success`, `errors.*` (6 códigos + UNEXPECTED). Copy del disclaimer aclara que EventFlow NO procesa pagos ni contratos. |
| TASK-PB-P1-036-US-061-QA-001 | Unit tests UC branches | 10 | BE-002 | Done | 2026-07-17T17:20Z | 2026-07-17T17:25Z | AC-01..03, EC-01..04 | `tests/unit/us061-confirm-booking-intent.spec.ts` — 9 tests: AC-01 happy path (confirm + apply + emit + log), AC-03 idempotencia (sin abrir tx), EC-01 status=cancelled ⇒ BookingIntentNotConfirmableError con `currentStatus`, EC-02 vendor ajeno ⇒ BookingIntentNotFoundError uniforme, EC-03 intent inexistente ⇒ BookingIntentNotFoundError, BE-004 warn con `committed > planned`, BE-004 no warn cuando `committed ≤ planned`, path legacy US-096 (sin adapter) preserva compat, tipo `QuoteEventName` incluye 7 eventos. Fakes livianos con tx mock que expone `event.findUnique`, `quote.findUnique`, `budget.findFirst`. Actualización de `tests/unit/us096-quote-booking.spec.ts` para incluir `isAlreadyConfirmed` policy. |
| TASK-PB-P1-036-US-061-QA-002 | Integration cross-domain + regresión | 11 | BE-003 | Done | 2026-07-17T17:45Z | 2026-07-17T17:55Z | AC-01..03, EC-01..04 | `tests/api/us061-confirm-booking-intent.integration.spec.ts` — 12 tests contra Postgres real (`describe.skipIf(!dbUp)`): AC-01 confirm con BudgetItem preexistente (verifica UPDATE committed = preseed + quote.amount + 2 notifs organizer), AC-02 auto-create BudgetItem (verifica planned=0 + committed=quote.amount), AC-03 idempotencia (segundo POST no re-suma ni re-emite), EC-01 status=cancelled ⇒ 409 BOOKING_INTENT_NOT_CONFIRMABLE con `current_status`, EC-02 vendor ajeno ⇒ 404 uniforme, EC-03 inexistente ⇒ 404 / UUID malformado ⇒ 400, AUTH-TS-03 organizer 403 / AUTH-TS-05 anon 401, QA-005 concurrencia (2 POST simultáneos ⇒ committed sumado exactamente una vez, 2 notifs totales), QA-006 currency guard (fabricar `quote.currency='USD'` distinto de `event.currency='GTQ'` ⇒ el sync bloquea y el intent queda `pending`), TS-05 regresión service común (`booking_intent.created` de US-060 sigue emitiendo 2 notifs tras extender a 7 eventos). Ejecución: `DATABASE_URL=... npx vitest run tests/api/us061-*` — **12/12 Passed** en 1.06s. |
| TASK-PB-P1-036-US-061-QA-003 | Authorization tests | 12 | BE-003 | Done | 2026-07-17T17:55Z | 2026-07-17T17:55Z | AUTH-TS-01..05 | Cubierto por QA-002 IT: vendor target 200 (AC-01..03); vendor ajeno → 404 uniforme; organizer → 403; sin sesión → 401. Frontend MSW test (`us061-confirm-booking-api.test.ts`) valida 401/403/404 desde el cliente. |
| TASK-PB-P1-036-US-061-QA-004 | Accessibility | 13 | FE-001, FE-003 | Done | 2026-07-17T17:40Z | 2026-07-17T17:44Z | A11Y | `web/src/tests/unit/us061-confirm-booking-dialog.test.tsx` — 12 tests: role=dialog + aria-modal + labelledby + describedby, foco inicial en "Cancelar" (destructive-safe), ESC cierra, disclaimer con aria-describedby y contenido "EventFlow no procesa pagos", happy path (`confirmFn` recibe `{bookingIntentId}`), resumen opcional, banner accesible para BOOKING_INTENT_NOT_FOUND/BOOKING_INTENT_NOT_CONFIRMABLE/FORBIDDEN, error desconocido → UNEXPECTED, jest-axe 0 violaciones (estado inicial y con banner). `web/src/tests/unit/us061-confirm-booking-api.test.ts` — 7 tests MSW (200 happy + 200 idempotente + 401/403/404/409/429). |
| TASK-PB-P1-036-US-061-QA-005 | Concurrencia (2 confirms simultáneos) | 14 | BE-003 | Done | 2026-07-17T17:55Z | 2026-07-17T17:55Z | AC-03 | Cubierto por QA-002 IT (bloque QA-005 concurrencia). Guard multicapa: (1) `isAlreadyConfirmed(status)` en el UC serializa el segundo POST cuando el primero ya cerró la tx; (2) `committed_synced_at !== null` en US-039 handler bloquea el increment duplicado si dos txs concurrentes ambas pasan el guard del UC. El test verifica que `sum(committed)` sube exactamente una vez y hay exactamente 2 notifs organizer. |
| TASK-PB-P1-036-US-061-QA-006 | Currency mismatch warn | 15 | BE-003 | Done | 2026-07-17T17:55Z | 2026-07-17T17:55Z | EC-04 | Cubierto por QA-002 IT (bloque QA-006). DEV-02: la semántica adoptada es THROW en lugar de warn+continue (heredada de US-039 `BookingSyncCurrencyMismatchError`), más segura como defensa profunda (BR-QUOTE-019 hace el mismatch imposible en producción). El test fuerza `quote.currency='USD'` distinta de `event.currency='GTQ'` y verifica que el intent queda `pending` (rollback total). |
| TASK-PB-P1-036-US-061-DOC-001 | Documentar endpoint | 16 | BE-003 | Done | 2026-07-17T17:58Z | 2026-07-17T18:00Z | AC-01 | `docs/16 §32.2` fila del endpoint confirm actualizada (US-061 + errores completos). Nueva sección `docs/16 §32.7 US-061 · POST /api/v1/booking-intents/:id/confirm` con DTO, tabla de errores estables (400/401/403/404/409), decisiones D1..D8, observabilidad (3 logs adicionales + warn `budget.committed_exceeds_planned`), payload de Notifications persistidas. `docs/14 §10.9` `booking-intent` module reescribe la sección `Main use cases` para incluir la extensión US-061. `src/openapi/openapi.ts` actualizado con summary US-061 + errores reales (400/401/403/404/409). `npm run openapi:generate` — 44 paths OK; `npm run openapi:lint` — OpenAPI 3.0.3 válido. |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Comandos de validación consolidados:

- Backend typecheck: `cd backend && npx tsc --noEmit` — Passed (0 errores).
- Backend lint (files tocados): `npx eslint 'src/modules/booking-intent/**/*.ts' 'src/modules/quote-flow/services/**/*.ts' src/shared/domain/errors/error-codes.ts src/shared/interface/middlewares/error-handler.middleware.ts src/shared/observability/domain-event-logger.ts src/openapi/openapi.ts 'tests/unit/us061-*' 'tests/api/us061-*' 'tests/unit/us096-*'` — Passed (0 issues).
- Backend UT US-061: `npx vitest run tests/unit/us061-` — 9/9 Passed.
- Backend UT US-096 (adaptado con `isAlreadyConfirmed`): `npx vitest run tests/unit/us096-` — 15/15 Passed.
- Backend UT regresión: `npx vitest run tests/unit/` — 1186/1186 Passed (128 files, 60 skipped) — cero regresión.
- Backend IT US-061 (contra Postgres real): `DATABASE_URL=... npx vitest run tests/api/us061-` — **12/12 Passed** en 1.06s.
- Backend suite consolidada (unit + IT US-060 + IT US-061): `DATABASE_URL=... npx vitest run tests/unit/ tests/api/us060- tests/api/us061-` — **1214/1214 Passed** (130 files, 60 skipped).
- OpenAPI: `npm run openapi:generate` — 44 paths OK; `npm run openapi:lint` — OpenAPI 3.0.3 válido.
- Frontend typecheck: `cd web && npx tsc --noEmit` — Passed (0 errores).
- Frontend UT US-061: `npx vitest run src/tests/unit/us061-` — 19/19 Passed (12 dialog A11Y + 7 API/MSW).
- Frontend UT regresión: `cd web && npx vitest run` — 512/512 Passed (88 files) — cero regresión.

## 8. Deviations & Debt

- **DEV-01** — Ruta preservada `/api/v1/booking-intents/:id/confirm` (sin prefijo `/vendor/`). Consistente con `quote-flow` y el resto de módulos.
- **DEV-02** — Currency mismatch: `THROW` en lugar de `warn + continue` — semántica de defensa profunda heredada de US-039. Imposible en producción por BR-QUOTE-019.
- **DEV-03** — `ConfirmBookingIntentUseCase` extendido con inyección OPCIONAL de `BookingEventNotifierPort` para preservar compat con tests unit US-096. Sin adapter ⇒ path legacy sin notifs.
- **DEV-04** — Warn `budget.committed_exceeds_planned` emitido desde el UC (no desde el handler US-039), reusando la tx con un lookup ligero de `Budget.items`.
- **DEV-05** — Reemplazo de excepciones genéricas por errores tipados de dominio (`BookingIntentNotFoundError`/`BookingIntentNotConfirmableError`) — mapean 1:1 al contrato §7.

## 9. Final Result

- Resultado global: `DONE` — 16/16 tareas completadas.
- Backend: **1214/1214 tests verdes** (1186 unit + 16 IT US-060 + 12 IT US-061); 0 errores typecheck/lint. Frontend: **512/512 tests verdes**; 0 errores typecheck.
- OpenAPI actualizada + válida (44 paths).
- Documentación `docs/16 §32.7` + `docs/14 §10.9` actualizadas.
- Sin migraciones DB nuevas (DB-001 verificó que `budget_items_budget_id_idx` cubre el path).
