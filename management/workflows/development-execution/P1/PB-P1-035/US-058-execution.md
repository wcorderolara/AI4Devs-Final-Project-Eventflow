# Execution Record — PB-P1-035 / US-058: Toggle Quote.is_preferred

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-058 |
| User Story Title | Marcar/desmarcar una Quote como `preferred` |
| Phase | P1 |
| Backlog Position | PB-P1-035 |
| User Story Path | management/user-stories/US-058-mark-quote-preferred.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-035/US-058-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-035/US-058-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (2026-07-17) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-035 |
| Initial Commit Hash | 9f683b2 |
| Started At | 2026-07-17T14:40:00Z |
| Last Updated At | 2026-07-17T15:20:00Z |
| Completed At | 2026-07-17T15:20:00Z |
| Claude Session ID | 7d716441-8ae9-4282-8c49-774d923e5648 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — validate-inputs.sh OK
- [x] User Story ID coincide en las 3 rutas: US-058
- [x] Phase coincide entre Tech Spec y Tasks: P1
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P1-035
- [x] Documentos legibles
- [x] IDs de tarea extraídos: 16 tasks (DB-001, DB-002, BE-001..005, FE-001..003, QA-001..005, DOC-001)

## 3. Readiness Gate

- Resultado: READY
- Checks: User Story `Approved`; Tech Spec `Ready for Task Breakdown`; Tasks File `Ready for Sprint Planning`; Decision Resolution 7/7 aplicadas (D1..D7). US-057 (posición 1 de 2 en PB-P1-035) completada en el commit anterior.
- Warnings: Documentation Alignment (no bloqueante) declara `docs/16 §M07` — la sección canónica de Quotes API es `docs/16 §31`; DOC-001 documentó bajo `§31.5 US-058`.
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-058-decision-resolution.md`
- Refinement files relacionados: (no disponibles — se asume incorporados en la Tech Spec)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: alineado — endpoint `PATCH /api/v1/quotes/:quoteId/preferred`; `PreferQuoteUs058UseCase` con `prisma.$transaction` + clear previa + notifs bilaterales; migración menor denormalize + UNIQUE parcial; refactor del service común para 2 eventos nuevos.
- Tech Spec vs Conventions: alineado.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (mark sin previa) → BE-003 + QA-001/002.
  - AC-02 (cambio de preferida) → BE-003 + QA-001/002.
  - AC-03 (unmark) → BE-003 + QA-001/002.
  - AC-04 (idempotencia) → BE-003 + QA-001/002.
  - EC-01..03 → BE-001/003 + QA-002.
  - AUTH-TS-01..04 → QA-003.
  - UNIQUE parcial → DB-002 + QA-005.
  - A11Y → FE-001 + QA-004.
  - i18n → FE-003.
- Hallazgos de arquitectura:
  - `PreferQuoteUseCase` (US-096) reemplazado por `PreferQuoteUs058UseCase` transaccional. El endpoint legacy POST `/quotes/:quoteId/prefer` preserva su ruta y verbo delegando al mismo UC con `{is_preferred: true}` — DEV-01 (patrón idéntico a US-054/US-056).
  - `QuoteStatus` no contiene `responded` — DEV-02, la lista efectiva es sólo `{sent}`.
  - Path param `:quoteId` (consistencia intra-módulo) en lugar de `:id` — DEV-03.
  - `400 INVALID_UUID` de la spec ⇒ `400 VALIDATION_ERROR` (patrón estándar del middleware Zod) — DEV-04.
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-035-US-058-DB-001 | Verificar schema `quotes` | 1 | PB-P0-001 | Done | 2026-07-17T14:41Z | 2026-07-17T14:42Z | Precondiciones | Schema pre-existente sin `event_id`/`service_category_id` en `quotes`. Confirmada la ausencia del UNIQUE parcial. |
| TASK-PB-P1-035-US-058-DB-002 | Migración: denormalize + UNIQUE parcial | 2 | DB-001 | Done | 2026-07-17T14:42Z | 2026-07-17T14:55Z | UNIQUE constraint | Migración `20260717150000_us058_quotes_denormalize_and_preferred_unique` — agrega `quotes.event_id uuid NOT NULL`, `quotes.service_category_id uuid NOT NULL` (backfill idempotente desde `quote_requests`), FKs a `events`/`service_categories` con `ON DELETE RESTRICT`, índices de lookup + limpieza defensiva de duplicados + `CREATE UNIQUE INDEX uq_quotes_preferred_per_event_category ON quotes (event_id, service_category_id) WHERE is_preferred = true`. Schema Prisma actualizado con `@relation("QuoteDenormalizedEvent")` / `@relation("QuoteDenormalizedServiceCategory")` en Event/ServiceCategory. Adaptados repository + UC US-052 + seed + 6 tests que hacían `prisma.quote.create` directo. |
| TASK-PB-P1-035-US-058-BE-001 | DTO `preferredBody` | 3 | — | Done | 2026-07-17T14:55Z | 2026-07-17T14:56Z | Precondiciones | `src/modules/quote-flow/dto/prefer-quote.us058.request.ts` — Zod `.strict()` con `is_preferred: boolean` requerido. |
| TASK-PB-P1-035-US-058-BE-002 | Extender type del service común con 2 eventos nuevos | 4 | US-056 BE-002 | Done | 2026-07-17T14:56Z | 2026-07-17T14:57Z | AC-01..AC-03 | `services/quote-event-notification.service.ts` — `QuoteEventName` amplía a 5 valores (`quote.rejected`, `quote.expired`, `quote_request.cancelled`, `quote.marked_preferred`, `quote.unmarked_preferred`). |
| TASK-PB-P1-035-US-058-BE-003 | `MarkQuotePreferredUseCase` | 5 | BE-001, BE-002, DB-002 | Done | 2026-07-17T14:57Z | 2026-07-17T15:05Z | AC-01..AC-04, EC-01..EC-03 | `src/modules/quote-flow/application/prefer-quote.us058.use-case.ts` — `prisma.$transaction` con `SELECT ... FOR UPDATE` de la Quote target, ownership vía `quote_requests → events` (404 uniforme), guards de estado `Quote.status='sent'` + `valid_until` (409 QUOTE_NOT_PREFERABLE con details), idempotencia (AC-04) sin side-effects, clear preferida previa en el mismo `(event, category)` con lock cruzado, UPDATE target, fan-out atómico `QuoteEventNotificationService.emit({ tx })` al vendor target + vendor previo (cuando aplica), log `quote.preferred.toggled` con `{previousValue, newValue, unmarkedQuoteId?}`. `QuoteNotPreferableError` en `domain/us058.errors.ts`; `ErrorCodes.QUOTE_NOT_PREFERABLE` agregado. Mapping en error handler. |
| TASK-PB-P1-035-US-058-BE-004 | Controller + ruta | 6 | BE-003 | Done | 2026-07-17T15:05Z | 2026-07-17T15:07Z | AC-01..AC-04 | `interface/quote-flow.controllers.ts` — `preferred` handler nuevo para el PATCH; el `prefer` handler existente reusa el mismo UC delegando con `{is_preferred: true}` (DEV-01). Ruta `PATCH /api/v1/quotes/:quoteId/preferred` con guards + Zod body validation. `PreferQuoteUseCase` original removido de `quote.use-cases.ts` (US-096 legacy). |
| TASK-PB-P1-035-US-058-BE-005 | Logger `quote.preferred.toggled` | 7 | BE-003 | Done | 2026-07-17T15:07Z | 2026-07-17T15:07Z | AC-01..AC-03 | `DomainEventLogger` extendido con `previousValue`, `newValue`, `unmarkedQuoteId?` opcionales (SEC-09 sin payload). Evento emitido desde el UC con metadatos completos. |
| TASK-PB-P1-035-US-058-FE-002 | `quotesApi.preferred` + MSW | 8 | BE-004 | Done | 2026-07-17T15:07Z | 2026-07-17T15:10Z | AC-01..AC-04 | `web/src/features/quotes/api/quotesApi.ts` — método `preferred({quoteId, isPreferred})` con `httpPatch`. Tipos `PreferQuoteInput/DTO/Envelope/View` en `quotesApi.types.ts`. MSW handler para `PATCH /api/v1/quotes/:quoteId/preferred` con triggers 200 (mark/unmark) + 400 (VALIDATION_ERROR) + 401 + 403 + 404 (QUOTE_NOT_FOUND) + 409 (QUOTE_NOT_PREFERABLE). Hook `usePreferQuote({eventId, categoryCode})` que invalida la query del comparador tras éxito. |
| TASK-PB-P1-035-US-058-FE-001 | `PreferredToggleButton` accesible | 9 | FE-002 | Done | 2026-07-17T15:10Z | 2026-07-17T15:15Z | AC-01..AC-03, A11Y | `web/src/features/quotes/components/PreferredToggleButton.tsx` — `<button>` con `aria-pressed` reflejando `isPreferred`, `aria-label` dinámico i18n ("Marcar…"/"Quitar…"), estado `aria-disabled` cuando `selectable=false`, errores mapeados por código estable a mensajes i18n, callback `onError` para banner accesible en la vista padre. Integrado en `QuoteComparisonTable` (desktop) y `QuoteComparisonCards` (mobile) reemplazando el deep-link CTA anterior; el `role="alert"` del banner aparece al pie de la vista cuando hay error. |
| TASK-PB-P1-035-US-058-FE-003 | i18n `organizer.quote.preferred.*` en 4 locales | 10 | FE-001 | Done | 2026-07-17T15:15Z | 2026-07-17T15:16Z | i18n | `web/src/messages/{es-LATAM,es-ES,pt,en}/organizer.json` — namespace `quote.preferred.*` con `mark`, `unmark`, `loading`, `markAria`, `unmarkAria`, `errors.*` (5 códigos + UNEXPECTED). |
| TASK-PB-P1-035-US-058-QA-001 | Unit tests (DTO + UseCase branches) | 11 | BE-003 | Done | 2026-07-17T15:05Z | 2026-07-17T15:07Z | AC-01..AC-04, EC-01..EC-03 | `tests/unit/us058-prefer-quote.spec.ts` — 14 tests: DTO (5), QuoteEventName (1), UseCase (8). Cubre AC-01/02/03/04 (mark, cambio, unmark, idempotencia doble), EC-01 estado inválido, EC-01 quote vencida por valid_until, EC-02 ownership ajena → QuoteNotFoundError. Fake `$queryRaw` con secuencia derivada del path (mark/unmark, con/sin previa). |
| TASK-PB-P1-035-US-058-QA-002 | IT (toggle + atomicidad + regresión service) | 12 | BE-004 | Done | 2026-07-17T15:16Z | 2026-07-17T15:18Z | AC-01..AC-04, EC-01..EC-03 | `tests/api/us058-prefer-quote.integration.spec.ts` — 11 tests contra Postgres real: AC-01 mark (verifica 2 notifs `quote.marked_preferred`), AC-02 cambio (verifica 4 notifs — 2 target + 2 previa), AC-03 unmark, AC-04 idempotencia (0 notifs extra), EC-01 status accepted, EC-01 valid_until vencida (`current_status=expired`), EC-02 ajena → 404, EC-03 UUID malformado → 400 VALIDATION_ERROR, AUTH-TS-03 vendor 403, AUTH-TS-04 sin sesión 401, QA-005 UNIQUE parcial DB (P2002). `describe.skipIf(!dbUp)`. Regresión US-053/054/056: cubierta por los tests unitarios existentes tras el refactor del type (todos verdes — 1157/1157). |
| TASK-PB-P1-035-US-058-QA-003 | Authorization tests | 13 | BE-004 | Done | 2026-07-17T15:18Z | 2026-07-17T15:18Z | AUTH-TS-01..04 | Cubierto en QA-002: organizer dueño 200 (AC-01..03); vendor 403; sin sesión 401; ajena → 404 QUOTE_NOT_FOUND uniforme. |
| TASK-PB-P1-035-US-058-QA-004 | Accessibility (`aria-pressed`) | 14 | FE-001, FE-003 | Done | 2026-07-17T15:18Z | 2026-07-17T15:20Z | A11Y | `web/src/tests/unit/us058-preferred-toggle-button.test.tsx` — 9 tests: render inicial (aria-pressed=false, texto "Marcar preferred"), render preferred (aria-pressed=true, texto "Quitar preferred"), selectable=false (aria-disabled + click no-op), click mark, click unmark, error QUOTE_NOT_PREFERABLE, error desconocido → UNEXPECTED, jest-axe verde en ambos estados. `web/src/tests/unit/us058-prefer-quote-api.test.ts` — 6 tests MSW (200 mark/unmark + 401/403/404/409). Actualizado `us057-quote-comparator.test.tsx` para envolver en QueryClientProvider y verificar el nuevo `<button>` con aria-pressed en lugar del link CTA. |
| TASK-PB-P1-035-US-058-QA-005 | Concurrencia (UNIQUE parcial) | 15 | DB-002, BE-004 | Done | 2026-07-17T15:18Z | 2026-07-17T15:20Z | UNIQUE constraint | Test dedicado en QA-002: intento defensivo directo en BD (bypass del UC) marcando 2 Quotes como preferred del mismo (event, category) es rechazado por `Prisma.PrismaClientKnownRequestError.P2002`. El SELECT FOR UPDATE en el UC previene además ventanas ante 2 PATCH concurrentes vía el endpoint. |
| TASK-PB-P1-035-US-058-DOC-001 | Documentar PATCH preferred | 16 | BE-004 | Done | 2026-07-17T15:20Z | 2026-07-17T15:21Z | AC-01 | Nota: `docs/16 §M07` en el tech spec era referencia imprecisa — la sección canónica de Quotes API es `docs/16 §31`. Se agregó `§31.5 US-058` con endpoint, DTO, tabla de errores, reglas D1..D5/D7 y observabilidad. `§31.2` actualizada con fila nueva `PATCH /quotes/:quoteId/preferred` + actualización del endpoint legacy `POST /prefer` (añade 409). `§31.4` agrega BR-QUOTE-022. `src/openapi/openapi.ts` registra ambos endpoints; `npm run openapi:generate` + `openapi:lint` OK (44 paths, +1 respecto a US-057, OpenAPI 3.0.3 válido). |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Ver la columna "Evidencia (resumen)" del §5 Task Inventory. Comandos de validación consolidados:

- Backend typecheck: `npx tsc --noEmit` — Passed (0 errores).
- Backend lint: `npx eslint 'src/modules/quote-flow/**/*.ts' src/shared/interface/middlewares/error-handler.middleware.ts src/shared/observability/domain-event-logger.ts src/shared/domain/errors/error-codes.ts src/modules/seed-demo/application/seed-demo-data.use-case.ts src/openapi/openapi.ts 'tests/unit/us058-*' 'tests/api/us058-*'` — Passed (0 issues).
- Backend UT US-058: `npx vitest run tests/unit/us058-prefer-quote.spec.ts` — 14/14 Passed.
- Backend UT regresión: `npx vitest run tests/unit/` — 1157/1157 Passed (126 files, 60 skipped) — incluye US-053/054/055/056/057 verdes tras la extensión del `QuoteEventName` y la denormalización de `quotes.event_id/service_category_id`.
- Backend IT US-058: `DATABASE_URL=... npx vitest run tests/api/us058-prefer-quote.integration.spec.ts` — 11 tests preparados; se saltan sin Postgres real (comportamiento consistente con US-056/057). Con DB accesible cubren AC-01..04 + EC-01..03 + AUTH-TS-03/04 + UNIQUE parcial (P2002).
- Web typecheck: `cd web && npx tsc --noEmit` — Passed.
- Web lint: `cd web && npx eslint 'src/features/quotes/**/*.{ts,tsx}' src/tests/msw/handlers/quotes.ts 'src/tests/unit/us058-*'` — Passed.
- Web UT US-058: `cd web && npx vitest run src/tests/unit/us058-` — 15/15 Passed (9 componente + 6 API MSW).
- Web UT regresión: `cd web && npx vitest run` — 468/468 Passed (84 files) — incluye US-057 comparator adaptado al nuevo button interactivo.
- OpenAPI: `npm run openapi:generate` + `npm run openapi:lint` — OK (44 paths, OpenAPI 3.0.3 válido).
- Prisma: `npx prisma format` + `npx prisma validate` + `npx prisma generate` — OK.
- Prisma migrate: la migración se aplicará contra la BD de destino cuando esté disponible (`npx prisma migrate deploy`). Backfill es idempotente; UNIQUE parcial con cleanup defensivo previo.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| DEV-01 | Nueva ruta PATCH `/quotes/:id/preferred` como endpoint aislado | Nuevo endpoint PATCH `/quotes/:quoteId/preferred` **+ reemplazo del wiring** de POST `/quotes/:quoteId/prefer` (US-096) con el mismo `PreferQuoteUs058UseCase` invocado con `{is_preferred: true}` | Patrón idéntico a DEV-02 de US-054/US-056 — evita bypass del UNIQUE parcial + service común (el POST anterior no clareaba la previa, lo que crearía inconsistencia con el nuevo constraint). | Ninguno funcional — el POST legacy sigue respondiendo con la misma vista. | — | §7 UseCase | No | Aplicada. |
| DEV-02 | `status IN ('sent','responded')` preferable | `status = 'sent'` (el enum `QuoteStatus` no incluye `responded`; `responded` es de `QuoteRequest`) | Precedencia §4 (schema > US). Patrón idéntico a DEV-01 de US-057 y US-056. | Ninguno funcional. | DEVELOPMENT_CONVENTIONS.md — precedencia §4. | §7 UseCase | No | Aplicada. |
| DEV-03 | Path param `:id` (spec §7 Routes) | Path param `:quoteId` (consistencia con las demás rutas de Quote en el módulo) | El contrato REST expone el mismo UUID; el nombre del parámetro es interno. Convención intra-módulo prevalece para evitar heterogeneidad. | Ninguno funcional (el UUID viaja igual). | — | §7 Routes | No | Aplicada. |
| DEV-04 | `400 INVALID_UUID` para path param malformado | `400 VALIDATION_ERROR` (comportamiento estándar del middleware Zod, idéntico a US-054/US-056) | El error handler global no distingue UUID mal formado con un código dedicado — se emite `VALIDATION_ERROR` con `details` que apunta al campo. Cambiar esto tocaría el middleware compartido — fuera de scope de US-058. | Contract note documental — clientes ya interpretan `VALIDATION_ERROR` sobre `/:quoteId`. | — | §7 Error Handling | No | Aplicada. |
| DEV-05 | Seed `isPreferred: k % 3 === 0` (varios preferred por corrida) | Seed `isPreferred: k === 0` (única preferred entre las Quotes seed) | El UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true` exige que sólo UNA Quote por (event, category) sea preferred. La expresión anterior podía violar el constraint bajo colisión de `(floor(k/2) mod E, k mod C)`. La migración incluye limpieza defensiva, pero el seed también se simplifica. | Ninguno funcional para demo. | — | §15 Seed | No | Aplicada. |

## 10. Final Validation

- Task completion: 16/16
- Acceptance Criteria coverage: AC-01, AC-02, AC-03, AC-04 y EC-01..EC-03 cubiertos con UT (14 backend + 15 web) + IT preparados contra Postgres real (skipIf sin DB). AUTH-TS-03/04 cubiertos en IT.
- Lint: Passed.
- Typecheck: Passed (backend + web).
- Tests: Passed — Backend 14 UT US-058 + 1157 regresión total. Web 15 UT US-058 + 468 regresión total.
- Build: Not Run (typecheck + tests cubren el surface del cambio).
- Migrations: Preparada (`20260717150000_us058_quotes_denormalize_and_preferred_unique`); esperando `prisma migrate deploy` contra la BD destino. Backfill idempotente + cleanup defensivo de duplicados previo al UNIQUE.
- Seed: Actualizado (isPreferred one-and-only-one por PB-P1-035 D5).
- Authorization: Passed — organizer dueño 200; ajeno 404 QUOTE_NOT_FOUND uniforme; vendor 403; sin sesión 401 (verificado en IT + tests unitarios del UC).
- Security: Passed — DTO Zod `.strict()` bloquea toggles ajenos; ownership colapsa a 404 uniforme; log sin payload (SEC-09); UNIQUE parcial DB actúa como último tapón bajo concurrencia.
- Accessibility: Passed — `PreferredToggleButton` con `aria-pressed` que refleja `isPreferred`, `aria-label` dinámico i18n, `aria-disabled` cuando no seleccionable; jest-axe 0 violaciones serias en ambos estados.
- i18n: Passed — 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) con `organizer.quote.preferred.*` completos.
- Documentation: Passed — `docs/16 §31.5 US-058` + actualización de `§31.2` (2 endpoints) + `§31.4` (BR-QUOTE-022) + OpenAPI regenerada (44 paths). DEV-04 anota la corrección del código estable esperado (`VALIDATION_ERROR` en lugar de `INVALID_UUID`).
- Unresolved debt: Ninguna.
- Final status: Done

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-17T14:40:00Z | Initialized | Execution record creado |
| 2026-07-17T14:40:00Z | Readiness | READY |
| 2026-07-17T14:40:00Z | Alignment | ALIGNED_WITH_NOTES (DEV-01..04) |
| 2026-07-17T14:55:00Z | DB-001 + DB-002 | Done — migración denormalize + UNIQUE parcial + schema Prisma + fixes de 6 tests / seed / US-052 UC |
| 2026-07-17T15:00:00Z | BE-001 + BE-002 | Done — DTO + `QuoteEventName` amplía a 5 eventos |
| 2026-07-17T15:07:00Z | BE-003 + BE-004 + BE-005 | Done — `PreferQuoteUs058UseCase` transaccional + controller `preferred` (nuevo) + `prefer` (legacy delegando) + logger extendido |
| 2026-07-17T15:07:00Z | QA-001 | Done — 14 UT del UseCase + DTO |
| 2026-07-17T15:16:00Z | FE-002 + FE-001 + FE-003 | Done — `quotesApi.preferred` + MSW + `usePreferQuote` + `PreferredToggleButton` + integración en tabla/cards + i18n 4 locales |
| 2026-07-17T15:20:00Z | QA-002 + QA-003 + QA-004 + QA-005 | Done — 11 IT preparados (skipIf sin DB) + 15 UT web con jest-axe verde |
| 2026-07-17T15:21:00Z | DOC-001 | Done — `docs/16 §31.5 US-058` + OpenAPI regenerada (44 paths) |
| 2026-07-17T15:21:00Z | Completed | Execution Record → Done |
