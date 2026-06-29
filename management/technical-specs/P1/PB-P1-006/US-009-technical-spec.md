# Technical Specification — US-009: Crear un evento mediante wizard

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-009 |
| Source User Story | `management/user-stories/US-009-create-event-wizard.md` |
| Decision Resolution Artifact | No aplica (sin blockers; decisiones formalizadas en FR/BR/PO 8.1) |
| Priority | P1 |
| Backlog ID | PB-P1-006 |
| Backlog Title | Wizard de creación de evento |
| Backlog Execution Order | 24 (P0: 18 ítems + posición 6 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-009 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-003 (login), PB-P0-001 (DB schema) |
| Feature | Wizard de creación de eventos |
| Module / Domain | Events |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P1-006 — Wizard de creación de evento**. Backlog item P1 dentro de EPIC-EVT-001. Cubre la creación inicial del `Event` en estado `draft` con los 6 tipos canónicos, moneda inmutable (local o USD) e idioma seleccionable. Es el habilitador de prácticamente todos los flujos posteriores del organizador (ciclo de vida, dashboard, IA, presupuesto, cotizaciones).

### Execution Order Rationale

PB-P1-006 se ejecuta después de las fundaciones P0 de base de datos, autenticación y autorización (`PB-P0-001`..`PB-P0-018`), y después de los flujos P1 de registro y login (`PB-P1-001`..`PB-P1-005`). Sin un evento en `draft`, ningún flujo posterior P1+ del organizador puede activarse, por lo tanto este wizard debe entregarse temprano dentro de P1 (orden 24 global, posición 6 en P1).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-009 | Wizard completo de creación de evento (única US del backlog item) | 1 |

---

## 3. Executive Technical Summary

Implementar el endpoint `POST /api/v1/events` y el endpoint de soporte `GET /api/v1/event-types`, junto con un wizard frontend de 4 pasos en `/[locale]/organizer/events/new`. El backend debe:

* Validar el payload con Zod (enums para `event_type_code`, `currency_code`, `language_code`, `country_code`).
* Derivar `owner_user_id` de la sesión (cookie HTTP-only).
* Insertar el `Event` con `status='draft'` y persistir `currency_code` como inmutable.
* Rechazar mutaciones futuras de `currency_code` desde la capa de aplicación.
* Reutilizar el catálogo de `EventType` (sembrado en PB-P0 seeds) exponiendo sólo los activos.

El frontend debe usar React Hook Form + Zod por paso, TanStack Query para `GET /api/v1/event-types`, persistencia opcional de borrador en `localStorage` y stepper accesible. Se reutiliza el design system y el cliente HTTP estándar de EventFlow.

No se introduce IA. No se introducen pagos, contratos, ni cambios de moneda post-creación.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events` (crear evento en `draft`).
* `GET /api/v1/event-types` (catálogo activo, sólo lectura).
* Aplicación de `CreateEventUseCase` con enforcement de moneda inmutable y ownership.
* Validación Zod compartida FE/BE (donde se reutilice schema).
* Wizard de 4 pasos con persistencia opcional en `localStorage`.
* Logging estructurado `event.created` con `X-Correlation-Id`.
* Tests unitarios, integración, API, E2E y de accesibilidad para el flujo.
* Seed de los 6 `EventType` con nombres en 4 locales.

### Out of Scope

* `PATCH /api/v1/events/:id` y otros endpoints del ciclo de vida (PB-P1-007).
* Listado/Dashboard del organizador (PB-P1-008).
* Job AutoComplete (PB-P1-009).
* Lectura admin de eventos (PB-P1-010).
* Cualquier feature IA (PB-P1-011 en adelante).
* Persistencia server-side de borradores parciales del wizard.
* Conversión de moneda automática.

### Explicit Non-Goals

* No implementar editor de tipo de evento (admin).
* No exponer endpoint público de cambio de moneda.
* No introducir contratos, pagos ni firma electrónica.
* No introducir chat, push notifications ni WhatsApp.

---

## 5. Architecture Alignment

### Backend Architecture

* Modular Monolith Node.js + Express + TypeScript.
* Capa Domain: entidad `Event`, value objects `CurrencyCode`, `LanguageCode`, `EventTypeCode`, invariantes (`ownerImmutable`, `currencyImmutable`).
* Capa Application: `CreateEventUseCase`, `ListActiveEventTypesUseCase` (ADR-BE-003).
* Capa Infrastructure: `EventPrismaRepository`, `EventTypePrismaRepository`.
* Capa Interface: controlador Express `EventsController`, `EventTypesController` bajo `/api/v1`.
* Zod en la frontera Interface (DTO) y reuso de schemas para validación.

### Frontend Architecture

* Next.js App Router, locale dinámico `/[locale]/organizer/events/new`.
* Client Component para el wizard (state, validación, transiciones).
* TanStack Query para `GET /api/v1/event-types` con caching de 5 minutos.
* React Hook Form + Zod por paso; al submit final, llamada `eventsApi.create`.
* `next-intl` para copy y mensajes de error.
* Tailwind + design tokens existentes para stepper y formularios.

### Database Architecture

* PostgreSQL gestionado por Prisma.
* Modelos involucrados: `Event`, `EventType`, `Location` (referencia), `User` (referencia).
* `Event.currency_code` y `Event.language_code` como columnas no nulas.
* Default `Event.status = 'draft'` en aplicación; opcionalmente reforzado por check constraint.

### API Architecture

* REST JSON bajo `/api/v1`.
* Autenticación por cookie HTTP-only validada por middleware estándar.
* Versionado por path (v1).
* Respuestas consistentes con el handler global de errores y formato `{ code, message, details? }`.

### AI / PromptOps Architecture

No aplica. La historia no invoca IA.

### Security Architecture

* RBAC: rol `Organizer` requerido.
* Backend único source of truth para autorización.
* DTO Zod rechaza campos no permitidos (incluye `owner_user_id` y `status`).
* `currency_code` declarado inmutable en el `UpdateEventDTO` que pertenece a PB-P1-007 (mencionado para evitar regresión).

### Testing Architecture

* Vitest para unit y application use cases.
* Supertest para tests de API.
* Playwright para E2E del wizard.
* MSW en frontend para tests del wizard y del fetch de `event-types`.
* Axe / pa11y para checks de accesibilidad del stepper.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Wizard crea evento `draft` y redirige | `POST /api/v1/events` retorna `201 Created` con `Location`; FE navega a `/organizer/events/:id`. | FE, API, BE Use Case, DB |
| AC-02 — 6 tipos soportados | `GET /api/v1/event-types` filtra `is_active=true`; FE renderiza los activos. | FE, API, BE, DB seed |
| AC-03 — Idioma por defecto = preferido del usuario | FE inicializa el campo `language_code` desde `useCurrentUser().preferred_language`. | FE |
| AC-04 — Selección moneda local o USD | FE mapea `country_code` → moneda local (tabla) y ofrece dos botones: local o USD. | FE |
| AC-05 — Moneda inmutable | `UpdateEventDTO` (en PB-P1-007) rechaza `currency_code`; documentado y enforced en domain. | BE Use Case, Domain |
| EC-01 — Fecha en el pasado | Zod refine `event_date >= today (UTC organizer)` en FE y BE. | FE, BE |
| EC-02 — Moneda fuera del catálogo | Zod enum `currency_code ∈ ['GTQ','EUR','MXN','COP','USD']`; error `400 INVALID_CURRENCY`. | BE |
| EC-03 — EventType inactivo | Use case revalida `is_active` al crear; `400 EVENT_TYPE_INACTIVE`. | BE Use Case, DB |
| EC-04 — Idioma fuera de catálogo | Zod enum `language_code ∈ ['es-LATAM','es-ES','pt','en']`; `400 UNSUPPORTED_LANGUAGE`. | BE |
| SEC-01..05 | Middleware sesión + role guard `Organizer`; DTO Zod rechaza `owner_user_id`, `status`, `id`; use case toma `owner_user_id` del contexto. | BE, Middleware |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `events` (Application + Domain + Infrastructure + Interface).
* Subcontextos: `event-creation`, `event-types-catalog`.

### Use Cases / Application Services

* `CreateEventUseCase`
  * Input: `{ ownerUserId, eventTypeCode, eventDate, estimatedGuests, city, countryCode, estimatedBudget, currencyCode, languageCode, notes? }`.
  * Output: `Event` recién creado (id, ownerUserId, status='draft', timestamps).
  * Reglas: valida que `EventType` por `code` exista y `is_active=true`; persiste `Event`.
* `ListActiveEventTypesUseCase`
  * Output: `EventType[]` con `code`, `display_name` (i18n), `is_active=true`.

### Controllers / Routes

* `EventsController`
  * `POST /api/v1/events` → `CreateEventUseCase`.
* `EventTypesController`
  * `GET /api/v1/event-types` → `ListActiveEventTypesUseCase`.

### DTOs / Schemas

* `CreateEventDTO` (Zod):
  ```ts
  z.object({
    eventTypeCode: z.enum(EVENT_TYPE_CODES),
    eventDate: z.coerce.date().refine(d => d >= startOfTodayUtc()),
    estimatedGuests: z.number().int().min(1).max(10000),
    city: z.string().min(1).max(120),
    countryCode: z.string().length(2),
    estimatedBudget: z.number().nonnegative(),
    currencyCode: z.enum(['GTQ','EUR','MXN','COP','USD']),
    languageCode: z.enum(['es-LATAM','es-ES','pt','en']),
    notes: z.string().max(500).optional()
  }).strict()
  ```
* `EventResponseDTO`: `{ id, ownerUserId, status, eventTypeCode, eventDate, estimatedGuests, city, countryCode, estimatedBudget, currencyCode, languageCode, createdAt, updatedAt }`.
* `EventTypeResponseDTO`: `{ code, displayName, isActive }`.

### Repository / Persistence

* `EventPrismaRepository.create(event)` ejecuta `prisma.event.create({ data })`.
* `EventTypePrismaRepository.findActive()` ejecuta `prisma.eventType.findMany({ where: { isActive: true } })`.
* `EventTypePrismaRepository.findByCode(code)` para revalidación dentro del use case.

### Validation Rules

* VR-01..VR-07 implementadas en `CreateEventDTO`.
* Revalidación de `EventType.isActive` en el use case (defensa frente a `is_active` cambiado entre `GET` y `POST`).

### Error Handling

| Caso | Código HTTP | Code |
|---|---|---|
| Fecha pasada / campos inválidos | 400 | `VALIDATION_ERROR` |
| Moneda fuera de enum | 400 | `INVALID_CURRENCY` |
| Idioma fuera de enum | 400 | `UNSUPPORTED_LANGUAGE` |
| EventType inactivo / inexistente | 400 | `EVENT_TYPE_INACTIVE` |
| Sin sesión | 401 | `UNAUTHENTICATED` |
| Sesión con rol distinto a Organizer | 403 | `FORBIDDEN` |
| Intento de mutar `currency_code` (en PB-P1-007) | 400 | `IMMUTABLE_FIELD` |

### Transactions

* `CreateEventUseCase` no requiere transacción si `Location` se modela como string + `country_code`.
* Si en una iteración futura se modela `Location` como entidad relacionada y se inserta on-the-fly, encapsular en `prisma.$transaction`.

### Observability

* Log estructurado `event.created` con `correlation_id`, `owner_user_id`, `event_type_code`, `currency_code`, `language_code`, `country_code`.
* Métricas latencia P95 del endpoint (`NFR-PERF-001`).

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/new` — page client con guard de sesión y rol.
* Redirect post-creación: `/[locale]/organizer/events/[id]`.

### Components

* `EventCreationWizard` (orquesta pasos y state global).
* `StepIndicator` (stepper accesible con `aria-current`).
* `EventTypeStep` (selector de tipo).
* `DateLocationStep` (`event_date`, `city`, `country_code`).
* `GuestsBudgetStep` (`estimated_guests`, `estimated_budget`).
* `CurrencyLanguageConfirmationStep` (`currency_code`, `language_code` y resumen final).
* `EventSummary` (panel de revisión final).

### Forms

* Un schema Zod por paso, todos compuestos en un superschema final.
* RHF con `mode: 'onBlur'` y validación al avanzar.

### State Management

* Form state via React Hook Form.
* Server state via TanStack Query (`useEventTypes`, mutación `useCreateEvent`).
* Persistencia opcional de borrador en `localStorage` con clave `eventflow:wizard:create-event:<userId>`; se limpia al `POST` exitoso o al cancelar.

### Data Fetching

* `useEventTypes()` consume `GET /api/v1/event-types`, cache `staleTime` 5 min.
* `useCreateEvent()` realiza `POST /api/v1/events` y redirige al detalle del evento.

### Loading / Empty / Error / Success States

* Loading: spinner en el botón "Crear evento"; skeleton en `EventTypeStep` mientras carga el catálogo.
* Empty: no aplica (catálogo siempre tiene 6 tipos por seed).
* Error: mensaje inline por campo + banner si la API retorna `4xx/5xx`.
* Success: toast + navegación al dashboard del evento.

### Accessibility

* Foco automático al primer input al cambiar de paso.
* `aria-live="polite"` para errores agregados.
* Stepper navegable con `Tab`/`Shift+Tab`; cada paso visible es un `<section aria-label>`.
* Botones con `aria-disabled` mientras la validación bloquea avance.

### i18n

* Cargar `next-intl` namespaces `events.create.*`.
* Lista de monedas y nombres locales se reduce a 5 códigos; el nombre legible viene del namespace `currencies.*`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events` | Crear evento en `draft` | Sí (Organizer) | `CreateEventDTO` (ver §7) | `201 Created` + `EventResponseDTO` + `Location: /api/v1/events/:id` | 400 VALIDATION_ERROR, 400 INVALID_CURRENCY, 400 UNSUPPORTED_LANGUAGE, 400 EVENT_TYPE_INACTIVE, 401, 403 |
| GET | `/api/v1/event-types` | Listar `EventType` activos | Sí (Organizer) | — | `200 OK` + `EventTypeResponseDTO[]` | 401, 403 |

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (lectura, escritura).
* `EventType` (lectura).
* `User` (lectura del `id` desde la sesión, no se mutará).

### Fields / Columns

* `Event.id` (UUID, PK).
* `Event.owner_user_id` (FK → `User.id`, NOT NULL).
* `Event.event_type_id` (FK → `EventType.id`, NOT NULL).
* `Event.event_date` (timestamp/date, NOT NULL).
* `Event.estimated_guests` (int, NOT NULL).
* `Event.city` (string, NOT NULL).
* `Event.country_code` (char(2), NOT NULL).
* `Event.estimated_budget` (decimal/numeric, NOT NULL).
* `Event.currency_code` (string enum, NOT NULL).
* `Event.language_code` (string enum, NOT NULL).
* `Event.status` (string enum, default `'draft'`, NOT NULL).
* `Event.notes` (string, NULLABLE, max 500).
* `Event.created_at`, `Event.updated_at`.

### Relations

* `Event.owner_user_id` → `User.id`.
* `Event.event_type_id` → `EventType.id`.

### Indexes

* `idx_events_owner_user_id (owner_user_id)`.
* `idx_events_owner_status (owner_user_id, status)`.

### Constraints

* `events.currency_code` enforce a nivel de aplicación y, defensivamente, opcional check constraint (`currency_code = OLD.currency_code` en update si se decide trigger).
* FK no nulas para `owner_user_id` y `event_type_id`.

### Migrations Impact

* Si la migración base de `events` (PB-P0-001) ya creó la tabla, esta US solo agrega los índices listados y, si aplica, el default `'draft'` para `status`.
* Verificar enums Postgres o `varchar` + check según convención del proyecto (definido en `docs/18`).

### Seed Impact

* Seed debe garantizar los 6 `EventType` (`wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate`) con `is_active=true` y display names en los 4 locales.

---

## 11. AI / PromptOps Design

No aplica. La historia no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only (sesión); validada por middleware estándar.

### Authorization

* Guard de rol `Organizer` aplicado a ambos endpoints.

### Ownership Rules

* `owner_user_id` se setea exclusivamente desde la sesión.
* Cualquier `owner_user_id` en el payload se ignora por `Zod .strict()`.

### Role Rules

* Vendor: 403.
* Admin: 403 (admins no son owners de eventos).
* Anónimo: 401.

### Negative Authorization Scenarios

| Escenario | Resultado esperado |
|---|---|
| Vendor autenticado intenta `POST /events` | 403 `FORBIDDEN` |
| Admin autenticado intenta `POST /events` | 403 `FORBIDDEN` |
| Sin cookie de sesión | 401 `UNAUTHENTICATED` |
| Payload incluye `owner_user_id` distinto | 400 `VALIDATION_ERROR` (rechazado por `.strict()`) |
| Payload incluye `status` distinto a `draft` | 400 `VALIDATION_ERROR` |

### Audit Requirements

* No es `AdminAction`. Log estructurado `event.created` es suficiente para auditoría operativa.

### Sensitive Data Handling

* No se almacena PII adicional. `notes` opcional, validado en longitud y normalizado (`trim`).

---

## 13. Testing Strategy

### Unit Tests

* `CreateEventUseCase`:
  * Crea evento con datos válidos.
  * Rechaza `EventType` inactivo.
  * Asigna `owner_user_id` desde el contexto.
  * Asigna `status='draft'` ignorando input.
* `CreateEventDTO`:
  * Cubre cada VR-01..VR-07.
  * Rechaza propiedades adicionales (`.strict()`).

### Integration Tests

* `CreateEventUseCase` + `EventPrismaRepository` con base de datos de test.
* `ListActiveEventTypesUseCase` retorna sólo activos.

### API Tests

* `POST /api/v1/events` happy path (TS-01 con los 6 tipos).
* `GET /api/v1/event-types` retorna sólo activos (TS-04).
* Negativos: NT-01..NT-07.
* Auth: AUTH-TS-01..04.

### E2E Tests

* Playwright: TS-03 wizard 4 pasos hasta redirect al dashboard.

### Security Tests

* NT-03, NT-06 (Vendor → 403, anónimo → 401).
* Test específico: payload con `owner_user_id` ajeno → 400.

### Accessibility Tests

* Stepper navegable por teclado.
* `aria-current` y `aria-describedby` presentes.
* axe-core sin violaciones críticas.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verifica que el seed produce los 6 `EventType` activos con i18n correcto en los 4 locales.

### CI Checks

* `pnpm test` (unit + integration).
* `pnpm test:e2e` para el wizard.
* `pnpm lint` y `pnpm typecheck`.
* `pnpm test:a11y` para el wizard.

---

## 14. Observability & Audit

### Logs

* `event.created` con campos no-PII: `correlation_id`, `owner_user_id`, `event_id`, `event_type_code`, `currency_code`, `language_code`, `country_code`.

### Correlation ID

* Header `X-Correlation-Id` propagado por middleware; FE lo genera si no viene.

### AdminAction

* No aplica.

### Error Tracking

* Errores 5xx capturados por el handler global y enviados a CloudWatch/sink estándar.

### Metrics

* P95 latencia de `POST /api/v1/events` < 1.5s en demo (NFR-PERF-001).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* 6 `EventType` activos: `wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate`.
* Display names en `es-LATAM`, `es-ES`, `pt`, `en`.

### Demo Scenario Supported

* Demo "Crear evento" descrita en `docs/8`: organizador crea un `wedding`, 120 invitados, ciudad Guatemala, GTQ 120,000, idioma `es-LATAM`.

### Reset / Isolation Notes

* El reset de seed no debe romper FKs si hay `Event` previos; usar truncado controlado o `cascade` administrado.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Backlog Notes PB-P1-006 ("Soporte mínimo de moneda: GTQ, EUR, MXN, COP, USD") vs Decisión PO 8.1 #7 ("moneda local o USD") | El backlog enumera el conjunto operativo de códigos; la decisión PO define la semántica (dos opciones explícitas) | Wizard ofrece dos opciones explícitas; el `currency_code` resultante pertenece al enum {GTQ, EUR, MXN, COP, USD} | Documentar en `docs/8.1` que el conjunto operativo es el listado y la elección es semánticamente binaria | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race condition al desactivar `EventType` entre `GET` y `POST` | Medio: usuario ve un tipo que el backend rechaza | Revalidar `is_active` dentro del `CreateEventUseCase` y devolver `400 EVENT_TYPE_INACTIVE` con mensaje claro |
| Cliente intenta cambiar `currency_code` vía un futuro endpoint update | Alto: rompe BR-EVENT-007 | Mantener `currency_code` fuera de cualquier `UpdateEventDTO`; agregar prueba de regresión en PB-P1-007 |
| Persistencia de borrador en `localStorage` queda con datos sensibles | Bajo: presupuesto del usuario almacenado | Borrar el borrador al éxito o cancelar; documentar TTL y limpieza |
| Zona horaria del organizador genera falsos `400 VALIDATION_ERROR` cerca de medianoche | Medio | Comparar `event_date` contra `startOfTodayUtc()` con tolerancia de 1 día o usar el offset del organizador documentado |
| Currency `local` no mapea para países exóticos | Bajo (MVP acotado) | Tabla `countryCode → currencyCode` definida en FE; fallback a USD si no hay match |

---

## 18. Implementation Guidance for Coding Agents

* Archivos backend probables:
  * `apps/backend/src/contexts/events/domain/Event.ts`
  * `apps/backend/src/contexts/events/application/CreateEventUseCase.ts`
  * `apps/backend/src/contexts/events/application/ListActiveEventTypesUseCase.ts`
  * `apps/backend/src/contexts/events/infrastructure/EventPrismaRepository.ts`
  * `apps/backend/src/contexts/events/infrastructure/EventTypePrismaRepository.ts`
  * `apps/backend/src/contexts/events/interface/http/EventsController.ts`
  * `apps/backend/src/contexts/events/interface/http/EventTypesController.ts`
  * `apps/backend/src/contexts/events/interface/http/dto/CreateEventDTO.ts`
* Archivos frontend probables:
  * `apps/web/src/app/[locale]/organizer/events/new/page.tsx`
  * `apps/web/src/features/events/components/EventCreationWizard.tsx`
  * `apps/web/src/features/events/components/steps/*`
  * `apps/web/src/features/events/api/eventsApi.ts`
  * `apps/web/src/features/events/api/eventTypesApi.ts`
  * `apps/web/src/features/events/schema/createEvent.schema.ts`
* Orden recomendado:
  1. Migraciones e índices Prisma.
  2. Seed de `EventType` con i18n.
  3. `ListActiveEventTypesUseCase` + endpoint `GET /api/v1/event-types`.
  4. `CreateEventUseCase` + endpoint `POST /api/v1/events`.
  5. DTO Zod + tests unitarios e integración.
  6. Wizard FE paso a paso (`EventTypeStep` → `DateLocationStep` → `GuestsBudgetStep` → `CurrencyLanguageConfirmationStep`).
  7. Persistencia opcional en `localStorage`.
  8. Tests E2E y de accesibilidad.
* Decisiones que no deben reabrirse:
  * Moneda inmutable post-creación (BR-EVENT-007, Decisión PO 8.1 #7).
  * Owner derivado de la sesión (FR-EVENT-002).
  * Catálogo cerrado de 6 tipos (BR-EVENTTYPE-001).
* Lo que NO debe implementarse aquí:
  * Endpoints de update/cancel/delete (PB-P1-007).
  * Dashboard (PB-P1-008).
  * Cualquier integración IA.
  * Conversión automática de moneda.
* Supuestos a preservar:
  * El usuario `Organizer` está autenticado al entrar a `/events/new`.
  * El seed de `EventType` se ejecutó antes del primer despliegue del wizard.

---

## 19. Task Generation Notes

* Grupos de tareas sugeridos:
  * `BE` — Use cases, controllers, DTO, repositories.
  * `API` — Documentación de endpoints en `docs/16`.
  * `FE` — Wizard, steps, hooks de data fetching, persistencia local.
  * `DB` — Migración de índices, seed de `EventType`.
  * `QA` — Unit, integration, API, E2E, a11y.
  * `SEC` — Tests negativos de autorización + verificación de `Zod.strict`.
  * `OBS` — Log `event.created` y propagación de `X-Correlation-Id`.
  * `SEED` — Carga de 6 `EventType` en 4 locales.
  * `DOC` — Documentar elección semántica moneda local/USD en `docs/8.1`.
* Tareas QA requeridas: TS-01..TS-05 + NT-01..NT-07 + AUTH-TS-01..04.
* Tareas de seguridad requeridas: revisión de role guard y `.strict()`.
* Tareas seed/demo requeridas: seed de 6 `EventType` activos.
* Tareas de documentación requeridas: alineación PB-P1-006 ↔ PO 8.1 #7 en `docs/8.1`.
* Dependencias entre tareas:
  * Seed precede a `GET /api/v1/event-types`.
  * Migraciones preceden a `CreateEventUseCase`.
  * Endpoint backend precede al wizard FE (puede compartirse contrato vía OpenAPI/Zod).
* Generar `tasks.md` consolidado a nivel del backlog item: No (este backlog item agrupa una sola US).

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

La especificación cubre el alcance funcional aprobado (AC-01..AC-05, EC-01..EC-04), reutiliza la arquitectura establecida (Modular Monolith + Clean/Hexagonal + Next.js + Prisma), respeta los guardrails MVP, no introduce IA y formaliza la inmutabilidad de la moneda alineada con Decisión PO 8.1 #7 y BR-EVENT-007. La única alineación documental pendiente (backlog notes vs. PO 8.1 #7) es no bloqueante porque la decisión vigente ya está formalizada.
