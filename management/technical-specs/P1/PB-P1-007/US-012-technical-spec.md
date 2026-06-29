# Technical Specification — US-012: Eliminar mi evento en estado draft (soft delete)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-012 |
| Source User Story | `management/user-stories/US-012-soft-delete-draft-event.md` |
| Decision Resolution Artifact | No aplica |
| Priority | P1 |
| Backlog ID | PB-P1-007 |
| Backlog Title | Ciclo de vida del evento (edit / cancel / soft delete) |
| Backlog Execution Order | 25 |
| User Story Position in Backlog Item | 3 de 3 (US-010, US-011, US-012) |
| Related User Stories in Backlog Item | US-010, US-011, US-012 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-006 |
| Feature | Soft delete de evento `draft` |
| Module / Domain | Events |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-007 — Ciclo de vida del evento. US-012 cubre el soft delete restringido a estado `draft`. Es la última operación del backlog item.

### Execution Order Rationale

Posición 3 de 3 dentro del backlog item; depende de la convención de ownership opaque (US-010) y del listado del organizador (PB-P1-008/US-013 para verificar la exclusión).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-010 | Editar | 1 |
| US-011 | Cancelar | 2 |
| US-012 | Soft delete `draft` | 3 |

---

## 3. Executive Technical Summary

Implementar `DELETE /api/v1/events/:id` para realizar un soft delete (`Event.deleted_at = now()`, `Event.deleted_by = session.userId`) cuando el evento está en `draft` y pertenece al organizador autenticado. El endpoint:

* Retorna `204 No Content` en éxito.
* Retorna `409 INVALID_STATE` si el evento no está en `draft`.
* Retorna `404 NOT_FOUND` para eventos ajenos o ya eliminados (ownership opaque).
* Nunca ejecuta hard delete (BR-EVENT-010).

El listado del organizador (PB-P1-008) y `GET /api/v1/events/:id` deben filtrar `deleted_at IS NULL`. La administración mantiene visibilidad de soft-deleted con marcado claro (US separadas; no se implementa aquí).

Frontend: acción "Eliminar borrador" en el listado, modal de confirmación accesible, mutation TanStack con invalidación.

---

## 4. Scope Boundary

### In Scope

* `DELETE /api/v1/events/:id`.
* `SoftDeleteEventUseCase` con guard de estado y ownership.
* Repositorio `EventPrismaRepository.softDelete`.
* Filtro `deleted_at IS NULL` en `ListMyEventsUseCase` y `GetEventByIdUseCase` (coordinado con PB-P1-008 si no estaba aplicado).
* Acción y modal en el listado.
* Tests unit, integration, API, E2E + a11y.

### Out of Scope

* Hard delete.
* Restauración (admin o self).
* Eliminación en `active`/`completed`/`cancelled` (US-011 cancela en cambio).
* Cascada (no hay entidades hijas en `draft`).
* Purga automática (Future).

### Explicit Non-Goals

* No introducir papelera ni vista de soft-deleted.
* No notificar.
* No emitir `AdminAction`.

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Domain: invariante `deletableOnlyFromDraft`.
* Capa Application: `SoftDeleteEventUseCase`.
* Capa Infrastructure: `EventPrismaRepository.softDelete`.
* Capa Interface: `EventsController.softDelete`.

### Frontend Architecture

* Botón / item de menú "Eliminar borrador" en el `EventListRow`.
* `DeleteDraftDialog` modal con confirmación simple.
* TanStack mutation `useDeleteEvent` con invalidación de la lista.

### Database Architecture

* `events.deleted_at` (existente o agregar si no estuviera).
* `events.deleted_by` opcional (FK a `users.id`).
* Índice parcial `idx_events_active_owner ON events(owner_user_id) WHERE deleted_at IS NULL`.

### API Architecture

* REST JSON `/api/v1`; `DELETE` con `204 No Content`.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Role guard `Organizer` + ownership opaque (404) + estado válido (409).

### Testing Architecture

* Vitest para use case.
* Supertest para `DELETE /events/:id` y verificación de listados.
* Playwright para E2E del listado y modal.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Soft delete `draft` | Use case marca `deleted_at`/`deleted_by`; controller retorna 204. | BE Use Case, API, DB |
| AC-02 — Listado excluye soft-deleted | Filtro en `ListMyEventsUseCase` y en repositorio. | BE Use Case, DB |
| AC-03 — `GET /events/:id` 404 para soft-deleted | Repositorio filtra `deleted_at IS NULL` en lectura por owner. | BE Use Case, DB |
| EC-01 — Estado no `draft` | 409 INVALID_STATE. | BE Use Case |
| EC-02 — Doble click | Lectura del estado antes de mutar; 404 si ya eliminado. | BE Use Case |
| EC-03 — Admin lista soft-deleted | Endpoint admin distinto; documentado para no romper AC-02. | DOC |
| SEC-01..05 | Role guard + ownership opaque + log `event.deleted`. | BE, OBS, MID |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `events` (mismo módulo).
* Subcontexto: `event-soft-delete`.

### Use Cases / Application Services

* `SoftDeleteEventUseCase`
  * Input: `{ eventId, sessionUserId, correlationId }`.
  * Output: `void`.
  * Algoritmo:
    1. Cargar evento por `id` y `owner_user_id` con `deleted_at IS NULL`; si no, lanzar `EventNotFoundForOwner` (404).
    2. Si `event.status !== 'draft'`, lanzar `EventInvalidState` (409).
    3. `EventPrismaRepository.softDelete(eventId, sessionUserId, now())`.
    4. Emitir log `event.deleted`.

### Controllers / Routes

* `EventsController.softDelete`
  * `DELETE /api/v1/events/:id`.

### DTOs / Schemas

* Sin body. El controller ignora el body o lo valida como `{}` `.strict()` si se prefiere consistencia con US-011.

### Repository / Persistence

* `EventPrismaRepository.softDelete(eventId, deletedBy, deletedAt)`.
* `EventPrismaRepository.findOwnedActive(eventId, ownerUserId)` — devuelve sólo si `deleted_at IS NULL` y owner coincide.

### Validation Rules

* `status === 'draft'` y `deleted_at IS NULL`.

### Error Handling

| Caso | HTTP | Code |
|---|---|---|
| Sin sesión | 401 | UNAUTHENTICATED |
| Rol ≠ Organizer | 403 | FORBIDDEN |
| Evento ajeno / inexistente / ya eliminado | 404 | NOT_FOUND |
| Estado distinto a `draft` | 409 | INVALID_STATE |

### Transactions

* No requeridas (única tabla, update atómico).

### Observability

* Log `event.deleted` con `correlation_id`, `event_id`, `owner_user_id`.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events` — listado.

### Components

* `EventListRow` (existente o de PB-P1-008) con acción "Eliminar borrador" visible sólo cuando `status='draft'`.
* `DeleteDraftDialog`.

### Forms

* Sin form; sólo confirmación.

### State Management

* TanStack mutation `useDeleteEvent` con invalidación de `useMyEvents`.

### Data Fetching

* Reusa `eventsApi.list()` (PB-P1-008).

### Loading / Empty / Error / Success States

* Loading: spinner en el botón.
* Error: toast con mapping (`INVALID_STATE`, `NOT_FOUND`).
* Success: toast + actualización inmediata del listado.

### Accessibility

* Modal con trampa de foco y retorno al disparador.
* Botón destructivo diferenciado visualmente.
* `aria-describedby` para el texto del modal.

### i18n

* Namespace `events.delete.*`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| DELETE | `/api/v1/events/:id` | Soft delete del evento `draft` | Sí (Organizer dueño) | — | `204 No Content` | 401, 403, 404, 409 INVALID_STATE |

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (update de `deleted_at`, `deleted_by`).

### Fields / Columns

* `Event.deleted_at` (`DateTime?`).
* `Event.deleted_by` (`String?` FK opcional a `users.id`).

### Relations

* Sin cambios.

### Indexes

* `idx_events_active_owner (owner_user_id) WHERE deleted_at IS NULL` (índice parcial).

### Constraints

* `deleted_at IS NULL` para registros visibles al organizador.

### Migrations Impact

* Si las columnas no existen, agregar migración con valores por defecto `null`.

### Seed Impact

* Asegurar al menos un evento `draft` para el demo de eliminación.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only.

### Authorization

* Role guard `Organizer`.
* Ownership opaque (404).

### Ownership Rules

* `event.owner_user_id === session.userId`.

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
| Estado `active/completed/cancelled` | 409 |
| `deleted_at != null` | 404 |

### Audit Requirements

* Log `event.deleted`. Sin `AdminAction`.

### Sensitive Data Handling

* No PII adicional.

---

## 13. Testing Strategy

### Unit Tests

* `SoftDeleteEventUseCase`: estados válido / inválido / ya eliminado / ajeno.
* Repositorio: filtros `deleted_at IS NULL`.

### Integration Tests

* TS-01: soft delete válido.
* TS-02: listado excluye soft-deleted (`GET /events`).
* TS-03: `GET /events/:id` retorna 404 tras delete.

### API Tests

* Happy path + NT-01..NT-07.

### E2E Tests

* TS-04: modal del listado y refresh.

### Security Tests

* Verificación de los 5 escenarios negativos.

### Accessibility Tests

* Modal: trampa de foco y `aria-describedby`.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar evento `draft` semilla.

### CI Checks

* `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm test:a11y`.

---

## 14. Observability & Audit

### Logs

* `event.deleted` con `correlation_id`, `event_id`, `owner_user_id`.

### Correlation ID

* Propagación estándar.

### AdminAction

* No aplica.

### Error Tracking

* Errores 5xx via handler global.

### Metrics

* Latencia P95 NFR-PERF-001.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Evento `draft` en la cuenta de demo del organizador.

### Demo Scenario Supported

* "Eliminar un borrador" desde el listado.

### Reset / Isolation Notes

* Reset del seed reinstaura el evento.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| US original referenciaba FR-EVENT-011 / UC-EVENT-004 / BR-EVENT-012 | IDs inexistentes o incorrectos | Refinamiento corrigió a FR-EVENT-012 / UC-EVENT-006 / BR-EVENT-010 | Confirmar en `docs/9` y `docs/8` | No |
| Listado admin incluye soft-deleted (FR-EVENT-010) vs listado del organizador los excluye | Diferentes endpoints | Documentar la diferencia en `docs/16` | Agregar nota en `docs/16` | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Falta del filtro `deleted_at IS NULL` en listado / detalle | Alto: el organizador vería eventos eliminados | Tarea explícita para verificar el filtro en PB-P1-008/US-013 |
| Endpoint usado por error sobre `active` | Bajo | 409 inmediato en use case |
| Hard delete accidental por code drift | Alto | Repositorio no expone `delete`; sólo `softDelete` |
| Doble click | Bajo | Lectura previa del estado |

---

## 18. Implementation Guidance for Coding Agents

* Archivos backend probables:
  * `apps/backend/src/contexts/events/application/SoftDeleteEventUseCase.ts`
  * `apps/backend/src/contexts/events/infrastructure/EventPrismaRepository.ts` (`softDelete`, `findOwnedActive`).
  * `apps/backend/src/contexts/events/interface/http/EventsController.ts` (método `softDelete`).
* Archivos frontend probables:
  * `apps/web/src/features/events/components/DeleteDraftDialog.tsx`
  * `apps/web/src/features/events/hooks/useDeleteEvent.ts`
  * Actualización mínima de `EventListRow`.
* Orden recomendado:
  1. Migración de columnas e índice parcial si faltan.
  2. Repositorio `softDelete` + `findOwnedActive`.
  3. `SoftDeleteEventUseCase` + tests.
  4. Controller `DELETE /api/v1/events/:id` + tests API.
  5. Filtro `deleted_at IS NULL` confirmado en `ListMyEventsUseCase` y `GetEventByIdUseCase`.
  6. FE: acción + modal + hook + tests E2E.
* Decisiones que no deben reabrirse:
  * Sólo soft delete; nunca hard delete.
  * Sólo `draft` admite el endpoint.
  * Admin no puede eliminar.
* Lo que NO debe implementarse aquí:
  * Restauración.
  * Papelera de reciclaje.
  * Purga automática.

---

## 19. Task Generation Notes

* Grupos sugeridos: `DB` (migración + índice), `BE` (use case + repos), `API` (controller + ajuste de listados), `SEC` (guards), `OBS` (log), `FE` (dialog + hook + listado), `QA` (unit/integration/API/E2E/a11y), `SEED` (evento draft semilla), `DOC` (alineación FR/UC/BR + diferencia admin).
* QA debe cubrir TS-01..TS-04 y NT-01..NT-07.

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

La especificación cubre los 3 AC, los 3 EC y los 7 NT del User Story, mantiene la prohibición de hard delete y formaliza la consistencia entre el listado del organizador (FR-EVENT-007) y el listado admin (FR-EVENT-010). Las dependencias documentales se cierran en DOC-001 sin bloquear la implementación.
