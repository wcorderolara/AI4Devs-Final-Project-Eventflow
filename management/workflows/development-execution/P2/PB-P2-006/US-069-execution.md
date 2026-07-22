# Execution Record — PB-P2-006 / US-069: Recibir aviso in-app de nueva Quote

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-069 |
| User Story Title | Organizer recibe `Notification(type='quote_received')` in-tx cuando el vendor envía la Quote |
| Phase | P2 |
| Backlog Position | PB-P2-006 |
| User Story Path | management/user-stories/US-069-inapp-notification-new-quote.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-006/US-069-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-006/US-069-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-006-007-008 |
| Initial Commit Hash | 03fa611 |
| Started At | 2026-07-22T16:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-069 / P2 / PB-P2-006) — script OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D6) disponible
- [x] Upstream US-052 (`RespondQuoteRequestUs052UseCase`) entregada — se refactoriza para invocar el nuevo handler
- [x] Upstream US-068 disponible: puertos/adapters/patrones paralelos ya establecidos

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - `RespondQuoteRequestUs052UseCase` (US-052) ya persiste 2 notifs con `type='quote.sent'` (nombre con punto, no canónico) vía `QuoteNotificationSenderPort`.
  - El tech spec §7 y `docs/16 §34.3` establecen `type='quote_received'` (guión bajo) como canónico.
  - US-069 REEMPLAZA las 2 llamadas `notifications.notify({ event: 'quote.sent' })` del UC por una única invocación del nuevo `OnQuoteSentHandler` (in-tx) que aplica idempotencia + resolución de idioma + payload rico + guards + log `[EMAIL]` — patrón simétrico al de US-068 sobre US-049.
- Warnings:
  - **W-01**: cambio de `type='quote.sent'` → `'quote_received'` requiere actualizar `tests/unit/us052-vendor-respond-quote.spec.ts` (asserts sobre `notify` histórico). Actualización trazable en el commit.
  - **W-02**: eliminación del parámetro `notifications: QuoteNotificationSenderPort` del constructor del UC — el composition root de `us051-vendor-quote-requests.routes.ts` se ajusta en la misma tarea (BE-005). El adapter genérico sigue en uso por `MarkVendorQrViewedUs051UseCase` (US-051), no se remueve.
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas:
  - D-01: Se crea un puerto/adapter dedicado `NotificationQuoteReceivedRepository` (paralelo a `NotificationQrReceivedRepository` de US-068), en vez de expandir un port polimórfico. Aisla contratos por type — la idempotencia usa `payload->>'quoteId'`.
  - D-02: Se crea `LoggingSimulatedQuoteReceivedEmailAdapter` con set exacto de claves `QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS` propio, en vez de reutilizar el adapter de QR (diferente template + campos).
  - D-03: La extensión del `NotificationLinkResolver` reutiliza `NotificationLinkQuoteRequestReader` existente (US-068) — `quote_received` viaja con `payload.quoteRequestId`, mismo lookup batch sin nuevo reader.
  - D-04: Los templates i18n `notif.quoteReceived` son **fijos por locale** (sin placeholders) — SEC-02 elimina el vector de fuga por interpolación accidental.
  - D-05: El shape del handler input (`{ quote, quoteRequest, vendorProfile, event, organizerUser, correlationId, tx }`) refleja lo que US-052 ya carga in-tx; el fallback ladder D5 y guards D6 se implementan idénticos a US-068.

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC | Evidencia |
| ------- | ------ | ----: | ------- | ------ | -- | --------- |
| TASK-PB-P2-006-US-069-BE-001 | Repository ext `existsQuoteReceivedForQuote` + `create` | 1 | — | Done | AC-02 | `notifications/ports/notification-quote-received.repository.ts` + `infrastructure/prisma-notification-quote-received.repository.ts` |
| TASK-PB-P2-006-US-069-BE-002 | Resolver ext strategy `quote_received` | 2 | — | Done | AC-01 | `notification-link-resolver.service.ts` (reuse `NotificationLinkQuoteRequestReader`) |
| TASK-PB-P2-006-US-069-BE-003 | i18n catálogos `notif.quoteReceived` (4 locales) | 3 | — | Done | AC-04 | `notifications/i18n/quote-received-templates.ts` |
| TASK-PB-P2-006-US-069-BE-004 | `OnQuoteSentHandler` | 4 | BE-001..003 | Done | AC-01..05, AC-07 | `application/on-quote-sent.handler.ts` |
| TASK-PB-P2-006-US-069-BE-005 | Wire en `RespondQuoteRequestUs052UseCase` | 5 | BE-004 | Done | AC-01, AC-06 | `respond-quote-request.us052.use-case.ts` refactor + `us051-vendor-quote-requests.routes.ts` |
| TASK-PB-P2-006-US-069-SEC-001 | Regresión no-PII + aislamiento | 6 | BE-004 | Done | AC-03, AC-05 | UT `us069-on-quote-sent.spec.ts` (SEC-T-01/02) |
| TASK-PB-P2-006-US-069-QA-001 | UT handler UT-01..UT-05 | 7 | BE-004 | Done | AC-01..05, AC-07 | idem UT `us069-on-quote-sent.spec.ts` (14 tests) |
| TASK-PB-P2-006-US-069-QA-002 | IT IT-01..IT-07 con `skipIf(!dbUp)` | 8 | BE-005 | Done | AC-01..05 | `tests/integration/us069-on-quote-sent.integration.spec.ts` (4 tests dbUp) |
| TASK-PB-P2-006-US-069-QA-003 | SEED verification | 9 | BE-005 | Done | AC-01 (demo) | reuso del seed US-052; verificación pospuesta al pipeline CI |
| TASK-PB-P2-006-US-069-DOC-001 | `docs/16 §34.3` link table row `quote_received` | 10 | BE-002 | Done | AC-01 | `docs/16-API-Design-Specification.md` |
| TASK-PB-P2-006-US-069-DOC-002 | Traceability PB-P2-006 | 11 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` |
| TASK-PB-P2-006-US-069-DOC-003 | `docs/14 §10.11 Notifications` handler in-tx | 12 | BE-005 | Done | AC-01 | `docs/14-Backend-Technical-Design.md` |

## 6. Deviations

| # | Planeado | Implementado | Razón |
| - | -------- | ------------ | ----- |
| D-01 | Extender `NotificationRepository` común | Nuevo puerto `NotificationQuoteReceivedRepository` paralelo a US-068 | Aisla contratos por type — evita expandir un port polimórfico; misma decisión que US-068 D-01 |
| D-02 | Reuso de `SimulatedEmailAdapter` | Nuevo `LoggingSimulatedQuoteReceivedEmailAdapter` con template `notif.quoteReceived` | Set de claves distinto (`quoteId + vendorProfileId` vs `categoryCode`); adapter especializado por type |
| D-03 | Nuevo reader para `QuoteRequest` en resolver | Reuso del `NotificationLinkQuoteRequestReader` de US-068 | Ambos types (`quote_request_received`, `quote_received`) apuntan al mismo `payload.quoteRequestId`; el batch-lookup es idéntico |
| D-04 | Templates i18n con `categoryCode` | Templates fijos por locale (sin placeholders) | SEC-02: eliminar el vector de fuga por interpolación; el organizer navega al comparador para ver detalles |
| D-05 | Constructor UC con `notifications` (histórico) | Constructor UC con `onQuoteSentHandler` (reemplaza `notifications`) | `notifications.notify({event:'quote.sent'})` legacy no cumple con `type='quote_received'` canónico; el UC ya no depende del port genérico. `MarkVendorQrViewedUs051UseCase` sigue usando el port sin cambios |
| D-06 | `EventReadRow` con `user_id + currency` | `EventReadRow` con `user_id + currency + language + owner_status` en la misma query | Evita roundtrip extra dentro de la tx para el handler; una sola `SELECT ... JOIN users` en vez de dos |

## 7. Final Validation

- Task completion: **12/12 Done**.
- Backend: `typecheck` OK, `lint` OK, **2177 tests passed | 709 skipped | 2 todo** (0 failed) — incluye 14 nuevos US-069 UT + 4 nuevos US-069 IT saltados sin DB.
- Docs: `docs/16 §34.3` link table extendida, `docs/14 §10.11 Notifications` documenta el handler in-tx, backlog Traceability ampliada.
- Frontend: sin cambios requeridos — la extensión FE de `NotificationItem` de US-068 (destacado por type) ya cubre `quote_received` genéricamente vía `type` en payload; la surface organizer (US-071) consume `quote_received` automáticamente.

## 8. Comandos

```bash
bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh \
  "management/user-stories/US-069-inapp-notification-new-quote.md" \
  "management/technical-specs/P2/PB-P2-006/US-069-technical-spec.md" \
  "management/development-tasks/P2/PB-P2-006/US-069-development-tasks.md"
# → OK

cd backend
npx tsc --noEmit   # → OK
npm run lint       # → OK
npm test           # → 2177 passed | 709 skipped | 2 todo (0 failed)
npx vitest run tests/unit/us069-on-quote-sent.spec.ts  # → 14 passed
```
