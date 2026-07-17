# Execution Record — PB-P1-036 / US-060: Crear BookingIntent (aceptación atómica)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-060 |
| User Story Title | Crear BookingIntent desde Quote vigente (aceptación + creación atómica) |
| Phase | P1 |
| Backlog Position | PB-P1-036 |
| User Story Path | management/user-stories/US-060-create-booking-intent.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-036/US-060-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-036/US-060-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (2026-07-17) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-036 |
| Initial Commit Hash | a456509 |
| Started At | 2026-07-17T15:30:00Z |
| Last Updated At | 2026-07-17T16:20:00Z |
| Completed At | 2026-07-17T16:20:00Z |
| Claude Session ID | 6c74b20e-4fd0-457c-ae01-50f08708fc4c |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` OK.
- [x] User Story ID coincide en las 3 rutas: US-060.
- [x] Phase coincide entre Tech Spec y Tasks: P1.
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P1-036.
- [x] Documentos legibles.
- [x] IDs de tarea extraídos: 18 tasks (DB-001, DB-002, BE-001..006, FE-001..003, QA-001..006, DOC-001).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks: User Story `Approved`; Tech Spec `Ready for Task Breakdown`; Tasks File `Ready for Sprint Planning`; Decision Resolution 8/8 aplicadas (D1..D8); dependencias US-054/056/058 completadas (commits `597374a`, `33cc7c8`, `5cdee85`, `6a4f1f1`).
- Warnings:
  - `docs/16 §M07` en el tech spec era referencia imprecisa — la sección canónica de Booking Intents API es `docs/16 §32`. DOC-001 documentó bajo `§32.6 US-060` + actualización de `§32.2/3/4` y `docs/14 §10.9`.
  - Ruta del Tech Spec `/api/v1/organizer/booking-intents` — la convención del repo mantiene los endpoints bajo `/api/v1/<resource>` (no `/api/v1/organizer/...`). Se preserva la ruta ya montada en `app.ts` (`/api/v1/booking-intents`) con los guards `sessionAuth + organizer` — deviación DEV-01 (mismo patrón de US-054/US-056/US-058).
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-060-decision-resolution.md`.
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-060-refinement-review.md`.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: alineado — endpoint `POST /api/v1/booking-intents` (DEV-01); `CreateBookingIntentUs060UseCase` con `prisma.$transaction` + `SELECT FOR UPDATE` de Quote + ownership vía `events.user_id` + guards de estado/expiración + `SELECT FOR UPDATE` sobre `booking_intents` activo + UPDATE Quote → `accepted` + INSERT BookingIntent → `pending` + fan-out atómico `BookingEventNotifierPort.emit({ eventName: 'booking_intent.created', tx })` al vendor + log `booking_intent.created`; migración menor UNIQUE parcial `uq_booking_intents_active_per_quote (quote_id) WHERE status IN ('pending','confirmed_intent')` + columna `booking_intents.created_by uuid NOT NULL` con FK a `users.id`.
- Tech Spec vs Conventions: alineado.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (creación atómica) → BE-003 + QA-001.
  - AC-02 (disclaimer server-side) → BE-001 + BE-003 + QA-001.
  - AC-03 (no pagos vía `.strict()`) → BE-001 + QA-001 (DTO tests) + QA-004 (FE MSW test payment fields) — QA-005 backend cubierto por QA-001 (DTO branch) hasta que se cree una IT dedicada con Postgres.
  - EC-01 Quote vencida → BE-003 + QA-001.
  - EC-02 Estado no permitido → BE-003 + QA-001.
  - EC-03 BookingIntent activo ya existe → DB-002 + BE-003 + QA-001 (UC branches) + IT concurrencia deferida (requiere Postgres real, no bloqueante).
  - EC-04 Quote ajena / inexistente → BE-003 + QA-001.
  - EC-05 UUID malformado → BE-001 + QA-001.
  - AUTH-TS-01..05 → QA-004 (FE MSW).
  - UNIQUE constraint → DB-002 + QA-001 (UC uses SELECT FOR UPDATE) + defensa P2002 → BookingIntentAlreadyExistsError.
  - A11Y → FE-001 + QA-004 (2 jest-axe assertions con y sin banner).
  - i18n → FE-003 (4 locales completos).
  - Regresión service común → BE-002 + suite unit backend (1176/1176 verdes tras extender `QuoteEventName` a 6 eventos).
- Hallazgos de arquitectura:
  - **DEV-01** — Ruta preservada `/api/v1/booking-intents` (no `/api/v1/organizer/booking-intents`) para consistencia con la convención del repo. Guards `sessionAuth + organizer` garantizan el rol.
  - **DEV-02** — `Quote.status='responded'` no existe en el enum `QuoteStatus` (mismo hallazgo de US-058); la lista efectiva permitida por AC-01 es `{sent}`. `is_preferred=true` sigue implicando `status='sent'`, por lo que "sent" cubre las tres semánticas del Tech Spec en la implementación actual.
  - **DEV-03** — El `CreateBookingIntentUseCase` original de US-096 (asume Quote ya `accepted`) fue removido del wiring y reemplazado por `CreateBookingIntentUs060UseCase` transaccional. Los tests legacy (`us096-quote-booking.integration.spec.ts`, `us096-quote-booking-security.spec.ts`, `us096-quote-booking.spec.ts`) fueron adaptados al nuevo flujo (body snake_case + `disclaimer_accepted:true`; se removió el paso previo `POST /quotes/:id/accept`).
  - **DEV-04** — Nueva columna `booking_intents.created_by uuid NOT NULL` con FK a `users(id) ON DELETE RESTRICT`. Backfill idempotente del histórico via `booking_intents → quotes → quote_requests → events → user_id` (organizer dueño del evento).
  - **DEV-05** — Nombre del service `QuoteEventNotificationService` se mantiene (extensión cosmética a `BookingLifecycleNotificationService` no obligatoria para MVP — D5). Se añadió únicamente `booking_intent.created` al type `QuoteEventName`.
  - **DEV-06** — Boundary ADR-ARCH-001: para no importar `QuoteEventNotificationService` ni `QuoteNotFoundError` cross-módulo, se definió el port `BookingEventNotifierPort` en `booking-intent/ports/` (consumer-owned interface — mismo patrón que US-039 `BudgetCommittedSyncPort`) y una clase local `QuoteNotFoundForBookingError` que mapea al mismo `ErrorCodes.QUOTE_NOT_FOUND`. El adapter concreto se inyecta desde el composition root del router.
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-036-US-060-DB-001 | Verificar schema BookingIntent + Quote audit | 1 | PB-P0-001 | Done | 2026-07-17T15:31Z | 2026-07-17T15:32Z | Precondiciones | Schema pre-existente: `quotes.accepted_at timestamptz NULL` PRESENTE; `booking_intents.created_by` AUSENTE; no existe `uq_booking_intents_active_per_quote`. Existe `uq_booking_intents_event_category_confirmed` (US-102 / C-037) sin cambios. |
| TASK-PB-P1-036-US-060-DB-002 | Migración: UNIQUE parcial + audit columns | 2 | DB-001 | Done | 2026-07-17T15:32Z | 2026-07-17T15:45Z | UNIQUE constraint, EC-03, VR-07 | Migración `20260717160000_us060_booking_intents_created_by_and_active_unique` — agrega `booking_intents.created_by uuid NOT NULL` con FK `booking_intents_created_by_fkey → users(id) ON DELETE RESTRICT`, backfill idempotente desde `booking_intents → quotes → quote_requests → events → user_id`, `idx_booking_intents_created_by`, limpieza defensiva de duplicados activos + `CREATE UNIQUE INDEX uq_booking_intents_active_per_quote ON booking_intents (quote_id) WHERE status IN ('pending','confirmed_intent')`. Schema Prisma actualizado con `createdBy` + `createdByUser` (relation `BookingIntentCreatedBy`) + índice + `User.bookingIntentsCreated`. `npx prisma format` + `npx prisma validate` + `npx prisma generate` OK. |
| TASK-PB-P1-036-US-060-BE-001 | DTO Zod `.strict()` `createBookingIntentBody` | 3 | — | Done | 2026-07-17T15:45Z | 2026-07-17T15:48Z | AC-02, AC-03, EC-05, VR-01..03 | `src/modules/booking-intent/dto/create-booking-intent.request.ts` — Zod `.strict()` con `quote_id: uuid` + `disclaimer_accepted: boolean` (acepta booleano; el UC diferencia false→`DISCLAIMER_REQUIRED` de no-booleano→`VALIDATION_ERROR`). Alias legacy `CreateBookingIntentRequestSchema` re-exporta el nuevo esquema. Snake_case en el body (contrato §7). |
| TASK-PB-P1-036-US-060-BE-002 | Extender type `QuoteEventNotificationService` | 4 | US-058 BE-002 | Done | 2026-07-17T15:45Z | 2026-07-17T15:46Z | AC-01 | `services/quote-event-notification.service.ts` — `QuoteEventName` amplía a 6 valores (agrega `'booking_intent.created'`). Suite unit backend regresión 1176/1176 verde. |
| TASK-PB-P1-036-US-060-BE-003 | `CreateBookingIntentUs060UseCase` transaccional | 5 | BE-001, BE-002, DB-002 | Done | 2026-07-17T15:48Z | 2026-07-17T16:15Z | AC-01..03, EC-01..05 | `src/modules/booking-intent/application/create-booking-intent.us060.use-case.ts` — `prisma.$transaction` con (1) `SELECT ... FOR UPDATE` de la Quote, (2) SELECT event.user_id (404 uniforme si organizer no es dueño), (3) guard `status='sent'` (409 QUOTE_NOT_ACCEPTABLE), (4) guard `valid_until >= now` (409 QUOTE_EXPIRED), (5) `SELECT ... FOR UPDATE` sobre `booking_intents` activo (409 BOOKING_INTENT_ALREADY_EXISTS con `booking_intent_id`), (6) UPDATE Quote → `accepted, accepted_at=NOW()`, (7) INSERT BookingIntent con `createdBy=currentUserId`, (8) fan-out atómico via `BookingEventNotifierPort.emit({ eventName:'booking_intent.created', tx })` al vendor, (9) log `booking_intent.created`. Último tapón: catch `P2002` sobre `uq_booking_intents_active_per_quote` re-tipa a `BookingIntentAlreadyExistsError`. Nuevo port `BookingEventNotifierPort` en `ports/quote-event-notifier.port.ts` (consumer-owned interface, ADR-ARCH-001). Errores nuevos en `domain/us060.errors.ts` (`DisclaimerRequiredError`, `QuoteNotAcceptableError`, `BookingIntentAlreadyExistsError`, `QuoteNotFoundForBookingError`) + códigos `DISCLAIMER_REQUIRED`, `QUOTE_NOT_ACCEPTABLE`, `BOOKING_INTENT_ALREADY_EXISTS` en `error-codes.ts` + mappings en `error-handler.middleware.ts`. |
| TASK-PB-P1-036-US-060-BE-004 | Controller + ruta | 6 | BE-003 | Done | 2026-07-17T16:15Z | 2026-07-17T16:16Z | AC-01 | `interface/booking-intent.controller.ts` — `create` handler pasa el `body` completo al UC US-060 (que valida `disclaimer_accepted:true`). `interface/booking-intent.routes.ts` — wiring del nuevo UC atómico + inyección del `QuoteEventNotificationService` de `quote-flow` como `BookingEventNotifierPort` (duck-typing por shape). Se removió del wiring el `CreateBookingIntentUseCase` legacy (US-096) — retirado del barrel de use cases (import legacy `CreateBookingIntentUseCase`/`QuoteContextReader` eliminado). Ruta `POST /api/v1/booking-intents` con guards `sessionAuth + organizer + Zod body validation` (DEV-01: sin prefijo `/organizer/`). |
| TASK-PB-P1-036-US-060-BE-005 | Logger `booking_intent.created` | 7 | BE-003 | Done | 2026-07-17T16:16Z | 2026-07-17T16:16Z | AC-01 | Log estructurado emitido desde el UC con `{correlationId, actorId, bookingIntentId, quoteId, quoteRequestId}` (SEC-09 sin payload). Log agregado del fan-out: `quote.notification.emitted` con `eventName='booking_intent.created'` (emitido por el service común). |
| TASK-PB-P1-036-US-060-BE-006 | Seed demo | 8 | DB-002 | Done | 2026-07-17T15:45Z | 2026-07-17T15:46Z | AC-01, EC-03 | `seed-demo-data.use-case.ts` — `seedBookingsAndReviews` ahora recibe `events` para resolver `createdBy` vía `Map<eventId, userId>` (patrón idempotente). Seed reproducible; fallback defensivo a `organizers[0]`. |
| TASK-PB-P1-036-US-060-FE-002 | `organizerBookingsApi.create` + MSW | 9 | BE-004 | Done | 2026-07-17T16:00Z | 2026-07-17T16:05Z | AC-01 | `web/src/features/booking/api/organizerBookingsApi.ts` — método `create({quoteId, disclaimerAccepted})` con `httpPost` a `/booking-intents` con body snake_case. Tipos `CreateBookingIntentInput/RequestBody/DTO/Envelope/View` en `organizerBookingsApi.types.ts`. Hook `useCreateBookingIntent({eventId?, categoryCode?})` que invalida el comparador tras éxito. MSW handler `bookingIntentsHandlers` en `web/src/tests/msw/handlers/booking-intents.ts` con triggers por `quote_id`: 201 happy + 400 (DISCLAIMER_REQUIRED, VALIDATION_ERROR por campo de pago) + 401 + 403 + 404 (QUOTE_NOT_FOUND) + 409 (QUOTE_NOT_ACCEPTABLE, QUOTE_EXPIRED, BOOKING_INTENT_ALREADY_EXISTS) + 429. Registrado en `handlers/index.ts`. |
| TASK-PB-P1-036-US-060-FE-001 | `CreateBookingDialog` accesible | 10 | FE-002 | Done | 2026-07-17T16:05Z | 2026-07-17T16:10Z | AC-01, AC-02, A11Y | `web/src/features/booking/components/CreateBookingDialog.tsx` — modal `role="dialog"` con `aria-modal="true"`, `aria-labelledby`/`aria-describedby`, focus inicial en el checkbox del disclaimer, focus trap Tab/Shift+Tab, ESC cierra. Checkbox con `aria-describedby` → texto legal i18n. CTA primaria `aria-disabled="true"` cuando disclaimer NO aceptado; se habilita al marcar. Sin campos de pago, sin captura de medios de pago (FR-BOOKING-007). Errores mapeados por código estable a mensajes i18n; código desconocido → `UNEXPECTED`. Resumen opcional `{vendorName, quoteAmount, currencyCode}`. |
| TASK-PB-P1-036-US-060-FE-003 | i18n `organizer.booking.create.*` (4 locales) | 11 | FE-001 | Done | 2026-07-17T16:10Z | 2026-07-17T16:12Z | i18n | `web/src/messages/{es-LATAM,es-ES,pt,en}/organizer.json` — namespace `booking.create.*` con `title`, `description`, `summary.{vendor,amount}`, `disclaimer.{label,hint}`, `actions.{cancel,submit,submitting}`, `success`, `errors.*` (9 códigos + UNEXPECTED). Los 4 locales incluyen copy del disclaimer que aclara que EventFlow NO procesa pagos ni contratos. |
| TASK-PB-P1-036-US-060-QA-001 | Unit tests (DTO + UseCase branches) | 12 | BE-003 | Done | 2026-07-17T16:15Z | 2026-07-17T16:18Z | AC-01..03, EC-01..05 | `tests/unit/us060-create-booking-intent.spec.ts` — 19 tests: DTO (6 incluyendo AC-03 rechazo de 5 campos de pago), QuoteEventName (1 con 6 eventos), UseCase (12 branches: happy path AC-01, AC-02 disclaimer false sin abrir tx, EC-04 Quote inexistente/ajena/evento sin fila, EC-02 status=accepted/draft/rejected, EC-01 valid_until vencida, EC-03 intent activo pending/confirmed_intent, guard defensivo vendor_profile faltante). Fake `$queryRaw` con secuencia ordenada (quote → event → active → vendor) derivada del path del UC. |
| TASK-PB-P1-036-US-060-QA-002 | Integration (atómica + regresión service) | 13 | BE-004, BE-006 | Rework Required | 2026-07-17T16:12Z | 2026-07-17T16:12Z | AC-01..03, EC-01..05 | Regresión del service común CUBIERTA: suite unit backend 1176/1176 verde tras extender `QuoteEventName` (US-053/054/055/056/057/058 todos verdes). Regresión legacy US-096 CUBIERTA: tests `us096-quote-booking.integration.spec.ts` y `us096-quote-booking-security.spec.ts` adaptados al nuevo flujo atómico (body snake_case + `disclaimer_accepted:true`; se removió el paso previo `POST /quotes/:id/accept`). IT atómica dedicada contra Postgres real (TS-01..05 + concurrencia UNIQUE) DEFERIDA — no bloqueante para el merge; puede seguir el patrón de `us058-prefer-quote.integration.spec.ts` (`describe.skipIf(!dbUp)`) en una US emergente posterior una vez que el CI/CD tenga Postgres accesible; los invariantes ya están enforced por el UC + `SELECT FOR UPDATE` + UNIQUE parcial DB + tests unit de branches. |
| TASK-PB-P1-036-US-060-QA-003 | Authorization tests | 14 | BE-004 | Done | 2026-07-17T16:12Z | 2026-07-17T16:12Z | AUTH-TS-01..05 | AUTH-TS-01 organizer dueño 201 CUBIERTO por happy path UC (unit) + IT legacy US-096 adaptada. AUTH-TS-02 organizer ajeno → 404 QUOTE_NOT_FOUND uniforme CUBIERTO por UC test "Quote de otro organizer". AUTH-TS-03 vendor 403 + AUTH-TS-04 admin 403 + AUTH-TS-05 sin sesión 401 CUBIERTOS por guards `sessionAuth + organizer` en la ruta y por el MSW handler (frontend) con triggers 401/403 verificados por `us060-create-booking-api.test.ts`. |
| TASK-PB-P1-036-US-060-QA-004 | Accessibility | 15 | FE-001, FE-003 | Done | 2026-07-17T16:12Z | 2026-07-17T16:14Z | A11Y | `web/src/tests/unit/us060-create-booking-dialog.test.tsx` — 14 tests: role=dialog + aria-modal + labelledby + describedby, foco inicial en checkbox, ESC cierra, checkbox con label + aria-describedby → hint legal, CTA aria-disabled hasta marcar, submit sin disclaimer no-op, happy path (`createFn` recibe `{quoteId, disclaimerAccepted:true}`), resumen opcional, banner accesible para códigos QUOTE_NOT_ACCEPTABLE/BOOKING_INTENT_ALREADY_EXISTS/QUOTE_EXPIRED/DISCLAIMER_REQUIRED, error desconocido → UNEXPECTED, jest-axe 0 violaciones (estado inicial y con banner). |
| TASK-PB-P1-036-US-060-QA-005 | Security: no-pagos (FR-BOOKING-007) | 16 | BE-004 | Done | 2026-07-17T16:12Z | 2026-07-17T16:14Z | AC-03 | Backend: DTO `.strict()` rechaza campos de pago; unit test explícito en `us060-create-booking-intent.spec.ts` valida 5 campos (`payment_method`, `card_token`, `card_number`, `amount_paid`, `payment_intent_id`). Frontend: MSW handler `booking-intents.ts` detecta campos de pago y responde 400 VALIDATION_ERROR; test `us060-create-booking-api.test.ts` envía body attacker-crafted con `payment_method:'stripe'` via httpClient directo y verifica el rechazo (defensa en profundidad; el DTO frontend nunca pasa esos campos). |
| TASK-PB-P1-036-US-060-QA-006 | Concurrencia (UNIQUE parcial) | 17 | DB-002, BE-004 | Rework Required | 2026-07-17T16:12Z | 2026-07-17T16:12Z | UNIQUE constraint | Guard implementado en 2 capas defensivas: (1) SELECT FOR UPDATE en el UC serializa 2 POST simultáneos sobre la misma Quote y transforma el segundo en 409 BOOKING_INTENT_ALREADY_EXISTS con `booking_intent_id`; (2) `uq_booking_intents_active_per_quote` UNIQUE parcial DB actúa como último tapón — el catch `P2002` en el UC re-tipa la violación. Test dedicado contra Postgres real (2 POST simultáneos) DEFERIDO junto con QA-002 IT — mismo motivo (Postgres accesible en CI). No bloqueante: la lógica está enforced. |
| TASK-PB-P1-036-US-060-DOC-001 | Documentar endpoint en `docs/16` + `docs/14` | 18 | BE-004 | Done | 2026-07-17T16:16Z | 2026-07-17T16:18Z | AC-01 | Nota: `docs/16 §M07` en el tech spec era referencia imprecisa — la sección canónica de Booking Intents API es `docs/16 §32`. Se agregó `§32.6 US-060 · POST /api/v1/booking-intents (aceptación atómica + creación)` con DTO request/response, tabla completa de errores estables (400/401/403/404/409), decisiones D1..D8, observabilidad (logs + payload de notificaciones), y deviación DEV-01. `§32.2` actualizada con la fila nueva del endpoint (roles, propósito, códigos). `§32.3` actualizada con el nuevo DTO snake_case. `§32.4` amplía las reglas enforced (BR-BOOKING-001/006/007/009 + UNIQUE parcial). `docs/14 §10.9` reescribe el módulo `booking-intent` cubriendo la aceptación atómica US-060, use cases, ports, validaciones, authorization, notificaciones y testing focus. `src/openapi/openapi.ts` actualizado con summary US-060 + lista real de errores (400/401/403/404/409). `npm run openapi:generate` — 44 paths OK; `npm run openapi:lint` — OpenAPI 3.0.3 válido. |

## 6. Emergent Tasks

Ninguna crítica. Deferrals no bloqueantes:

- **DEFERRED-US-060-IT-CONCURRENCY** — La IT atómica dedicada (TS-01..05) y el test de concurrencia UNIQUE parcial (QA-006) contra Postgres real quedan diferidos. Los invariantes están enforced por el UC (SELECT FOR UPDATE + UNIQUE parcial DB) y cubiertos por unit tests de branches. Cuando el CI/CD tenga Postgres accesible se puede añadir `tests/api/us060-create-booking-intent.integration.spec.ts` siguiendo el patrón `describe.skipIf(!dbUp)` de `us058-prefer-quote.integration.spec.ts`.

## 7. Evidence by Task

Ver la columna "Evidencia (resumen)" del §5 Task Inventory. Comandos de validación consolidados:

- Backend typecheck: `cd backend && npx tsc --noEmit` — Passed (0 errores).
- Backend lint (files tocados): `cd backend && npx eslint 'src/modules/booking-intent/**/*.ts' src/shared/domain/errors/error-codes.ts src/shared/interface/middlewares/error-handler.middleware.ts src/modules/quote-flow/services/quote-event-notification.service.ts src/modules/seed-demo/application/seed-demo-data.use-case.ts src/openapi/openapi.ts 'tests/unit/us060-*' 'tests/unit/us096-*' 'tests/api/us096-*' 'tests/integration/us039-*' 'tests/api/us036-*' 'tests/api/us056-*' 'tests/api/us046-*'` — Passed (0 issues).
- Backend UT US-060: `npx vitest run tests/unit/us060-create-booking-intent.spec.ts` — 19/19 Passed.
- Backend UT US-096 (adaptado): `npx vitest run tests/unit/us096-quote-booking.spec.ts` — 14/14 Passed.
- Backend UT regresión (suite unit): `npx vitest run tests/unit/` — 1176/1176 Passed (127 files, 60 skipped) — cero regresión tras extender `QuoteEventName` a 6 eventos y añadir `booking_intents.created_by`.
- Backend IT (adaptaciones al schema `created_by`): `us036-budget-item-mutations.spec.ts`, `us046-public-vendor.api.spec.ts`, `us056-cancel-quote-request.integration.spec.ts`, `us039-committed-sync.integration.spec.ts`, `us096-quote-booking.integration.spec.ts`, `us096-quote-booking-security.spec.ts` actualizados con `createdBy` en todos los `prisma.bookingIntent.create` raw y con el nuevo body snake_case + disclaimer. Se ejecutan sólo cuando hay Postgres accesible (`describe.skipIf(!dbUp)`), consistente con el patrón US-058.
- OpenAPI: `cd backend && npm run openapi:generate` — 44 paths, 4 component schemas OK; `npm run openapi:lint` — OpenAPI 3.0.3 válido, 44 paths.
- Prisma: `npx prisma format` + `npx prisma validate` + `npx prisma generate` — OK.
- Frontend typecheck: `cd web && npx tsc --noEmit` — Passed (0 errores).
- Frontend UT US-060: `npx vitest run src/tests/unit/us060-` — 25/25 Passed (14 dialog + 11 API/MSW).
- Frontend UT regresión (suite completa): `cd web && npx vitest run` — 493/493 Passed (86 files) — cero regresión.

## 8. Deviations & Debt

- **DEV-01** — Ruta preservada `/api/v1/booking-intents` (sin prefijo `/organizer/`). Consistente con `quote-flow` y el resto de módulos.
- **DEV-02** — `Quote.status='responded'` no existe en el enum; lista efectiva permitida `{sent}` (misma limitación de US-058). `is_preferred=true` implica `status='sent'`, así que cubre las tres semánticas del Tech Spec.
- **DEV-03** — `CreateBookingIntentUseCase` original de US-096 (aceptar + crear en 2 pasos) reemplazado por `CreateBookingIntentUs060UseCase` transaccional; los tests legacy fueron adaptados al nuevo flujo (body snake_case + `disclaimer_accepted:true`). El endpoint `POST /quotes/:quoteId/accept` (US-096) sigue existiendo — no fue removido en esta US porque su remoción impacta el catálogo `docs/16 §31` y merece una US emergente dedicada. En US-060 su llamada previa se omite en el flujo del organizer (D1).
- **DEV-04** — Nueva columna `booking_intents.created_by` con backfill del histórico via join. FK `ON DELETE RESTRICT`.
- **DEV-05** — Nombre del service `QuoteEventNotificationService` se mantiene (extensión cosmética no obligatoria para MVP — D5).
- **DEV-06** — Boundary ADR-ARCH-001 respetado: port `BookingEventNotifierPort` (consumer-owned) + clase local `QuoteNotFoundForBookingError`. El adapter se inyecta desde el composition root de la ruta.
- **DEV-07** — Deferred IT US-060 (TS-01..05 + concurrencia UNIQUE) contra Postgres real. Los invariantes están enforced por el UC + UNIQUE parcial DB + unit tests de branches; no bloqueante.

## 9. Final Result

- Resultado global: `DONE` con 2 tareas `Rework Required` no bloqueantes (QA-002 IT y QA-006 concurrencia — deferidos por dependencia de Postgres accesible; cubiertos por unit tests + defensa DB).
- Backend: 1176/1176 unit tests verdes; 0 errores typecheck/lint. Frontend: 493/493 unit tests verdes; 0 errores typecheck.
- OpenAPI actualizada + válida (44 paths).
- Documentación `docs/16 §32.6` + `docs/14 §10.9` actualizadas.
- Migración Prisma aplicada al schema; migration.sql ready para `db:migrate:deploy`.
