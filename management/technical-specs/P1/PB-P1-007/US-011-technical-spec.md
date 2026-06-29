# Technical Specification — US-011: Cancelar mi evento

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-011 |
| Source User Story | `management/user-stories/US-011-cancel-own-event.md` |
| Decision Resolution Artifact | No aplica |
| Priority | P1 |
| Backlog ID | PB-P1-007 |
| Backlog Title | Ciclo de vida del evento (edit / cancel / soft delete) |
| Backlog Execution Order | 25 (P0: 18 + posición 7 en P1) |
| User Story Position in Backlog Item | 2 de 3 (US-010, US-011, US-012) |
| Related User Stories in Backlog Item | US-010, US-011, US-012 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-006 |
| Feature | Cancelación de evento propio |
| Module / Domain | Events |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-007 — Ciclo de vida del evento. US-011 cubre la cancelación con cascada controlada sobre quotes y bookings.

### Execution Order Rationale

Posición 2 dentro del backlog item. Se ejecuta después de US-010 (edición) porque reutiliza el ownership opaque, los guards de role y el manejo transaccional ya establecidos.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-010 | Editar campos permitidos | 1 |
| US-011 | Cancelar evento con cascada | 2 |
| US-012 | Soft delete sólo en `draft` | 3 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:id/cancel` para transicionar el evento del organizador a `cancelled` con cascada transaccional sobre entidades hijas activas:

* `QuoteRequest` (`sent|viewed|responded`) → `cancelled`.
* `Quote` activas asociadas → `cancelled`.
* `BookingIntent` (`pending|confirmed_intent`) → `cancelled` con reverso de `BudgetItem.committed`.

Después del commit, emitir notificaciones in-app y logs simulados de email a cada vendor afectado (BR-NOTIF-002/003) como side-effect best-effort. La operación es idempotente: una segunda llamada sobre un evento ya `cancelled` retorna `409 EVENT_LOCKED`.

El frontend ofrece un modal de doble confirmación con resumen de impacto (vendors a notificar, bookings a cancelar). Sin IA. Sin pagos.

---

## 4. Scope Boundary

### In Scope

* Endpoint `POST /api/v1/events/:id/cancel`.
* `CancelEventUseCase` con orquestación transaccional.
* Servicios colaboradores para cascada de quotes, bookings y reverso de committed.
* Despacho de notificaciones in-app y log de email simulado.
* Modal de doble confirmación con resumen de impacto.
* Tests unit, integration, API, E2E + a11y.

### Out of Scope

* Reactivación del evento.
* Soft delete (US-012).
* Captura libre de `cancellation_reason` (Future).
* Reembolsos / penalizaciones.
* Cambios al módulo `Notification` más allá de lo necesario para invocarlo (delegado a PB-P1-024+).

### Explicit Non-Goals

* No introducir lock pesimista de DB.
* No implementar workflow de aprobación.
* No tocar la generación IA de tareas.

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Domain: invariantes `statusCancellableFrom ∈ {draft, active}`, `currencyImmutable`.
* Capa Application: `CancelEventUseCase`, `QuoteCascadeCancelService`, `BookingCascadeCancelService`, `BudgetCommitReverseService`, `NotificationDispatchService` (interfaz).
* Capa Infrastructure: repositorios extendidos con métodos batch.
* Capa Interface: `EventsController.cancel`.
* Transacción `prisma.$transaction` cubre todos los updates de estado y reverso de committed; las notificaciones se emiten **después** del commit.

### Frontend Architecture

* Page `/[locale]/organizer/events/:id`.
* Componentes `CancelEventDialog` y `CancelImpactSummary`.
* TanStack mutation `useCancelEvent` con invalidación de cache.
* `next-intl` para copy.

### Database Architecture

* `events`, `quote_requests`, `quotes`, `booking_intents`, `budget_items`, `notifications`.
* Sin cambios estructurales.
* Reusar índices por `event_id` ya creados.

### API Architecture

* REST JSON `/api/v1`; verbo `POST` para acciones no idempotentes desde el cliente; idempotencia lógica vía estado terminal.
* Códigos: 200, 401, 403, 404, 409.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Role guard `Organizer` + ownership opaque (404).
* DTO `.strict()` sin body relevante (POST sin payload requerido en MVP).
* Auditoría operativa por log `event.cancelled`.

### Testing Architecture

* Vitest para use case y servicios.
* Supertest para `POST /events/:id/cancel`.
* Playwright para E2E del modal.
* Tests específicos de cascada y reverso de committed.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Cancel `active` | Use case actualiza `Event.status='cancelled'`, `cancelled_at`, `cancelled_by`. | BE, API, DB |
| AC-02 — Bloqueo posterior | Estado terminal en `Event` rompe la guard de `UpdateEventUseCase` y de `CancelEventUseCase` (409). | BE Use Case |
| AC-03 — Cascada QuoteRequest/Quote | `QuoteCascadeCancelService` ejecuta `updateMany` filtrado por estados activos. | BE Use Case, DB |
| AC-04 — Cascada BookingIntent + reverso committed | `BookingCascadeCancelService` + `BudgetCommitReverseService`. | BE Use Case, DB |
| AC-05 — Notificaciones a vendors | `NotificationDispatchService` post-commit con fallback log. | BE Application, OBS |
| EC-01 — Cancel desde `draft` | Use case admite `draft`; cascada está vacía. | BE Use Case |
| EC-02 — `BookingIntent.confirmed_intent` | `cancelled_by='system_event_cancel'`, reverso de committed. | BE Use Case |
| EC-03 — Idempotencia | Validación del estado terminal con lock optimista por `updated_at`. | BE Use Case |
| EC-04 — Falla de notificación | Notificaciones fuera de transacción; warning + reintento o log. | BE Application, OBS |
| SEC-01..05 | Role guard + ownership opaque + log `event.cancelled` con conteos. | BE, OBS, MID |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `events` (mismo módulo de US-009/US-010).
* `quotes`, `bookings`, `budget`, `notifications` invocados vía interfaces de aplicación.

### Use Cases / Application Services

* `CancelEventUseCase`
  * Input: `{ eventId, sessionUserId, correlationId }`.
  * Output: `EventCancellationResultDTO` (`event`, `affectedCounts`).
  * Algoritmo:
    1. Cargar evento; `404` si no es del owner; `409` si estado ∉ {draft, active}.
    2. Abrir `prisma.$transaction`.
    3. `Event.update({ status:'cancelled', cancelled_at, cancelled_by })`.
    4. Invocar `QuoteCascadeCancelService.run({ eventId, tx })`.
    5. Invocar `BookingCascadeCancelService.run({ eventId, tx, reason:'event_cancelled', cancelledBy:'system_event_cancel' })`.
    6. `BookingCascadeCancelService` invoca internamente `BudgetCommitReverseService` por cada `BookingIntent.confirmed_intent` cancelado.
    7. Commit.
    8. `NotificationDispatchService.notifyVendorsOfEventCancellation(...)` con la lista de vendors derivada de los affected entities.
    9. Emitir log `event.cancelled` con `from_status`, conteos por entidad y `notifications_emitted`.

### Controllers / Routes

* `EventsController.cancel`
  * `POST /api/v1/events/:id/cancel`.
  * Mapea `EventNotFoundForOwner → 404`, `EventLocked → 409`, `Forbidden → 403`.

### DTOs / Schemas

* `CancelEventRequestDTO`: sin body requerido. Aceptar `{}` `.strict()`.
* `EventCancellationResultDTO`: `{ event: EventResponseDTO, affectedCounts: { quoteRequests, quotes, bookingIntents, notifications } }`.

### Repository / Persistence

* `EventPrismaRepository.markCancelled(eventId, by, tx)`.
* `QuoteRequestPrismaRepository.cancelByEvent(eventId, statesIn, tx)`.
* `QuotePrismaRepository.cancelByQuoteRequests(quoteRequestIds, tx)`.
* `BookingIntentPrismaRepository.cancelByEvent(eventId, statesIn, tx)` retornando las filas afectadas (incluye `categoryId` y `vendorId`).
* `BudgetItemPrismaRepository.decrementCommitted(eventId, categoryId, amount, tx)`.
* `NotificationPrismaRepository.createBatch(notifications, tx?)` — la creación puede ser post-commit si el módulo lo prefiere.

### Validation Rules

* `Event.status ∈ {draft, active}` para aceptar la cancelación.
* Idempotencia: si el estado ya es terminal, `409 EVENT_LOCKED`.

### Error Handling

| Caso | HTTP | Code |
|---|---|---|
| Sin sesión | 401 | UNAUTHENTICATED |
| Rol ≠ Organizer | 403 | FORBIDDEN |
| Evento ajeno / inexistente | 404 | NOT_FOUND |
| Estado terminal (`completed`/`cancelled`) | 409 | EVENT_LOCKED |
| Falla interna | 500 | INTERNAL_ERROR |

### Transactions

* `prisma.$transaction` envuelve update de `Event`, cascada de quotes y bookings, y reverso de committed.
* `NotificationDispatchService` se ejecuta **después** del commit, best-effort.

### Observability

* Log `event.cancelled` con `correlation_id`, `event_id`, `owner_user_id`, `from_status`, `affected_quote_requests`, `affected_quotes`, `affected_booking_intents`, `notifications_emitted`.
* Spans dedicados por servicio colaborador.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/:id` — el botón "Cancelar evento" aparece sólo si `status ∈ {draft, active}`.

### Components

* `CancelEventDialog`, `CancelImpactSummary`.

### Forms

* No requiere form formal; doble confirmación con botón secundario destacado.

### State Management

* TanStack mutation `useCancelEvent(eventId)`; al éxito invalida `getEvent` y la lista del organizador.

### Data Fetching

* Reusa `GET /events/:id` (PB-P1-008) para mostrar resumen del evento.
* Optional: `GET /events/:id/cancel-preview` (no incluido en MVP; el resumen del impacto puede calcularse en el cliente desde el detalle del evento o desde los conteos retornados tras la cancelación).

### Loading / Empty / Error / Success States

* Loading: spinner en el botón "Confirmar cancelación".
* Error: banner con código mapeado.
* Success: toast y navegación al listado, con highlight visual del evento cancelado.

### Accessibility

* Modal con trampa de foco, `aria-describedby` para el impacto, retorno de foco al disparador.
* Anuncio `aria-live` para errores.

### i18n

* Namespace `events.cancel.*`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:id/cancel` | Cancelar evento + cascada | Sí (Organizer dueño) | `CancelEventRequestDTO` (`{}` strict) | `200 OK` + `EventCancellationResultDTO` | 401, 403, 404, 409 EVENT_LOCKED |

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (update).
* `QuoteRequest`, `Quote` (update masivo).
* `BookingIntent` (update masivo).
* `BudgetItem` (decremento de `committed`).
* `Notification` (insert masivo).

### Fields / Columns

* `Event.cancelled_at`, `Event.cancelled_by` (existentes según schema PB-P0).
* `BookingIntent.cancelled_at`, `cancelled_by`, `cancellation_reason` (definidos por FR-BOOKING-005).
* `Quote.cancelled_at`, `cancelled_by` (alineado con BR-QUOTE-005).

### Relations

* Cascada lógica via servicios, no FK on-delete (los datos se preservan para trazabilidad).

### Indexes

* Reusar índices por `event_id` en `quote_requests`, `booking_intents`, `budget_items`.

### Constraints

* Validar transiciones en la capa Application (ADR-BE-003).

### Migrations Impact

* No requiere migración nueva si los campos `cancelled_*` ya existen.
* Si `Quote.cancelled_at/by` no existen, registrar dependencia con el sprint que entrega esas columnas.

### Seed Impact

* El seed debe incluir un evento `active` con quote y `BookingIntent.confirmed_intent` para el demo de cascada.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only.

### Authorization

* Role guard `Organizer`.
* Ownership opaque (404 si no pertenece).

### Ownership Rules

* `event.owner_user_id === session.userId` enforced en el use case.

### Role Rules

* Vendor / Admin → 403.
* Anónimo → 401.

### Negative Authorization Scenarios

| Escenario | Resultado |
|---|---|
| Otro Organizer | 404 |
| Admin | 403 |
| Vendor | 403 |
| Anónimo | 401 |
| Cancel sobre `completed` o `cancelled` | 409 |

### Audit Requirements

* No `AdminAction`. Log `event.cancelled` con conteos cubre auditoría operativa.

### Sensitive Data Handling

* No PII adicional. La notificación incluye nombre del evento y datos no sensibles.

---

## 13. Testing Strategy

### Unit Tests

* `CancelEventUseCase`: estados válidos/invalidados, idempotencia (lock optimista).
* `QuoteCascadeCancelService`, `BookingCascadeCancelService`, `BudgetCommitReverseService`: contratos.
* `NotificationDispatchService`: fallback log.

### Integration Tests

* TS-01: cancel desde `active` con cascada completa.
* TS-02: cancel desde `draft` sin cascada.
* TS-04: reverso de `BudgetItem.committed` para `BookingIntent.confirmed_intent`.
* TS-05: notificaciones in-app emitidas por vendor afectado.

### API Tests

* Happy path 200 y NT-01..NT-06.
* Verificación del payload `EventCancellationResultDTO`.

### E2E Tests

* TS-03: modal de doble confirmación; toast + navegación.

### Security Tests

* NT-01..NT-05; payload con campos no permitidos (`.strict()` rechaza).

### Accessibility Tests

* Modal: trampa de foco, retorno al disparador, `aria-live` para errores.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar seed con evento `active` + quote + `BookingIntent.confirmed_intent`.

### CI Checks

* `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm test:a11y`.

---

## 14. Observability & Audit

### Logs

* `event.cancelled`: campos detallados en §7.

### Correlation ID

* Propagación estándar.

### AdminAction

* No aplica.

### Error Tracking

* Manejo central de excepciones; los errores en notificaciones se registran como warnings.

### Metrics

* Latencia P95 NFR-PERF-001.
* Conteo de cancelaciones por día (métrica básica).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Evento `active` con 1–2 `QuoteRequest` activas y un `BookingIntent.confirmed_intent`.

### Demo Scenario Supported

* "Cancelar un evento" para mostrar cascada y notificaciones.

### Reset / Isolation Notes

* Reset del seed reinstaura el evento de demostración.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| US original referenciaba FR-EVENT-009/010 y UC-EVENT-003 | Inconsistencia con FR-EVENT-011 / UC-EVENT-006 | Refinamiento ya corrigió los IDs | Confirmar en `docs/9` la denominación FR-EVENT-011 y UC-EVENT-006 | No |
| Si `Quote.cancelled_at/by` no existen aún en el schema | Dependencia con sprint anterior | Mantener cascada lógica sobre `Quote.status` y registrar la dependencia | Coordinar con el sprint que entregue esos campos | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cascada masiva degrada P95 | Medio | Usar `updateMany` y batch en una sola transacción; medir en QA. |
| Reverso de committed sin idempotencia | Alto | Lock optimista por `Event.status` y validación previa al reverso. |
| Notificaciones fallidas dejan vendors sin enterarse | Medio | Reintentos + log; el módulo `Notification` debe persistir el batch. |
| Race condition con `BookingIntent` en transición | Medio | Transacción cubre lectura/escritura del estado del booking. |

---

## 18. Implementation Guidance for Coding Agents

* Archivos backend probables:
  * `apps/backend/src/contexts/events/application/CancelEventUseCase.ts`
  * `apps/backend/src/contexts/quotes/application/QuoteCascadeCancelService.ts`
  * `apps/backend/src/contexts/bookings/application/BookingCascadeCancelService.ts`
  * `apps/backend/src/contexts/budget/application/BudgetCommitReverseService.ts`
  * `apps/backend/src/contexts/notifications/application/NotificationDispatchService.ts`
  * `apps/backend/src/contexts/events/interface/http/EventsController.ts` (método `cancel`).
* Archivos frontend probables:
  * `apps/web/src/features/events/components/CancelEventDialog.tsx`
  * `apps/web/src/features/events/components/CancelImpactSummary.tsx`
  * `apps/web/src/features/events/hooks/useCancelEvent.ts`
* Orden recomendado:
  1. Repositorios (`Event`, `QuoteRequest`, `Quote`, `BookingIntent`, `BudgetItem`, `Notification`).
  2. Servicios de cascada y reverso.
  3. `CancelEventUseCase` con transacción.
  4. Controller + tests API.
  5. FE: botón + diálogo + hook.
  6. Tests E2E + a11y.
* Decisiones que no deben reabrirse:
  * Sin penalización en plataforma.
  * 404 opaque para evento ajeno.
  * Cascada controlada con notificación.
* Lo que NO debe implementarse aquí:
  * Soft delete (US-012).
  * Reactivación.
  * `cancellation_reason` libre.

---

## 19. Task Generation Notes

* Grupos sugeridos: `BE` (use case + servicios), `API` (controller), `SEC` (guards), `OBS` (log + warnings de notificación), `FE` (dialog + hook), `QA` (unit/integration/API/E2E/a11y), `SEED` (semilla de cascada), `DOC` (`docs/9`/`docs/16`/`docs/19`).
* QA cubre TS-01..TS-05, NT-01..NT-06, AUTH-TS-01..06.
* Coordinar dependencia con módulo `Notification`: si no está disponible, el servicio usa fallback log.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La especificación cubre los 5 AC, los 4 EC y los 6 NT del User Story, respeta la lifecycle de eventos, quotes y bookings y formaliza la cascada controlada con reverso de `BudgetItem.committed`. Las dependencias con el módulo `Notification` y posibles campos `Quote.cancelled_*` se manejan con fallback documentado.
