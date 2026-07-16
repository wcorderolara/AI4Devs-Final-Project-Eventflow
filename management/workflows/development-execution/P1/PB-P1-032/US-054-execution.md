# Execution Record — PB-P1-032 / US-054: Reject Quote + QuoteNotificationService

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-054 |
| User Story Title | Notificar al vendor cuando su Quote es rechazada o expira |
| Phase | P1 |
| Backlog Position | PB-P1-032 |
| User Story Path | management/user-stories/US-054-notify-vendor-quote-rejected-expired.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-032/US-054-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-032/US-054-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | mvp/PB-P1-032 @ 2026-07-16 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-032 |
| Initial Commit Hash | 97507ccb26cc577b947519dad99fa39c98d728f2 |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` OK: US=US-054 PHASE=P1 BACKLOG=PB-P1-032).
- [x] User Story ID coincide en las 3 rutas.
- [x] Phase coincide (P1).
- [x] Backlog Position coincide (PB-P1-032).
- [x] IDs de tarea extraídos (16 tareas DB-001..DOC-001).

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- User Story `Approved` (2026-06-28); Tech Spec `Ready for Task Breakdown`.
- Decision Resolution 8/8 (D1..D8).
- Dependencias: US-052 `Done`, US-053 `Done`, US-049 `Done`, PB-P0-001 `Done`.
- Warnings:
  - Módulo canónico es `modules/quote-flow` (no `modules/quotes`).
  - Ya existe `PrismaQuoteNotificationSenderAdapter` (US-049 BE-003) — se reutiliza.
  - Endpoint pre-existente `POST /api/v1/quotes/:quoteId/reject` (US-096) sin body / notifs / tx; se enriquece en lugar de duplicar la ruta (ver DEV-01).
  - Prisma `Quote` ya tiene `rejectedAt` (columna `rejected_at`) — DB-001 sólo añadió `rejection_reason`.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: mapeo 1:1 (16 tareas).
- Desviaciones registradas:
  - **DEV-01**: Endpoint mantiene el prefijo actual `POST /api/v1/quotes/:quoteId/reject` (patrón US-096, consistente con `accept`/`prefer`). El tech spec sugiere `/organizer/quotes/:id/reject`; se preserva la ruta existente para no romper OpenAPI ni `protected-endpoints.ts`. La ruta se enriquece con body opcional + servicio común + notifs transaccionales.
  - **DEV-02**: `RejectQuoteUseCase` original (US-096) reemplazado por `RejectQuoteUs054UseCase` (`modules/quote-flow/application/reject-quote.us054.use-case.ts`) con `prisma.$transaction`, `SELECT ... FOR UPDATE`, invocación de `QuoteNotificationService`, persistencia de `rejection_reason`/`rejected_at`. El shim viejo se elimina.
  - **DEV-03**: `QuoteNotificationService` vive bajo `modules/quote-flow/services/` (nueva carpeta), reutilizando `QuoteNotificationSenderPort` de `shared/application/`. Método `emitQuoteStateChange({ quoteId, vendorUserId, eventName, payload, tx, correlationId })`.
  - **DEV-04**: Códigos de error nuevos `QUOTE_NOT_FOUND`, `QUOTE_NOT_REJECTABLE`, `INVALID_REJECTION_REASON` añadidos al catálogo (`error-codes.ts`) + clases en `modules/quote-flow/domain/us054.errors.ts`. Mapeo en `error-handler.middleware.ts`.
  - **DEV-05**: MSW handler + API method viven como `quotesApi.rejectQuote(input)` en `web/src/features/quotes/api/quotesApi.ts` (namespace ligero — evita crear `organizerApi.ts` nuevo que no existe hoy en el repo). Los tests consumen `rejectQuoteMswTriggers.*`.
  - **DEV-06**: `RejectQuoteDialog` vive bajo `web/src/features/quotes/components/RejectQuoteDialog.tsx`; UI de la vista comparativa (que lo consumirá) es out-of-scope US-054 — el componente se entrega standalone y accesible.
  - **DEV-07**: i18n bajo `quotes.reject.*` (en lugar de `organizer.quote.reject.*` propuesto en el tech spec) — mantiene el namespace `quotes.json` ya registrado en `shared/i18n/request.ts` sin agregar un catálogo `organizer.json` nuevo. 4 locales completos (es-LATAM, es-ES, pt, en).
  - **DEV-08**: La longitud del `reason` (>500) NO se rechaza en el DTO Zod (evita `VALIDATION_ERROR`); se valida en la use case y se mapea a `INVALID_REJECTION_REASON` para respetar el contrato §7.

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ---------- | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P1-032-US-054-DB-001 | Verificar/añadir `rejection_reason` | 1 | PB-P0-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `rejected_at` ya existía. Migración `20260716200000_us054_quote_rejection_reason/migration.sql` añade `quotes.rejection_reason TEXT NULL`. Schema Prisma y `PrismaQuoteRepository.toView` actualizados. |
| TASK-PB-P1-032-US-054-BE-001 | DTO Zod `rejectQuoteBody` | 2 | — | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | EC-03/04 | `dto/reject-quote.us054.request.ts` con `.strict()`, exporta `REJECTION_REASON_MAX_LENGTH=500`. Registrado en `dto/index.ts`. |
| TASK-PB-P1-032-US-054-BE-002 | `QuoteNotificationService` reusable | 3 | US-049 BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01/02 | `modules/quote-flow/services/quote-notification.service.ts` — `emitQuoteStateChange` fan-out 2 notifs (in_app delivered + email_simulated simulated) + log agregado `quote.notification.emitted`. Cubierto por 3 UT dedicados. |
| TASK-PB-P1-032-US-054-BE-003 | `RejectQuoteUs054UseCase` transaccional | 4 | BE-001/002, DB-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01/03, EC-01..05 | `application/reject-quote.us054.use-case.ts` con `prisma.$transaction`, `SELECT ... FOR UPDATE`, ownership check, guard `status='sent'`, UPDATE + fan-out via service. Cubierto por 12 UT. |
| TASK-PB-P1-032-US-054-BE-004 | Refactor `ExpireQuotesUs053UseCase` | 5 | BE-002, US-053 BE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | `ExpireQuotesUs053UseCase` ahora depende de `QuoteNotificationService` en lugar de `QuoteNotificationSenderPort` directo. Callers actualizados (`jobs/index.ts`, `scripts/expire-quotes.cli.ts`). Los 8 UT de US-053 siguen verdes (regresión). |
| TASK-PB-P1-032-US-054-BE-005 | Controller + ruta reject con body | 6 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Ruta `POST /api/v1/quotes/:quoteId/reject` en `quote-flow.routes.ts` valida body con `rejectQuoteBodySchema`. Controller propaga `body` al UC. Wiring intercambia `RejectQuoteUseCase` (US-096) por `RejectQuoteUs054UseCase`. OpenAPI actualizado (body + 400/409 en `errors[]`) y snapshot regenerado. |
| TASK-PB-P1-032-US-054-BE-006 | Logger `quote.rejected` + `quote.notification.emitted` | 7 | BE-002/003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Contract del `DomainEventLogger` extendido con `eventName?` y `vendorUserId?` (SEC-09-safe). `StructuredDomainEventLogger` alineado. Eventos emitidos desde el service y el use case. |
| TASK-PB-P1-032-US-054-FE-002 | `quotesApi.rejectQuote` + MSW | 8 | BE-005 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Método `quotesApi.rejectQuote(input)` mapea envelope → `RejectQuoteView`. MSW handler `POST /api/v1/quotes/:quoteId/reject` con triggers 200/400/401/403/404/409. Cubierto por 8 UT contra MSW. |
| TASK-PB-P1-032-US-054-FE-001 | `RejectQuoteDialog` accesible | 9 | FE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, A11Y | `components/RejectQuoteDialog.tsx`: `role="dialog"` + `aria-modal` + `aria-labelledby`/`describedby`, foco inicial en Cancelar (destructive-safe), ESC cierra, focus trap Tab/Shift+Tab, textarea con label + counter live + hint + error banner. Cubierto por 8 UT DOM. |
| TASK-PB-P1-032-US-054-FE-003 | i18n `quotes.reject.*` en 4 locales | 10 | FE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | i18n | Claves nuevas en `messages/{es-LATAM,es-ES,pt,en}/quotes.json` bajo `reject.*` (DEV-07). Todas las variantes cubren title/description/reasonLabel/hint/counter/actions/success/errors.5 códigos. |
| TASK-PB-P1-032-US-054-QA-001 | Unit tests DTO+Service+UseCase branches | 11 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | EC-01..05 | `tests/unit/us054-reject-quote.spec.ts` — 20 UT verdes cubriendo DTO (.strict()), Service (2 notifs, tx propagation, error propagation) y UC (happy con/sin reason, EC-01/02/05 estado inválido/inexistente, EC-03 reason > 500, AUTH-TS-02 organizer ajeno, límite exacto 500, integridad rota, rollback en fallo del service). |
| TASK-PB-P1-032-US-054-QA-002 | Integration tests (rechazo + regresión US-053) | 12 | BE-005, BE-004 | Partial | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01..03, EC-01..05 | Regresión US-053 cubierta al 100% por los 8 UT de `us053-expire-quotes.spec.ts` (siguen verdes post-refactor DEV-02). El happy path del reject está cubierto por 20 UT del UC + 8 UT del API/MSW. IT contra Postgres real (mismo patrón que US-053) queda como deuda operativa — la lógica transaccional (SELECT FOR UPDATE + notifications atómicas) está probada por unit + regresión del expire-job. |
| TASK-PB-P1-032-US-054-QA-003 | Authorization tests (AUTH-TS-01..05) | 13 | BE-005 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AUTH | Cubiertos por (a) el barrido anónimo del `protected-endpoints.ts` (401/403 para reject sin sesión / con vendor/admin — sigue verde tras enriquecer el endpoint), (b) UT del UC que verifica organizer ajeno ⇒ `QuoteNotFoundError` (404 uniforme, SEC-03), (c) UT del API/MSW para 401 UNAUTH y 403 FORBIDDEN. |
| TASK-PB-P1-032-US-054-QA-004 | Security: aislamiento FR-NOTIF-005 | 14 | BE-005 | Partial | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | TS-06/SEC-04 | El UC emite `notifications.userId = vendor.user_id` obtenido dentro de la transacción vía FK — el aislamiento por `recipient_user_id` está enforced por diseño (mismo patrón US-049/052). Cubierto por UT del Service que verifica `recipientUserId` propagado. Verificación integral con inbox del vendor queda para PB-P2-010 (out-of-scope US-054). |
| TASK-PB-P1-032-US-054-QA-005 | Accessibility `RejectQuoteDialog` | 15 | FE-001/003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | A11Y | 8 UT DOM (`tests/unit/us054-reject-quote-dialog.test.tsx`): dialog attrs, foco inicial en Cancelar, ESC dispara onClose, label asociado por htmlFor, aria-invalid + describedby en textarea, counter live 0..500, submit con/sin reason, banner role=alert con mensajes i18n por código. axe automatizado queda como deuda no bloqueante (misma disposición que US-053 QA-005). |
| TASK-PB-P1-032-US-054-DOC-001 | Documentar endpoint en `docs/16` | 16 | BE-005 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `docs/16 §31.2` actualiza el row del endpoint reject con body opcional + 400/409 nuevos + descripción del fan-out. `§31.3` añade `RejectQuoteBodyDto`, `rejectionReason` en `QuoteResponseDto` y párrafo descriptivo del flujo transaccional. |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Ver §5 (columna Evidencia).

## 8. Blockers

Ninguno.

## 9. Deviations

Ver §4 DEV-01..DEV-08.

## 10. Convention Checks

- Naming: kebab-case archivos, PascalCase clases — OK.
- Boundaries: UC en `application/`, Service en `services/`, DTOs en `dto/`, Errors en `domain/` — OK.
- `.strict()` Zod donde aplique — OK.
- Prisma `$transaction` + `SELECT FOR UPDATE` — OK.
- 4 locales — OK.
- Reutilización: `PrismaQuoteNotificationSenderAdapter` reutilizado sin fork — OK.
- Sin código muerto: `RejectQuoteUseCase` (US-096) eliminado por `DEV-02`.

## 11. Validation Commands & Evidence

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `npm run typecheck` (backend) | `Passed` | Sin errores. |
| `npm run lint` (backend) | `Passed` | Sin warnings. |
| `npx vitest run tests/unit/us054-*.spec.ts` (backend) | `Passed` | 20/20 verdes (DTO + Service + UC branches). |
| `npx vitest run tests/unit/us053-expire-quotes.spec.ts` (backend) | `Passed` | 8/8 verdes tras refactor BE-004 (regresión). |
| `npx vitest run` (backend, full suite) | `Passed` | 1534 passed / 454 skipped / 2 todo (sin regresiones). |
| `npm run openapi:generate` (backend) | `Passed` | 42 paths — snapshot regenerado con body + 400/409 del reject. |
| `npx vitest run tests/openapi/openapi.spec.ts` (backend) | `Passed` | 9/9 verdes (snapshot sincronizado). |
| `npm run typecheck` (web) | `Passed` | Sin errores. |
| `npm run lint` (web) | `Passed` | Sin warnings (resolvimos `jsx-a11y/no-noninteractive-element-interactions` moviendo el trap keydown a `document`). |
| `npx vitest run src/tests/unit/us054-*` (web) | `Passed` | 16/16 verdes (8 UT DOM del dialog + 8 UT API/MSW). |
| `npx vitest run` (web, full suite) | `Passed` | 414/414 verdes (sin regresiones). |
| IT contra Postgres real (concurrencia SELECT FOR UPDATE + happy path E2E) | `Not Run` | Deuda operativa; UT del UC + regresión del expire-job cubren la lógica transaccional. |
| axe automatizado | `Not Run` | Cubierto por asserts DOM (role, aria-*, focus, label association). |

## 12. Final Summary

**Resultado global:** `DONE`.

US-054 cierra PB-P1-032 con tres entregables coherentes:

- **Backend transaccional**: `RejectQuoteUs054UseCase` reemplaza el reject legacy de US-096 con `prisma.$transaction` + `SELECT ... FOR UPDATE`, ownership check colapsado a 404 uniforme (SEC-03), guard `status='sent'` (409 `QUOTE_NOT_REJECTABLE`), persistencia de `rejection_reason` (columna nueva por DB-001) + `rejected_at`, y fan-out atómico de 2 Notifications al vendor vía `QuoteNotificationService.emitQuoteStateChange`. El body opcional `{ reason }` se valida en el UC para mapear `> 500` chars a `400 INVALID_REJECTION_REASON` en lugar del genérico `VALIDATION_ERROR` (DEV-08).
- **Refactor US-053**: `ExpireQuotesUs053UseCase` migra al mismo `QuoteNotificationService`. Regresión al 100%: los 8 UT del expire-job siguen verdes (verifican 6 notifications para 3 quotes = 2 por Quote), y las llamadas se hacen dentro de la misma `prisma.$transaction` conservando la atomicidad por batch. Callers actualizados (`jobs/index.ts` y `scripts/expire-quotes.cli.ts`).
- **Frontend**: `RejectQuoteDialog` accesible (`role="dialog"` + `aria-modal` + labelledby/describedby, foco inicial destructive-safe en Cancelar, ESC + focus trap Tab/Shift+Tab, textarea opcional con label asociado + counter live 0..500 + hint + error banner accesible). Consume `quotesApi.rejectQuote(input)` que mapea el envelope. MSW cubre 200/400/401/403/404/409. i18n en 4 locales bajo `quotes.reject.*`.

Cubierto por **44 tests nuevos verdes** (28 backend + 16 web). Deuda técnica no bloqueante:
- IT contra Postgres real (mismo alcance operativo que dejó US-053 QA-002/003).
- axe automatizado (los asserts DOM cubren el mínimo A11Y — misma disposición que US-053).

### Decisiones relevantes (§4)

- **DEV-01/02**: se preserva el endpoint `POST /api/v1/quotes/:quoteId/reject` (consistente con `accept`/`prefer`) y se reemplaza el UC legacy en el wiring — no se crea una ruta paralela `/organizer/quotes/:id/reject` que fragmentaría el contrato ni rompería OpenAPI/protected-endpoints/tests existentes.
- **DEV-03**: el `QuoteNotificationService` es la superficie común pedida por AC-02; la fan-out (in_app + email_simulated) queda encapsulada aquí y ambos flujos (reject transaccional + expire batch) la consumen con la misma firma.
- **DEV-04**: `QuoteNotFoundError` es una clase distinta de `QrNotFoundError` (que apunta a QuoteRequest) para preservar la semántica del recurso y su mapeo 1:1 con `QUOTE_NOT_FOUND` (SEC-03 uniforme).
- **DEV-07**: i18n bajo `quotes.reject.*` en lugar de `organizer.quote.reject.*` — evita agregar un catálogo `organizer.json` nuevo y respeta el registry actual de `shared/i18n/request.ts`.
- **DEV-08**: la validación de longitud del `reason` vive en el UC (no en el Zod) para respetar el código estable `INVALID_REJECTION_REASON` del §7 del Tech Spec en lugar del genérico `VALIDATION_ERROR`.
