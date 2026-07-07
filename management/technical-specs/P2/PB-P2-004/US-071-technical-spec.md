# Technical Specification — US-071: Recibir aviso in-app de T-7 (vista organizer)

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-071                                                                                              |
| Source User Story                    | `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`                             |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-071-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-004                                                                                           |
| Backlog Title                        | Notificación T-7 (tareas) · `Job EmitT7NotificationsJob + surface in-app`                            |
| Backlog Execution Order              | 4 (cuarto ítem dentro de P2)                                                                        |
| User Story Position in Backlog Item  | 2 de 2 (US-034 = job upstream aprobada; US-071 = surface organizer)                                 |
| Related User Stories in Backlog Item | US-034 (job, aprobada), US-071 (surface). US-072 (mark-as-read) en PB-P2-008.                        |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | PB-P1-018 (CRUD de tareas, entregada), US-034 (upstream aprobada), US-032 (deep link aprobada)     |
| Feature                              | Bandeja de notificaciones organizer con destacado T-7                                                |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-06                                                                                          |
| Last Updated                         | 2026-07-06                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-004 — Notificación T-7 (tareas)** (P2, Should Have). US-034 (job emisor) ya está aprobada y persiste dos filas `Notification` por tarea T-7 (canal `in_app` + `email_simulated`). US-071 entrega el surface organizer que consume el endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) y lo renderiza en un dropdown accesible con destacado visual para `type='task_due_soon'`.

### Execution Order Rationale

US-071 debe implementarse **después** de US-034 porque consume los `Notification(type='task_due_soon')` emitidos por el job. Sin US-034 entregada, la campanita muestra la lista vacía o los items sembrados por el seed. En paralelo con US-072 (mark-as-read) es aceptable siempre que el badge de conteo unread declare la key TanStack que US-072 invalidará al mergearse.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                                            | Suggested Order |
| ---------- | ----------------------------------------------------------------------------------------------- | --------------- |
| US-034     | Job + persistencia (`Notification` in_app + email_simulated + log estructurado)                 | 1 (entregada)   |
| US-071     | Surface organizer (dropdown + lista + deep link); consume los `Notification` emitidos por US-034 | 2               |

---

## 3. Executive Technical Summary

Implementar el surface UI de notificaciones del organizer en el frontend Next.js y **extender** el use case backend `ListMyNotificationsUseCase` con dos query params opcionales, un ordenamiento nuevo y una generación server-side del campo `link` por `type`.

Cambios backend (todos incrementales sobre `NotificationsController` + `ListMyNotificationsUseCase`, sin migración):

1. Aceptar query params opcionales `channel ∈ {in_app, email_simulated, all}` (default `in_app`, D5) y `status ∈ {unread, all}` (default `all`, D2).
2. Ordenar `ORDER BY (status='unread') DESC, sent_at DESC, id ASC` (D1).
3. Generar el campo `link` server-side por `type` según tabla D3; para `task_due_soon` → `/organizer/events/{payload.eventId}/tasks?range=7d`. Fallback `link=null` si el recurso apuntado no existe.
4. Aceptar `page` y `pageSize` con Zod validation.

Cambios frontend (nuevos componentes en `apps/web`):

1. `NotificationsBell` (botón + badge unread) y `NotificationsDropdown` (contenedor accesible con `role="menu"`/`role="listbox"`).
2. Hooks TanStack `useNotifications({ status, page, pageSize })` con key `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]` y `useUnreadNotificationsCount()` con key `['notifications', 'me', 'unreadCount']`.
3. Empty/Loading/Error states con roles ARIA (`aria-live="polite"`, `aria-busy="true"`, `role="alert"`).
4. i18n en 4 locales para copy de UI; `title`/`body` del DTO llegan localizados server-side por US-034 D6.
5. Deep link handler: navegar sólo si `link != null`; sin mark-as-read (D6, US-072).

Sin migraciones. Reutiliza índices `idx_notifications_user_status_sent` e `idx_notifications_user_unread`.

---

## 4. Scope Boundary

### In Scope

* Frontend: `NotificationsBell`, `NotificationsDropdown`, `NotificationItem`, `NotificationsEmptyState`, `NotificationsErrorBanner`, hooks TanStack, i18n en 4 locales, tests A11Y con Axe, contract test con MSW.
* Backend: extensión de `ListMyNotificationsUseCase` con query params opcionales, ordenamiento nuevo y generación server-side de `link` para `type='task_due_soon'`.
* API: contrato ampliado (query params + campo `link` según patrón) publicado en `docs/16 §34.2 / §34.3` (Documentation Alignment Required).
* Testing: TS-01..TS-13 + NT-01..NT-05 + AUTH-TS-01..02 + A11Y.

### Out of Scope

* Mark-as-read (single o bulk) — alcance US-072 (PB-P2-008).
* Endpoint de detalle `GET /api/v1/notifications/:id` — no existe hoy y no es requerido por US-071.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Realtime WebSocket / SSE — Future.
* Notificaciones broadcast cross-rol (BR-NOTIF-005).
* Filtro por `type` desde UI — Future.
* Cambios al schema `notifications` — sin migración.
* Emisión de nuevas notificaciones — alcance US-034.
* Bandeja admin cross-usuario.

### Explicit Non-Goals

* No implementar `PATCH /notifications/:notificationId/read` (US-072).
* No renderizar los registros `channel='email_simulated'` en la campanita (dedup por default `in_app`, D5).
* No hardcodear el patrón del `link` en el frontend.
* No mutar el DOM del checklist (US-032 se mantiene intacto).

---

## 5. Architecture Alignment

### Backend Architecture

* Node.js + Express + TypeScript + Prisma + PostgreSQL (`docs/14 §estructura`).
* Módulo `notifications` con Clean/Hexagonal Architecture (`docs/14 §443`).
* Reuso del `NotificationsController` (`docs/14 §989`).
* Extensión del `ListMyNotificationsUseCase` (`docs/14 §731`).
* Reuso del `NotificationOwnerPolicy` / session middleware.

### Frontend Architecture

* Next.js App Router + TypeScript + TanStack Query + Tailwind CSS + next-intl (`docs/15`).
* Client Components para el header autenticado organizer.
* MSW para contract tests (alineado con PB-P2-015 / US-121).
* Playwright + Axe para E2E y A11Y (alineado con PB-P2-016, PB-P2-019).

### Database Architecture

* PostgreSQL con Prisma (`docs/18 §18.1`).
* Sólo lectura de `notifications`.
* Reuso de índices `idx_notifications_user_status_sent` y `idx_notifications_user_unread`.
* Sin migración.

### API Architecture

* Reuso del endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`).
* Ampliación no invasiva:
  * Nuevos query params opcionales `channel`, `status`, `page`, `pageSize`.
  * Contrato `NotificationResponseDto` (`docs/16 §34.3`) enriquecido con `link` generado server-side por `type`.
* Sin nuevos endpoints.

### AI / PromptOps Architecture

`No aplica` — US-071 no invoca IA.

### Security Architecture

* Backend como source of truth de autorización (`docs/19`).
* Session-based auth mediante HTTP-only cookie.
* `NotificationOwnerPolicy` server-side (equivalente a `WHERE user_id = session.userId`).
* BR-NOTIF-005 (aislamiento) verificado en use case y por test de integración.
* No hay endpoint de detalle público; futuros endpoints de detalle deberán retornar 403 al recurso ajeno + no-revelación 404.

### Testing Architecture

* Vitest + Supertest para backend (`docs/20`).
* Vitest + Testing Library + MSW para frontend.
* Playwright + Axe para E2E + A11Y.
* Contract tests con MSW alineados con US-121.

---

## 6. Functional Interpretation

| Acceptance Criterion                        | Technical Interpretation                                                                                                                                                                                                                                     | Impacted Layer(s)                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| AC-01 — Lista paginada con destacado T-7    | Backend: query SQL con filtros `user_id + channel=in_app + (status opcional) + page/pageSize`, `ORDER BY (status='unread') DESC, sent_at DESC, id ASC`. Frontend: hook TanStack con key + `keepPreviousData`; badge unread con formato `9+`.                    | Backend, Frontend, Database                   |
| AC-02 — Click abre checklist filtrado 7d    | Backend: generar `link='/organizer/events/{payload.eventId}/tasks?range=7d'` cuando `type='task_due_soon'`. Frontend: click navega usando `useRouter().push(link)`. Si `link=null`, item sin CTA.                                                             | Backend, Frontend                             |
| AC-03 — 401 sin sesión                      | Session middleware existente rechaza sin cookie válida.                                                                                                                                                                                                       | Backend, Security                             |
| AC-04 — Aislamiento BR-NOTIF-005            | Query SQL con `WHERE user_id = session.userId`. Test de integración con 2 users.                                                                                                                                                                              | Backend, Security                             |
| AC-05 — Paginación estable                  | Backend: `ORDER BY id ASC` como tiebreaker asegura estabilidad. Frontend: `keepPreviousData=true`.                                                                                                                                                              | Backend, Frontend                             |
| AC-06 — Empty / Loading / Error con ARIA    | Frontend: componentes con `aria-live="polite"`, `aria-busy="true"`, `role="alert"`; copy localizado con `next-intl`.                                                                                                                                             | Frontend                                       |
| AC-07 — A11Y del dropdown                    | Frontend: `role="menu"` (o `role="listbox"`), navegación `Enter`/`Space`/`↑`/`↓`/`Esc`, foco visible (Tailwind + design tokens). Verificación con Axe.                                                                                                          | Frontend                                       |
| AC-08 — i18n en 4 locales                    | Frontend: catálogos `next-intl` para copy propio; `title`/`body` del DTO ya localizados server-side por US-034 D6.                                                                                                                                                 | Frontend                                       |
| AC-09 — Performance P95 < 1.5 s              | Backend: query bien indexada + `pageSize` acotado (máx 50). Frontend: cachear con TanStack + `keepPreviousData`.                                                                                                                                                | Backend, Frontend                             |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo `notifications` (existente, `docs/14 §443`). Alberga `NotificationsController`, `ListMyNotificationsUseCase`, `NotificationRepository`.

### Use Cases / Application Services

* `ListMyNotificationsUseCase` (extendido):
  * Input: `ListMyNotificationsQuery { userId, page, pageSize, status?, channel? }`.
  * Output: `PaginatedNotificationsResponse { items: NotificationResponseDto[], page, pageSize, total }`.
  * Pasos:
    1. Validar defaults: `channel ??= 'in_app'`, `page ??= 1`, `pageSize ??= 10` (máx 50).
    2. `NotificationRepository.findByUser({ userId, page, pageSize, status, channel })` con SQL `WHERE user_id=$1 AND (channel=$2 OR $2='all') AND (status=$3 OR $3='all')` `ORDER BY (status='unread') DESC, sent_at DESC, id ASC`.
    3. Mapear cada fila a `NotificationResponseDto` invocando `NotificationLinkResolver.resolve(notification)`.
    4. Retornar la página.

* `NotificationLinkResolver` (nuevo, servicio de aplicación puro):
  * Método `resolve(notification): string | null`.
  * Estrategia por tipo:
    * `task_due_soon`: si `payload.eventId` es UUID válido y el evento existe → `/organizer/events/{eventId}/tasks?range=7d`; sino `null`.
    * Otros tipos: reciben implementación en su US correspondiente; para US-071 sólo `task_due_soon` es obligatorio.
  * Tabla declarada como `LINK_STRATEGY_BY_TYPE: Record<NotificationType, LinkStrategy>` en un único lugar.
  * Para reducir N+1: la existencia del recurso se puede validar in-batch (`EventRepository.findByIds(ids)`) al inicio del use case si el `pageSize` lo justifica. Alternativa MVP: aceptar N+1 acotado por `pageSize=10`.

### Controllers / Routes

* `NotificationsController.list(req, res)`:
  * `GET /api/v1/notifications`.
  * Zod schema para query params: `{ page: coerce.number().int().min(1).default(1), pageSize: coerce.number().int().min(1).max(50).default(10), status: enum(['unread','all']).default('all'), channel: enum(['in_app','email_simulated','all']).default('in_app') }`.
  * 401 si no hay sesión (middleware existente).
  * 400 `INVALID_QUERY_PARAM` / `INVALID_PAGINATION` si Zod falla.
  * 200 con el DTO.

### DTOs / Schemas

* `NotificationResponseDto` (`docs/16 §34.3`): mantener campos existentes; el enum `type` incluye `task_due_soon` (canónico); `link: string | null` generado server-side por `NotificationLinkResolver`.
* `PaginatedNotificationsResponse`:
  ```ts
  {
    items: NotificationResponseDto[];
    page: number;
    pageSize: number;
    total: number;
    unreadCount: number; // AC-01 badge
  }
  ```
  * `unreadCount` viene de una segunda query rápida `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND status='unread' AND (channel=$2 OR $2='all')` que reutiliza `idx_notifications_user_unread` cuando `channel IN ('all','in_app')`.

### Repository / Persistence

* `NotificationRepository.findByUser(query)`: `prisma.notification.findMany` o `prisma.$queryRaw` con el ordenamiento SQL descrito.
* `NotificationRepository.countUnreadByUser({ userId, channel })`: reutiliza `idx_notifications_user_unread` con filtro `channel` opcional.
* `EventRepository.findByIds(ids: string[]): Promise<Map<string, Event>>` (existente o mínima extensión) para validar existencia in-batch en el resolver de links.

### Validation Rules

* VR-01 (401) por middleware.
* VR-03 / VR-04 / VR-05 por Zod.
* VR-02 (aislamiento) por `WHERE user_id = session.userId` en el use case.

### Error Handling

* Errores 4xx retornan `{ code, message }` estándar EventFlow.
* Errores 5xx loggeados con `correlationId` (patrón existente `docs/14`).
* `NotificationLinkResolver` nunca lanza: en caso de payload malformado retorna `null`.

### Transactions

* No requeridas (read-only).

### Observability

* Correlation ID por request (patrón backend estándar).
* Sin log adicional específico para este endpoint (lectura no crítica, NFR-OBS-006).

---

## 8. Frontend Technical Design

### Routes / Pages

* Header persistente del layout autenticado organizer: `apps/web/app/(authenticated)/organizer/layout.tsx` (o equivalente según `docs/15`). El `NotificationsBell` se monta como slot del header, junto al menú de usuario.

### Components

* `NotificationsBell` (Client Component):
  * Botón con `aria-label` localizado ("Notificaciones") y badge unread.
  * Estado abierto/cerrado; gestiona `useFloating`/`Popover` (Radix o equivalente aprobado).
* `NotificationsDropdown`:
  * `role="menu"` (o `role="listbox"` según design system).
  * Contiene `NotificationsList`, `NotificationsFilterToggle` (D2), `NotificationsLoadMore`.
  * Navegación por teclado (`Enter`, `Space`, `↑`, `↓`, `Esc`).
* `NotificationItem`:
  * Renderiza `title`, `body`, hora relativa (`sent_at` con `Intl.RelativeTimeFormat` respetando locale).
  * Destacado visual si `type='task_due_soon'` (color/badge del design system).
  * Click → `useRouter().push(link)` sólo si `link != null`.
  * Sin CTA si `link=null` (`aria-disabled="true"`).
* `NotificationsEmptyState`: `aria-live="polite"`.
* `NotificationsErrorBanner`: `role="alert"` con botón "Reintentar" que invoca `refetch()`.
* `UnreadBadge`: encapsula el formato `9+`.

### Forms

`No aplica`.

### State Management

* Hook `useNotifications({ status, page, pageSize })`:
  * Key: `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]`.
  * `refetchOnWindowFocus: true`, `refetchInterval: 60_000`, `keepPreviousData: true`.
* Hook `useUnreadNotificationsCount()`:
  * Key: `['notifications', 'me', 'unreadCount']`.
  * Derivado del `PaginatedNotificationsResponse.unreadCount` (dedup con la key principal) o segundo query dedicado si la ergonomía lo justifica.
* Invalidación por US-072: US-072 declara `queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] })` al mergearse su mutation; US-071 sólo consume, no invalida.

### Data Fetching

* Cliente `notificationsApi.list({ page, pageSize, status, channel })` en `apps/web/lib/api/notifications.ts`.
* Zod schema del response tipado desde el DTO backend.
* Errores mapeados a estados TanStack (`isError`, `error`).

### Loading / Empty / Error / Success States

* Loading: skeleton con `aria-busy="true"`.
* Empty: `EmptyState` con copy `t('notifications.empty')`.
* Error: `role="alert"` con botón Retry.
* Success: lista + footer con "Cargar más" cuando `page * pageSize < total`.

### Accessibility

* Cumplir NFR-A11Y-001..003.
* Navegación teclado, foco visible, roles correctos.
* Verificación con Axe (Playwright plugin) sin violaciones críticas.

### i18n

* `next-intl` con catálogos en 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`).
* Keys mínimas: `notifications.title`, `notifications.empty`, `notifications.error`, `notifications.loadMore`, `notifications.unreadOnly`, `notifications.showAll`, `notifications.bellAria`, `notifications.itemAria`.

---

## 9. API Contract Design

| Method | Endpoint                   | Purpose                                                                    | Auth Required | Request                                                                                                                       | Response                                       | Error Cases                                            |
| ------ | -------------------------- | -------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| GET    | `/api/v1/notifications`    | Listar notifs del usuario autenticado con paginación, filtro opcional y `link` generado. | Sí            | Query params: `page` (int ≥ 1, default 1), `pageSize` (int 1–50, default 10), `status` (`unread`\|`all`, default `all`), `channel` (`in_app`\|`email_simulated`\|`all`, default `in_app`). | 200 `PaginatedNotificationsResponse`.           | 400 `INVALID_QUERY_PARAM` / `INVALID_PAGINATION`; 401. |

Notas del contrato:

* `NotificationResponseDto` corrige el enum `type` para incluir `task_due_soon` (Documentation Alignment con `docs/16 §34.3`).
* `link` sigue la tabla D3; `null` si el recurso apuntado no existe.
* `PaginatedNotificationsResponse.unreadCount` es la fuente del badge.

---

## 10. Database / Prisma Design

### Models Impacted

| Model        | Operación | Detalle                                                                             |
| ------------ | --------- | ----------------------------------------------------------------------------------- |
| Notification | SELECT    | `WHERE user_id + (channel filter) + (status filter)` + `ORDER BY + LIMIT + OFFSET`. |
| Event        | SELECT    | Lookup por IDs para validar `payload.eventId` en `NotificationLinkResolver`.        |

### Fields / Columns

Sin cambios. Se leen `notifications.id, user_id, type, payload, channel, language_code, status, sent_at, read_at, created_at`.

### Relations

Sin cambios.

### Indexes

* Uso de `idx_notifications_user_status_sent (user_id, status, sent_at DESC)` para el listado ordenado + filtro `channel` (se aplica como filtro adicional in-memory o con reordenamiento; la selectividad por `user_id` mantiene el costo bajo).
* Uso de `idx_notifications_user_unread (user_id) WHERE status='unread'` para `unreadCount`.
* Sin índice nuevo en MVP. Si en QA emerge presión por el filtro `channel`, evaluar índice `idx_notifications_user_channel_sent (user_id, channel, sent_at DESC)` en Future vía ADR.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones en US-071.**

### Seed Impact

* No requiere seed nuevo: US-034 SEED-001 ya inserta al menos 1 tarea T-7 demo y los `Notification` correspondientes al correr el job.
* Opcional: seed adicional con notifs de otros tipos (`quote_received`, `booking_confirmed`) para validar la bandeja unificada; sin embargo el testing con MSW y factories dedicadas cubre este caso sin cambios de seed.

---

## 11. AI / PromptOps Design

`No aplica` — US-071 no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

* Session-based auth mediante HTTP-only cookie (`docs/19`).

### Authorization

* Middleware existente valida sesión y setea `req.session.userId`.
* `NotificationOwnerPolicy`: aplicado implícitamente por el `WHERE user_id = session.userId` en el use case.

### Ownership Rules

* Todas las lecturas restringidas al `session.userId`.

### Role Rules

* Cualquier rol autenticado puede consumir su propia bandeja (`docs/16 §34.2`: organizer/vendor/admin). US-071 se enfoca en organizer; el mismo endpoint sirve a otros roles sin cambios.

### Negative Authorization Scenarios

* Sin sesión → 401 (VR-01, AC-03, TS-02).
* Admin → 200 pero sólo sus notifs (AC-04 extendido, AUTH-TS-02).
* Intento de query param inválido → 400 (VR-03..VR-05, NT-03..NT-05).

### Audit Requirements

`No aplica` — endpoint de lectura no crítico.

### Sensitive Data Handling

* El DTO no expone `payload` completo; sólo `title`, `body`, `link`, `readAt`, `emailSimulated`, `type`, `createdAt` (según `docs/16 §34.3`).
* El `payload` completo permanece server-side.
* Sin PII adicional expuesta.

---

## 13. Testing Strategy

### Unit Tests

* Backend:
  * UT-01: `ListMyNotificationsUseCase` con 0 notifs → `items=[]`, `total=0`, `unreadCount=0`.
  * UT-02: 3 notifs `unread` + 2 `read` → orden `unread first`.
  * UT-03: Query param `status=unread` filtra correctamente.
  * UT-04: Query param `channel=in_app` filtra correctamente.
  * UT-05: `NotificationLinkResolver.resolve` genera link correcto para `task_due_soon` con `payload.eventId` válido.
  * UT-06: `NotificationLinkResolver.resolve` retorna `null` si `payload.eventId` inexistente.
  * UT-07: `unreadCount` reporta el conteo correcto con `channel=in_app`.

* Frontend:
  * UT-08: `NotificationsBell` renderiza badge `9+` cuando `unreadCount > 9`.
  * UT-09: `NotificationItem` con `link=null` deshabilita CTA (`aria-disabled="true"`).
  * UT-10: `NotificationsFilterToggle` alterna entre `status=all` y `status=unread`.

### Integration Tests

* IT-01 (backend, Supertest): AC-01 — orden `unread first, sent_at DESC, id ASC` con 25 notifs seed.
* IT-02: AC-05 — paginación estable page 1..3 sin duplicados.
* IT-03: AC-04 + AUTH-TS-01/02 — dos users; cada uno ve sólo sus notifs; admin no ve las de otros.
* IT-04: TS-06 / EC-05 — una tarea T-7 (2 filas emitidas por US-034) aparece 1 vez con default `channel=in_app`.
* IT-05: TS-07 — deep link `task_due_soon` retorna `/organizer/events/{eventId}/tasks?range=7d`.
* IT-06: TS-08 / EC-03 — evento eliminado → `link=null`.
* IT-07: NT-03..NT-05 — Zod rechaza query params inválidos.

### API Tests

Cubiertos por Supertest en IT-01..IT-07.

### E2E Tests

* E2E-01 (Playwright): abrir campanita, ver 3 notifs (una T-7 destacada), click sobre T-7 navega a `/organizer/events/{eventId}/tasks?range=7d`. Confirma AC-01, AC-02.
* E2E-02: evento en `completed` → navegación exitosa; US-032 muestra banner read-only (TS-13, EC-02).

### Security Tests

* SEC-T-01: AUTH-TS-02 admin invocando `GET /api/v1/notifications` sólo ve sus notifs.
* SEC-T-02: intento sin cookie de sesión → 401 (IT ya cubre; se etiqueta como `@security` para gating).

### Accessibility Tests

* A11Y-01 (Playwright + `@axe-core/playwright`): dropdown abierto sin violaciones críticas (AC-07, TS-10).
* A11Y-02: navegación completa con teclado (`Tab`, `Enter`, `↑`, `↓`, `Esc`).
* A11Y-03: `aria-live="polite"` en empty, `aria-busy="true"` en loading, `role="alert"` en error (AC-06).

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: reusar seed de US-034 (tarea T-7 demo). Verificar que la notif aparece en la campanita del organizer demo (`u_demo_organizer_1`) al abrir la sesión.

### CI Checks

* Lint, type-check, tests (Vitest, Supertest, Playwright).
* Cobertura ≥ 50% en el módulo `notifications` frontend + backend (PB-P2-014).

---

## 14. Observability & Audit

### Logs

* Sin logs específicos: lectura no crítica (NFR-OBS-006).
* Middleware estándar registra request + `correlationId`.

### Correlation ID

* Presente por request (patrón `docs/14`).

### AdminAction

`No aplica`.

### Error Tracking

* Errores 5xx loggeados; sin integración APM (NFR-OBS-006).

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* No requiere seed nuevo. Reusa el seed generado por US-034 SEED-001 (tarea T-7 demo).

### Demo Scenario Supported

* Demo end-to-end: correr `EmitT7NotificationsJob` (US-034) → login como `u_demo_organizer_1` → abrir campanita → ver notif T-7 destacada → click → aterrizar en `/organizer/events/{eventId}/tasks?range=7d`.

### Reset / Isolation Notes

* `SeedResetJob` (`docs/14 §23.2`) reset compartido con US-034.

---

## 16. Documentation Alignment Required

| Document / Source                   | Conflict                                                                          | Current Decision                                                                                       | Recommended Action                                                                                                            | Blocks Implementation? |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §34.3` (enum `type`)       | Declara `task_due`; el canónico es `task_due_soon`.                                | `task_due_soon` (docs/6, docs/18, US-034 aprobada).                                                     | Corregir enum en `docs/16 §34.3`.                                                                                             | No                     |
| `docs/16 §34.2` (query params)      | No expone `channel` ni `status` ni `page`/`pageSize` explícitos.                   | D5 (`channel` default `in_app`) + D2 (`status` default `all`) + paginación estándar.                    | Ampliar tabla `Endpoints` en `docs/16 §34.2` con los 4 query params opcionales y sus defaults.                                 | No                     |
| `docs/16 §34.3` (`link`)            | El DTO declara `link: string \| null` sin patrón.                                  | D3 formaliza tabla `link generation by type`, empezando por `task_due_soon`.                            | Agregar tabla `link generation by type` en `docs/16 §34.3`.                                                                    | No                     |
| `docs/10 §NFR-OBS-001` / US previa  | US-071 anterior declaraba `NFR-OBS-001` incorrectamente.                           | NFR canónicos: `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.                                          | Ya corregido en la US-071 refinada; sin acción adicional.                                                                     | No                     |
| `docs/14 §Notifications`            | Sin conflicto directo; conviene documentar el nuevo query param `channel`.        | Query param `channel` con default `in_app`.                                                             | Nota opcional en `docs/14 §Notifications` describiendo el default.                                                             | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                       | Impact                                                            | Mitigation                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N+1 al validar existencia de `payload.eventId` en `NotificationLinkResolver`                                | Latencia adicional en el listado                                  | Batch lookup por `pageSize` (máx 50). Test PERF con 100 notifs seed (TS-09).                                                                                                            |
| Filtro `channel=in_app` sin índice físico                                                                  | Query lenta con dataset grande                                    | Reuso de `idx_notifications_user_status_sent` con selectividad alta por `user_id`; si presión real en QA, Future ADR para índice dedicado.                                              |
| Cambio del enum `type` en `docs/16` no aplicado por otro cliente                                            | Consumidores externos con enum obsoleto                            | La corrección es aditiva (agrega `task_due_soon`); los clientes que usan `task_due` deberán actualizarse. Documentation Alignment.                                                       |
| `link` server-side rompe si el design system cambia rutas del frontend                                     | Deep link roto en demo                                             | Centralizar rutas en `LINK_STRATEGY_BY_TYPE`. Contract test que valida el formato exacto (`/organizer/events/:eventId/tasks?range=7d`).                                                  |
| Badge unread desactualizado hasta el próximo `refetchInterval`                                              | UX sube 60 s de latencia perceptible entre acciones               | `refetchOnWindowFocus=true` mitiga; US-072 dispara invalidación explícita.                                                                                                              |
| Dropdown A11Y falla en tests Axe por interacciones no cubiertas                                             | CI rojo en A11Y                                                    | Reusar patrón Radix Menu con roles correctos; QA A11Y-01..A11Y-03.                                                                                                                     |
| i18n missing keys en algún locale                                                                           | Copy en fallback (en) sorprende al usuario                        | CI check de `next-intl` que falla si faltan keys en los 4 locales.                                                                                                                      |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    modules/
      notifications/
        application/
          use-cases/
            list-my-notifications.use-case.ts        # extender
            list-my-notifications.use-case.spec.ts   # extender
          services/
            notification-link-resolver.ts             # nuevo
            notification-link-resolver.spec.ts        # nuevo
        infrastructure/
          controllers/
            notifications.controller.ts               # extender query params
          repositories/
            notification.repository.ts                # extender findByUser + countUnreadByUser
        schemas/
          list-notifications.query.schema.ts          # nuevo (Zod)
      event-planning/
        infrastructure/
          repositories/
            event.repository.ts                       # agregar findByIds si no existe

apps/web/
  app/
    (authenticated)/organizer/layout.tsx              # montar NotificationsBell
  components/
    notifications/
      NotificationsBell.tsx                           # nuevo
      NotificationsDropdown.tsx                       # nuevo
      NotificationsList.tsx                           # nuevo
      NotificationItem.tsx                            # nuevo
      NotificationsEmptyState.tsx                     # nuevo
      NotificationsErrorBanner.tsx                    # nuevo
      NotificationsFilterToggle.tsx                   # nuevo
      UnreadBadge.tsx                                 # nuevo
  hooks/
    useNotifications.ts                               # nuevo
    useUnreadNotificationsCount.ts                    # nuevo
  lib/
    api/
      notifications.ts                                # nuevo (client)
  messages/
    en/notifications.json                             # nuevo
    es-LATAM/notifications.json                       # nuevo
    es-ES/notifications.json                          # nuevo
    pt/notifications.json                             # nuevo
tests/
  e2e/
    notifications-bell.spec.ts                        # nuevo (Playwright + Axe)
  contract/
    notifications-list.contract.spec.ts               # nuevo (MSW)
```

### Orden de implementación recomendado

1. Backend: `list-notifications.query.schema.ts` (Zod).
2. Backend: `NotificationRepository.findByUser` + `countUnreadByUser` con SQL nuevo.
3. Backend: `NotificationLinkResolver` con estrategia `task_due_soon`.
4. Backend: extensión de `ListMyNotificationsUseCase` + `NotificationsController`.
5. Backend: UT-01..UT-07.
6. Backend: IT-01..IT-07.
7. Frontend: `notificationsApi.list` client + tipos.
8. Frontend: hooks `useNotifications` + `useUnreadNotificationsCount`.
9. Frontend: componentes `NotificationsBell` + dropdown accesible + i18n en 4 locales.
10. Frontend: UT-08..UT-10 + A11Y-01..A11Y-03.
11. E2E: E2E-01, E2E-02.
12. Contract: contract test con MSW.

### Decisiones que no deben reabrirse

* Endpoint `GET /api/v1/notifications` sin nuevos endpoints.
* Sin migración.
* Default `channel=in_app` (D5).
* Ordenamiento `unread first, sent_at DESC, id ASC` (D1).
* Patrón `link` server-side (D3).
* Sin mark-as-read (D6).

### Lo que no se debe implementar

* Mutations (US-072).
* Realtime WebSocket.
* Filtro por `type` desde UI.
* Endpoint de detalle `GET /api/v1/notifications/:id`.
* Cambios de schema Prisma.
* Cambios al `docs/16` en el mismo PR de la implementación (Documentation Alignment vive como PR aparte).

### Asunciones a preservar

* Session middleware + HTTP-only cookie ya operan.
* `docs/16 §34.3 NotificationResponseDto` es fuente del contrato; corregir enum `task_due_soon` como parte de la implementación.
* `title` y `body` llegan localizados server-side por US-034 D6.
* Single-process MVP (`docs/14 §23.1`).

---

## 19. Task Generation Notes

### Suggested task groups

1. **Backend — foundations & schemas** (Zod, tipos).
2. **Backend — repository & resolver** (findByUser, countUnreadByUser, NotificationLinkResolver).
3. **Backend — use case & controller** (extensión, ordenamiento, DTO enriquecido).
4. **Frontend — API client & hooks** (notificationsApi + TanStack).
5. **Frontend — components & A11Y** (Bell, Dropdown, Item, EmptyState, ErrorBanner, FilterToggle, Badge).
6. **Frontend — i18n** (4 catálogos).
7. **Testing — backend UT/IT**.
8. **Testing — frontend UT/A11Y**.
9. **Testing — E2E + contract**.
10. **Documentation Alignment** (docs/16 §34.2/§34.3).

### Required QA tasks

* UT (backend + frontend), IT, E2E, A11Y, contract, PERF.

### Required security tasks

* SEC-T-01 (admin aislamiento), SEC-T-02 (401 sin sesión), etiquetado `@security` para gating CI.

### Required seed/demo tasks

* Reusa seed de US-034; sin tareas propias.

### Required documentation tasks

* 3 ítems en `docs/16` (enum type, query params, tabla `link generation by type`).

### Dependencies between tasks

```
Zod schema → Repository → Resolver → Use case → Controller → Backend tests
notificationsApi client → Hooks → Components → i18n → Frontend tests
Backend contract → Contract test (MSW)
Frontend components → E2E + A11Y
```

### Consolidated tasks.md guidance

Sí: cuando US-071 mergee, generar un `tasks.md` consolidado a nivel `PB-P2-004` que combine tareas de US-034 (ya en `management/development-tasks/P2/PB-P2-004/US-034-development-tasks.md`) y de US-071, con prefijos `[US-034]` y `[US-071]`.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | Pass   |
| DB impact clear                                          | Pass   |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La Technical Specification materializa las 6 decisiones D1–D6 sin reabrirlas, define el contrato exacto del endpoint ampliado (query params + `link` server-side + `unreadCount`), especifica los componentes frontend accesibles con navegación por teclado y roles ARIA, y describe la estrategia de testing multi-capa (UT + IT + E2E + A11Y + contract + PERF). No hay migraciones, no se introduce scope creep y las 5 alineaciones documentales son no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-004/US-071-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-004
Execution Order: 4 (cuarto ítem de P2, US-071 = posición 2 de 2 dentro del backlog item)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-004, P2, posición 2 de 2 — US-071 después de US-034).
Decision Resolution artifact used: Yes (`management/user-stories/decision-resolutions/US-071-decision-resolution.md`).
Documentation alignment warnings: 5 ítems no bloqueantes (ver §16).
