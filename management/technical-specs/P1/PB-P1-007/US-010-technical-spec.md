# Technical Specification — US-010: Editar mi evento (excepto moneda)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-010 |
| Source User Story | `management/user-stories/US-010-edit-own-event.md` |
| Decision Resolution Artifact | No aplica |
| Priority | P1 |
| Backlog ID | PB-P1-007 |
| Backlog Title | Ciclo de vida del evento (edit / cancel / soft delete) |
| Backlog Execution Order | 25 (P0: 18 + posición 7 en P1) |
| User Story Position in Backlog Item | 1 de 3 (US-010, US-011, US-012) |
| Related User Stories in Backlog Item | US-010, US-011, US-012 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-006 |
| Feature | Edición de evento propio |
| Module / Domain | Events |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-007 — Ciclo de vida del evento. Reúne las tres operaciones del organizador sobre su evento ya creado: editar (US-010), cancelar (US-011) y soft-deletear (US-012). Depende de PB-P1-006 (creación). Esta especificación cubre exclusivamente la edición.

### Execution Order Rationale

Se ejecuta inmediatamente después de PB-P1-006 (creación). La edición es la primera capacidad ejercida sobre un evento existente y habilita el flujo de demo del organizador. US-010 es la primera del backlog item porque US-011 (cancel) y US-012 (soft delete) requieren un evento ya editable y conocer la inmutabilidad de moneda.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-010 | Editar campos permitidos del evento | 1 |
| US-011 | Cancelar evento `active` con cascada | 2 |
| US-012 | Soft delete sólo en `draft` | 3 |

---

## 3. Executive Technical Summary

Implementar `PATCH /api/v1/events/:id` para actualizar un subconjunto de campos del evento del organizador (fecha, invitados, ciudad/país, presupuesto, idioma, notas) preservando `currency_code`, `owner_user_id`, `status` e `id`. El backend debe:

* Validar el payload con `UpdateEventDTO` Zod `.strict()`.
* Verificar que el evento pertenece al organizador autenticado y está en `draft|active`.
* Aplicar la actualización en una transacción que incluya el recálculo de `EventTask.due_date` para tareas IA cuando cambia `event_date`, preservando `manual_override=true`.
* Emitir `event.updated` con `changed_fields` y `recalculated_tasks_count`.

El frontend implementa el formulario en `/[locale]/organizer/events/:id/edit` con campo de moneda readonly, mutation TanStack y diálogo informativo al cambiar la fecha. No se introduce IA ni cambios de moneda.

---

## 4. Scope Boundary

### In Scope

* `PATCH /api/v1/events/:id` con whitelist de campos editables.
* `UpdateEventUseCase` y `RecalculateEventTaskDueDatesService`.
* Transacción que asegura consistencia entre `Event.event_date` y `EventTask.due_date`.
* Formulario de edición con `currency_code` readonly.
* Logging estructurado `event.updated`.
* Tests positivos y negativos, autorización, edge cases y accesibilidad del formulario.

### Out of Scope

* `DELETE /api/v1/events/:id` y soft delete (US-012).
* Cancelación (`POST /api/v1/events/:id/cancel`) (US-011).
* Cualquier IA.
* Audit trail extendido con timeline visual.
* Control optimista de versión.
* Edición de tareas individuales (US-018 / PB-P1-018).

### Explicit Non-Goals

* No introducir endpoint público para editar `currency_code`.
* No introducir flujo de aprobación de cambios.
* No introducir notificaciones a otros stakeholders.

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Domain: invariantes `currencyImmutable`, `statusEditable ∈ {draft, active}`, `ownerImmutable`.
* Capa Application: `UpdateEventUseCase`, `RecalculateEventTaskDueDatesService`.
* Capa Infrastructure: `EventPrismaRepository.update` y `EventTaskPrismaRepository.recalculate`.
* Capa Interface: `EventsController.update`.
* Transacción `prisma.$transaction` envolviendo update + recálculo.

### Frontend Architecture

* Next.js App Router; client component para el formulario.
* React Hook Form + Zod (`UpdateEventSchema`), submit con `dirtyFields` para enviar solo campos modificados.
* TanStack Query mutation `useUpdateEvent`.
* `next-intl` para copy y errores.

### Database Architecture

* `events` (update).
* `event_tasks` (update batch de `due_date` cuando aplica).
* Sin cambios estructurales en esta US; el campo `manual_override` se asume entregado por PB-P1-018; en caso contrario, fallback (recalcula todas las tareas IA) y registrar el comportamiento.

### API Architecture

* REST JSON `/api/v1`.
* `PATCH` semántica de actualización parcial.
* Códigos: `200`, `400`, `401`, `403`, `404`, `409`.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Middleware de sesión + role guard `Organizer`.
* Ownership check temprano: `event.owner_user_id === session.userId`; si no, `404 NOT_FOUND` (ownership opaco).
* DTO `.strict()` con whitelist explícita.

### Testing Architecture

* Vitest para use cases y validación de DTO.
* Supertest para `PATCH /events/:id` con 200/400/401/403/404/409.
* Playwright para E2E del formulario.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Edición exitosa | `UpdateEventUseCase` aplica campos del whitelist y retorna `200` con DTO. | BE, API, DB |
| AC-02 — Recálculo preservando overrides | Si `event_date` ∈ payload y existen tareas IA, recalcular `due_date` solo para `manual_override=false`. | BE Use Case, DB |
| AC-03 — Bloqueo en estados terminales | Verificar `status ∈ {draft, active}`; si no, `409 EVENT_LOCKED`. | BE Use Case, API |
| AC-04 — Cambio de idioma propaga | Persistir `language_code`; documentar que futuras invocaciones IA usarán el nuevo. | BE, DB |
| EC-01 — Currency en payload | DTO `.strict()` rechaza con `400 IMMUTABLE_FIELD`. | BE, API |
| EC-02 — Tareas con override manual | Servicio de recálculo filtra `where: { manual_override: false }`. | BE Use Case, DB |
| EC-03 — Edición concurrente | Sin control optimista; documentar "last writer wins". | API, FE |
| SEC-01..05 | Role guard + ownership opaque check + DTO `.strict()` + log `event.updated`. | BE, Middleware, OBS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `events` (mismo módulo de US-009).
* Subcontexto: `event-edition`.

### Use Cases / Application Services

* `UpdateEventUseCase`
  * Input: `{ eventId, sessionUserId, patch: Partial<UpdateEventInput> }`.
  * Output: `EventResponseDTO`.
  * Reglas: ownership opaque (lanza `EventNotFoundForOwner` si owner no coincide), `status ∈ {draft, active}` (lanza `EventLocked`), aplica patch, dispara recálculo si `event_date` cambió.
* `RecalculateEventTaskDueDatesService`
  * Input: `{ eventId, newEventDate }`.
  * Comportamiento: actualiza `due_date = newEventDate - relative_offset_days` para tareas IA `manual_override=false`.
  * Si la columna `manual_override` aún no existe, recalcula todas las tareas IA y emite log de advertencia.

### Controllers / Routes

* `EventsController.update`
  * `PATCH /api/v1/events/:id`.
  * Convierte excepciones de dominio a códigos HTTP.

### DTOs / Schemas

* `UpdateEventDTO` (Zod `.strict()` y `.partial()`):
  ```ts
  z.object({
    eventDate: z.coerce.date().refine(d => d >= startOfTodayUtc()).optional(),
    estimatedGuests: z.number().int().min(1).max(10000).optional(),
    city: z.string().min(1).max(120).optional(),
    countryCode: z.string().length(2).optional(),
    estimatedBudget: z.number().nonnegative().optional(),
    languageCode: z.enum(['es-LATAM','es-ES','pt','en']).optional(),
    notes: z.string().max(500).optional(),
  }).strict()
  ```
* `EventResponseDTO`: idéntico al de US-009.

### Repository / Persistence

* `EventPrismaRepository.update(eventId, patch)`.
* `EventTaskPrismaRepository.recalculateDueDates(eventId, newEventDate, { preserveManualOverride: true })`.

### Validation Rules

* VR-01..VR-09 implementadas por `UpdateEventDTO` y `UpdateEventUseCase`.
* `event_date` futura validada en FE y BE.

### Error Handling

| Caso | HTTP | Code |
|---|---|---|
| Campos inválidos | 400 | `VALIDATION_ERROR` |
| `currency_code`, `status`, `owner_user_id`, `id`, `event_type_code` en payload | 400 | `IMMUTABLE_FIELD` |
| `language_code` fuera de enum | 400 | `UNSUPPORTED_LANGUAGE` |
| Sin sesión | 401 | `UNAUTHENTICATED` |
| Rol distinto a Organizer | 403 | `FORBIDDEN` |
| Evento ajeno o inexistente | 404 | `NOT_FOUND` |
| Estado `completed` o `cancelled` | 409 | `EVENT_LOCKED` |

### Transactions

* `prisma.$transaction` envuelve `events.update` y `event_tasks.updateMany` para garantizar atomicidad cuando cambia `event_date`.

### Observability

* Log `event.updated` con `correlation_id`, `event_id`, `owner_user_id`, `changed_fields`, `recalculated_tasks_count`.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/:id/edit`.

### Components

* `EventEditForm` (RHF + Zod).
* `CurrencyReadonlyField` con tooltip.
* `RecalcConfirmationDialog` que se abre al editar `event_date`.

### Forms

* Schema `UpdateEventClientSchema` (mismo enum que el backend; compartido vía paquete).
* `currency_code` no es parte del schema; render readonly desde la respuesta de `GET /api/v1/events/:id` (endpoint reutilizado o ya entregado en PB-P1-008).

### State Management

* TanStack Query: `useEvent(id)` (lectura previa para inicializar form), `useUpdateEvent(id)` (mutation).
* React Hook Form con `mode: 'onBlur'`, submit envía sólo `dirtyFields`.

### Data Fetching

* Reusa `eventsApi.getById(id)` si está disponible (PB-P1-008); si todavía no se entregó, definir un endpoint mínimo de lectura como dependencia de PB-P1-008.

### Loading / Empty / Error / Success States

* Loading: skeleton del form.
* Error: banner con código mapeado (`IMMUTABLE_FIELD`, `EVENT_LOCKED`, `NOT_FOUND`, `VALIDATION_ERROR`).
* Success: toast + navegación al dashboard del evento.

### Accessibility

* `aria-describedby` para errores, foco al primer error tras submit.
* Tooltip de moneda accesible por teclado y screen reader.

### i18n

* Namespaces `events.edit.*`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| PATCH | `/api/v1/events/:id` | Editar campos permitidos | Sí (Organizer dueño) | `UpdateEventDTO` (partial, strict) | `200 OK` + `EventResponseDTO` | 400 VALIDATION_ERROR, 400 IMMUTABLE_FIELD, 400 UNSUPPORTED_LANGUAGE, 401, 403, 404, 409 EVENT_LOCKED |

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (update).
* `EventTask` (update masivo de `due_date` cuando aplica).

### Fields / Columns

* No se agregan columnas.
* Dependencia: `EventTask.manual_override` (entregada por PB-P1-018). Si aún no existe, registrar dependencia condicional y comportamiento fallback.

### Relations

* Sin cambios.

### Indexes

* Reusar `idx_events_owner_user_id` y, si existe, índice compuesto en `event_tasks (event_id, due_date)`.

### Constraints

* `currency_code` inmutable enforced en Application/Domain (ADR-BE-003).

### Migrations Impact

* No requiere migración nueva si `manual_override` ya existe.
* Si no existe, esta tarea **no** la crea (pertenece a US-018); en su lugar, el servicio cae al fallback.

### Seed Impact

* No requiere seed adicional.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only.

### Authorization

* Role guard `Organizer`.
* Ownership opaque: si el evento no pertenece al usuario, responder `404 NOT_FOUND` para no filtrar la existencia.

### Ownership Rules

* `event.owner_user_id === session.userId` enforced en use case antes de cualquier mutación.

### Role Rules

* Vendor / Admin → 403.
* Anónimo → 401.

### Negative Authorization Scenarios

| Escenario | Resultado |
|---|---|
| Otro Organizer | 404 NOT_FOUND |
| Admin | 403 FORBIDDEN |
| Vendor | 403 FORBIDDEN |
| Anónimo | 401 UNAUTHENTICATED |
| Payload con `currency_code` | 400 IMMUTABLE_FIELD |
| Payload con `owner_user_id` / `status` / `id` | 400 IMMUTABLE_FIELD |

### Audit Requirements

* No es `AdminAction`. Log estructurado `event.updated` cubre auditoría operativa.

### Sensitive Data Handling

* `notes` validado en longitud; no se almacena PII adicional.

---

## 13. Testing Strategy

### Unit Tests

* `UpdateEventDTO`: cada VR + `.strict()` rechaza propiedades extra.
* `UpdateEventUseCase`: ownership, status válido, propagación del patch, disparo del recálculo.
* `RecalculateEventTaskDueDatesService`: respeta `manual_override`, fallback si la columna no existe.

### Integration Tests

* Update válido en `draft` y `active` (TS-01, TS-02).
* Cambio de `event_date` recalcula tareas IA preservando override (TS-03).
* Cambio de idioma (TS-06).

### API Tests

* Happy path con `dirtyFields` mínimos.
* NT-01..NT-09 (auth, immutable, locked).

### E2E Tests

* TS-04: edición completa desde el dashboard hasta el toast de éxito.
* TS-05: `currency_code` visible como readonly.

### Security Tests

* NT-02 (404 para evento ajeno), NT-04 (admin 403), NT-05 (vendor 403), NT-06 (anónimo 401).
* Payload con `owner_user_id` ajeno → 400.

### Accessibility Tests

* axe-core en el formulario.
* Tooltip de moneda accesible.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar que el seed de US-009 sigue alimentando casos editables.

### CI Checks

* `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm test:a11y`.

---

## 14. Observability & Audit

### Logs

* `event.updated`: `correlation_id`, `event_id`, `owner_user_id`, `changed_fields[]`, `recalculated_tasks_count`.

### Correlation ID

* Propagación estándar por middleware.

### AdminAction

* No aplica.

### Error Tracking

* Errores 5xx via handler global.

### Metrics

* Latencia P95 de `PATCH /api/v1/events/:id` bajo NFR-PERF-001.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* No requiere seed adicional; reusa el seed de US-009.

### Demo Scenario Supported

* "Editar un evento" en el flujo del organizador del demo, cambiando fecha para mostrar el recálculo.

### Reset / Isolation Notes

* No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| FR-EVENT-004 menciona "ubicación, presupuesto, idioma" sin enumerar `notes`/`estimated_guests` explícitamente | El alcance editable incluye `estimated_guests` y `notes` (heredados de US-009) | Mantener whitelist y documentar en `docs/9` | Agregar nota en `docs/9` confirmando `estimated_guests` y `notes` como editables | No |
| US-018 (PB-P1-018) define `EventTask.manual_override` | La columna podría no existir al momento de implementar US-010 | Fallback documentado (recalcular todas las tareas IA) | Sincronizar entrega de US-010 con US-018 o aceptar fallback temporal | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Recálculo masivo con muchas tareas IA degrada P95 | Medio | Hacer el recálculo en `updateMany` único; eventualmente mover a job si crece. |
| `manual_override` aún no existe al implementar US-010 | Medio | Fallback (recalcular todas) y log de advertencia; sincronizar con US-018. |
| "Last writer wins" sin lock optimista | Bajo | Documentado; UX advierte al volver al dashboard. |
| Cambio de `event_date` muy lejano produce `due_date` negativas | Bajo | Clamp en cero o documentar comportamiento del cálculo. |

---

## 18. Implementation Guidance for Coding Agents

* Archivos backend probables:
  * `apps/backend/src/contexts/events/application/UpdateEventUseCase.ts`
  * `apps/backend/src/contexts/events/application/RecalculateEventTaskDueDatesService.ts`
  * `apps/backend/src/contexts/events/interface/http/dto/UpdateEventDTO.ts`
  * `apps/backend/src/contexts/events/interface/http/EventsController.ts` (método `update`).
  * `apps/backend/src/contexts/events/infrastructure/EventPrismaRepository.ts` (`update`).
  * `apps/backend/src/contexts/events/infrastructure/EventTaskPrismaRepository.ts` (`recalculateDueDates`).
* Archivos frontend probables:
  * `apps/web/src/app/[locale]/organizer/events/[id]/edit/page.tsx`
  * `apps/web/src/features/events/components/EventEditForm.tsx`
  * `apps/web/src/features/events/components/CurrencyReadonlyField.tsx`
  * `apps/web/src/features/events/components/RecalcConfirmationDialog.tsx`
  * `apps/web/src/features/events/hooks/useUpdateEvent.ts`
  * `apps/web/src/features/events/schema/updateEvent.schema.ts`
* Orden recomendado:
  1. `UpdateEventDTO` Zod + tests.
  2. `RecalculateEventTaskDueDatesService` + tests.
  3. `UpdateEventUseCase` + tests.
  4. `EventsController.update` + tests API.
  5. Formulario FE + hook + tests E2E.
* Decisiones que no deben reabrirse:
  * Inmutabilidad de moneda.
  * `404 NOT_FOUND` para evento ajeno.
  * Recálculo preserva `manual_override`.
* Lo que NO debe implementarse aquí:
  * Cancel, soft delete, dashboard.
  * Audit trail extendido.
  * Lock optimista.

---

## 19. Task Generation Notes

* Grupos de tareas sugeridos:
  * `BE` — Use case + service + DTO + repositorios.
  * `API` — Controller.
  * `SEC` — Ownership opaque + role guard.
  * `OBS` — Log `event.updated`.
  * `FE` — Form, hook, diálogo de recálculo.
  * `QA` — Unit, integration, API, E2E, a11y, autorización.
  * `DOC` — Actualizar `docs/9` y `docs/16` con el contrato del PATCH.
* QA debe cubrir TS-01..TS-06 y NT-01..NT-09.
* Seguridad debe cubrir AUTH-TS-01..05 y test específico de payload con campos inmutables.
* Generar `tasks.md` consolidado a nivel del backlog item: No por ahora (US-011 y US-012 producirán sus propios desgloses).

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

La especificación cubre los 4 AC, los 3 EC y los 9 NT del User Story, respeta los guardrails de inmutabilidad de moneda, ownership y estados terminales, y formaliza la preservación de overrides manuales en el recálculo de tareas IA. Las dos notas no bloqueantes (whitelist explícita en `docs/9` y dependencia condicional con `manual_override`) se manejan como acciones documentales y fallback respectivamente.
