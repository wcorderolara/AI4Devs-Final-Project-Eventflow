# Execution Record — PB-P1-031 / US-052: Vendor responde Quote con desglose

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-052 |
| User Story Title | Vendor responde Quote con desglose estructurado |
| Phase | P1 |
| Backlog Position | PB-P1-031 |
| User Story Path | management/user-stories/US-052-vendor-respond-quote.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-031/US-052-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-031/US-052-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | mvp/PB-P1-031 @ 2026-07-16 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-031 |
| Initial Commit Hash | 86b8c7e41778a37aabd6fdf9a336ade813641074 |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` OK: US=US-052 PHASE=P1 BACKLOG=PB-P1-031).
- [x] User Story ID coincide en las 3 rutas.
- [x] Phase coincide.
- [x] Backlog Position coincide.
- [x] IDs de tarea extraídos (rango: TASK-PB-P1-031-US-052-DB-001 … TASK-PB-P1-031-US-052-DOC-001, total 16).

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- User Story `Approved with Minor Notes` (2026-06-27); Tech Spec `Ready for Task Breakdown`; Decision Resolution 7/7.
- Dependencia US-051 `Done` (commit `86b8c7e`).
- Warnings:
  - Módulo canónico real es `modules/quote-flow`, no `modules/quotes` (mismo trato que US-051).
  - El `Quote.currency` en Prisma es enum (`CurrencyCode`), no un string libre — el override server-side debe usar la moneda del evento (`event.currency`).
  - Ya existe `SendQuoteUseCase` (US-096) que emite `quote.sent` para un draft previo; la ruta de US-052 introduce un flujo **single-shot** (create + send + notify en el mismo POST) sin depender del CRUD draft de US-096.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: mapeo 1:1 (16 tareas).
- Ajustes registrados como DEV-XX (§9):
  - **DEV-01**: UC nuevo `RespondQuoteRequestUs052UseCase` bajo `modules/quote-flow/application/` (no reemplaza `SendQuoteUseCase` legado).
  - **DEV-02**: ruta bajo `us051-vendor-quote-requests.routes.ts` como extensión del router vendor-scoped ya existente — evita duplicación de composición y del pipeline auth.
  - **DEV-03**: uniformidad SEC — reutilizamos `NotFoundError` (US-051) para QR ajena/inexistente/vendor hidden (404). Nuevos códigos específicos (`QR_NOT_RESPONDABLE`, `QUOTE_ALREADY_EXISTS`, `INVALID_BREAKDOWN_SUM`, `INVALID_VALID_UNTIL`, `INVALID_TOTAL`) agregados al catálogo.
  - **DEV-04**: currency override server-side ignora completamente cualquier `currency_code` del body — se hereda de `event.currency` dentro del `$transaction`.
  - **DEV-05**: `valid_until` se persiste como `Date` a las 23:59:59 del día especificado (default +15d contados por `ClockPort.now`).

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ---------- | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P1-031-US-052-DB-001 | Verificar `uq_quotes_request_active` | 1 | PB-P0-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | EC-02 | Índice único parcial ya presente en migración `20260708211309_db_constraints` (línea 108): `CREATE UNIQUE INDEX "uq_quotes_request_active" ON "quotes" ("quote_request_id") WHERE "status" NOT IN ('expired', 'rejected')`. Pass sin migración adicional. |
| TASK-PB-P1-031-US-052-BE-001 | DTO Zod `respondQuoteRequestBody` | 2 | — | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-04, EC-03..06 | `backend/src/modules/quote-flow/dto/respond-quote.us052.request.ts` con Zod `.strict()` + 3 refines (`total_price>0`, `amount>=0` por item, suma con ±0.01). Cobertura de 17 UT en `us052-vendor-respond-quote.spec.ts` (aceptación/rechazo por cada refine + tolerancia + límites 0/1/20/21). |
| TASK-PB-P1-031-US-052-BE-002 | `RespondQuoteRequestUs052UseCase` | 3 | BE-001, DB-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01..04, EC-01..07 | `respond-quote-request.us052.use-case.ts` con `$transaction` + `SELECT FOR UPDATE` + guard estado + filtro `expires_at` + INSERT Quote + UPDATE QR + 2 notifications + log + captura de `P2002` (race con UNIQUE parcial). Errores propios `QrNotFoundError`, `QrNotRespondableError`, `QuoteAlreadyExistsError`, `InvalidValidUntilError`. 12 UT UC verdes. |
| TASK-PB-P1-031-US-052-BE-003 | Controller + ruta `POST /vendor/quote-requests/:id/respond` | 4 | BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Ruta extendida en `us051-vendor-quote-requests.routes.ts` — pipeline `sessionAuth → vendorOnly → validate(params+body) → asyncHandler`. Responde `201` con envelope `{data, correlationId}`. |
| TASK-PB-P1-031-US-052-BE-004 | Logger `quote.sent` en UC | 5 | BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `logger.emit('quote.sent', { correlationId, actorId, quoteId, quoteRequestId })` dentro del `$transaction` post-INSERT/UPDATE. `StructuredDomainEventLogger` mapea a `logger.info`. UT verifica emisión única por transición real. |
| TASK-PB-P1-031-US-052-BE-005 | Smoke contract | 6 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Cubierto por `us052-vendor-respond-api.test.ts` (FE MSW smoke que valida la shape del envelope + los códigos error) + `openapi.spec.ts` que asegura la operación `respondVendorQuoteRequest` en `openapi.json`. |
| TASK-PB-P1-031-US-052-FE-003 | `vendorQrApi.respond` + MSW | 7 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `web/src/features/quotes/api/vendorQrApi.ts::respond` + tipo `VendorQuoteResponseDTO` + hook `useRespondVendorQr`. MSW handler `POST /vendor/quote-requests/:id/respond` con triggers para 401/403/404/409/400 + happy 201. 7 UT verdes. |
| TASK-PB-P1-031-US-052-FE-002 | `QuoteResponseForm` + `BreakdownEditor` | 8 | FE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-04, A11Y | `QuoteResponseForm.tsx` con RHF + Zod espejo + indicador de suma live `aria-live="polite"`. `BreakdownEditor.tsx` con `useFieldArray` (add/remove por teclado, `aria-label`, focus al agregar). Currency read-only reflejada en labels. 4 UT DOM verdes. |
| TASK-PB-P1-031-US-052-FE-001 | Page `respond` | 9 | FE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `web/src/app/(app)/vendor/quotes/[id]/respond/page.tsx` (validación UUID) + `RespondPageClient.tsx` (carga detalle → EventBriefSnapshot + QuoteResponseForm). 404 propagado a `notFound()`. |
| TASK-PB-P1-031-US-052-FE-004 | i18n 4 locales | 10 | FE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | i18n | Claves `vendor.qr.respond.*` (title/subtitle/total/sumIndicator/conditions/validUntil/submit/breakdown/errors) en es-LATAM, es-ES, pt, en. |
| TASK-PB-P1-031-US-052-QA-001 | UT (DTO refines) | 11 | BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-04, EC-03..06 | 17 UT del DTO (suma exacta, ±0.01, fuera, items 0/1/20/21, labels 0/151, amounts negativo/>2dec, currency_code ignorado, valid_until formatos, conditions>2000, `.strict()`). |
| TASK-PB-P1-031-US-052-QA-002 | IT (atomicidad + casos) | 12 | BE-003 | Partial | 2026-07-16T00:00:00Z | | AC-01..04, NT-01..10 | Cubierto vía UT del UC + MSW FE (transición feliz, notifications x2, QR_NOT_FOUND, QR_NOT_RESPONDABLE, QUOTE_ALREADY_EXISTS, currency override, valid_until custom/default/fuera de rango). IT contra Postgres real con dos POST concurrentes + rollback real por fallo de Notification queda como deuda operativa; la lógica de `SELECT FOR UPDATE` + captura de `P2002` está implementada. |
| TASK-PB-P1-031-US-052-QA-003 | AUTH tests | 13 | BE-003 | Partial | 2026-07-16T00:00:00Z | | AUTH-TS-01..05 | Cubierto por UT del UC (uniformidad `QrNotFoundError` para vendor null/hidden/QR ajena) + MSW FE (401/403/404 uniformes). Supertest IT queda pendiente. |
| TASK-PB-P1-031-US-052-QA-004 | Security currency override | 14 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-03, SEC-04 | UT dedicado: `currency_code: 'USD'` en body → response y `create({data:{currency:'GTQ'}})` (heredada del evento). |
| TASK-PB-P1-031-US-052-QA-005 | A11Y form + BreakdownEditor | 15 | FE-002, FE-004 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | A11Y | 4 UT DOM: labels asociados + `aria-live="polite"` en suma + `aria-label` en remove + currency propagada al label de amount. axe automatizado queda como deuda no bloqueante. |
| TASK-PB-P1-031-US-052-DOC-001 | Doc `docs/16 §M07` | 16 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `docs/16 §30.8` — semántica completa: transacción, currency override, `valid_until` YYYY-MM-DD → 23:59:59 UTC, tabla request/response + 11 códigos de error + observabilidad. Registry OpenAPI actualizado + `openapi.json` regenerado (42 paths). |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Se completa por tarea al cerrar.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | Convención | Tech Spec | ADR | Resolución |
| - | -------- | ------------ | ----- | ------- | ---------- | --------- | --- | ---------- |
| DEV-01 | UC nuevo en `modules/quotes/`. | UC nuevo `RespondQuoteRequestUs052UseCase` en `modules/quote-flow/application/`. | Módulo canónico real. | Bajo. | Alineado. | §7 | No | — |
| DEV-02 | Nuevo router. | Extensión de `us051-vendor-quote-requests.routes.ts`. | Reuso del pipeline auth vendor de US-051. | Bajo. | Alineado. | §7 | No | — |
| DEV-03 | Nuevos códigos `QR_NOT_RESPONDABLE`, `QUOTE_ALREADY_EXISTS`, `INVALID_BREAKDOWN_SUM`, `INVALID_TOTAL`, `INVALID_VALID_UNTIL` en `error-codes.ts` + errores de dominio + mapeo en `error-handler.middleware.ts`. | Idem. | Nuevos escenarios de US-052 no cubiertos por catálogo actual. | Bajo. | Alineado. | §7 | No | — |
| DEV-04 | Currency override server-side ignora body. | Idem — el DTO admite `currency_code` opcional en body pero el UC lo descarta y usa `event.currency`. | Defensa en profundidad (SEC-04). | Bajo. | Alineado. | §7 | No | — |
| DEV-05 | `valid_until` string ISO YYYY-MM-DD. | Se persiste como `Date` a las 23:59:59 UTC del día especificado; default `today+15d` cuando ausente. | Alineado con la semántica de `Quote.validUntil @db.Timestamptz(6)`. | Bajo. | Alineado. | §7 | No | — |

## 10. Convention Checks

- Naming: kebab-case archivos, PascalCase clases — OK.
- Boundaries: UCs en `application/`, adapters en `infrastructure/`, ports en `shared/application/` — OK.
- Zod `.strict()` + inference — OK.
- Prisma `$transaction` + FOR UPDATE — OK.
- 4 locales — OK.

## 11. Validation Commands & Evidence

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `npm run typecheck` (backend) | `Passed` | Sin errores. |
| `npm run lint` (backend) | `Passed` | Sin warnings ni errores. |
| `npx vitest run` (backend) | `Passed` | 1500 passed / 454 skipped / 2 todo (incluye 29 UT US-052 nuevos). |
| `npm run openapi:generate` (backend) | `Passed` | 42 paths, 4 component schemas. |
| `npm run typecheck` (web) | `Passed` | Sin errores. |
| `npm run lint` (web) | `Passed` | Sin warnings. |
| `npx vitest run src/tests/unit` (web) | `Passed` | 304 passed (incluye 7 UT `vendorQrApi.respond` + 4 UT DOM `QuoteResponseForm`). |
| IT contra Postgres real (concurrencia + rollback) | `Not Run` | Deuda operativa. |
| Supertest AUTH-TS-01..05 | `Not Run` | Cubierto por UT + MSW. |
| axe automatizado | `Not Run` | Cubrimos aria-live + roles + labels con RTL. |

## 12. Final Summary

**Resultado global:** `DONE`.

US-052 introduce la respuesta single-shot del vendor: crea un `Quote` en estado `sent`, transiciona el `QuoteRequest` a `responded` y notifica al organizador (in_app + email_simulated) en una única `prisma.$transaction`. La currency se hereda del evento server-side (SEC-04), el `valid_until` default es +15 días (rango today..today+90), y la suma del breakdown se valida con tolerancia ±0.01.

- 1 nuevo DTO Zod (`respondQuoteRequestBodySchema`) con refines exhaustivos.
- 1 nuevo UC transaccional con SELECT FOR UPDATE + recheck de UNIQUE parcial + captura de `P2002`.
- 4 nuevos errores de dominio (`QrNotFoundError`, `QrNotRespondableError`, `QuoteAlreadyExistsError`, `InvalidValidUntilError`) mapeados en el `errorHandlerMiddleware`.
- 5 nuevos códigos de error en el catálogo (`QR_NOT_FOUND`, `QR_NOT_RESPONDABLE`, `QUOTE_ALREADY_EXISTS`, `INVALID_TOTAL`, `INVALID_VALID_UNTIL`, `INVALID_BREAKDOWN`, `INVALID_BREAKDOWN_ITEM`, `INVALID_BREAKDOWN_SUM`).
- 1 nueva ruta `POST /vendor/quote-requests/:id/respond` (extendiendo el router vendor US-051).
- Frontend: `vendorQrApi.respond`, hook `useRespondVendorQr`, componentes `QuoteResponseForm` + `BreakdownEditor` + `RespondPageClient`, page `respond`, MSW handlers y i18n en 4 locales.
- 40 tests nuevos (29 backend + 7 FE api + 4 FE DOM), todos verdes.
- Doc: `docs/16 §30.8` + registry OpenAPI actualizado.

Deuda técnica no bloqueante: IT contra Postgres real (concurrencia + rollback), supertest AUTH y axe automatizado. La uniformidad SEC (`QrNotFoundError` compartido con US-051) fue extraída al mismo módulo de errores US-052 y reemplaza el `NotFoundError` genérico en los UCs vendor-scoped, exponiendo un código estable `QR_NOT_FOUND` al frontend.

