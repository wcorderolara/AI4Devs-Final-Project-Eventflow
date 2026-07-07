# Technical Specification — US-072: Marcar notificación como leída

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-072                                                                                              |
| Source User Story                    | `management/user-stories/US-072-mark-notification-read.md`                                          |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-072-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-008                                                                                           |
| Backlog Title                        | Marcar notificaciones como leídas (single + bulk)                                                    |
| Backlog Execution Order              | 8 (octavo ítem de P2)                                                                               |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-072                                                                                              |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | US-034/068/069/070 (upstream — emisores), US-071 (surface consumidor aprobada)                     |
| Feature                              | Mark notification as read (single + all)                                                             |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-07                                                                                          |
| Last Updated                         | 2026-07-07                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-008 — Marcar notificaciones como leídas (single + bulk)** (P2, Should Have). Materializa `FR-NOTIF-002` (`docs/9 §521`), `UC-NOTIF-002` (`docs/8 §675`), `BR-NOTIF-004` (`docs/4 §391`). Cierra el ciclo unread → read consumido por US-071 (surface aprobada).

### Execution Order Rationale

Se implementa después de US-071 (surface aprobada declara las query keys canónicas) y en paralelo con US-068/069/070 emisores. Sin US-072 mergeada, el badge de US-071 sólo cambia por refetch periódico y no ofrece control explícito.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                                        | Suggested Order |
| ---------- | --------------------------------------------------------------------------- | --------------- |
| US-072     | Mutations backend + hooks frontend con optimistic UI                        | 1               |

---

## 3. Executive Technical Summary

Implementar dos endpoints canónicos definidos en `docs/16 §34.2`:

* `PATCH /api/v1/notifications/:notificationId/read` (mark single).
* `POST /api/v1/notifications/mark-all-read` con query param opcional `channel ∈ {in_app, email_simulated, all}` default `in_app` (D4, mark all unread del usuario filtrado por channel).

Ambos endpoints validan ownership vía `NotificationOwnerPolicy` (reuso US-071), aplican no-revelación 404 para ajenas (`docs/19`), retornan `204 No Content` (D5).

Backend: extender `MarkNotificationAsReadUseCase` (existente, `docs/14 §730`) e implementar `MarkAllNotificationsAsReadUseCase` (nuevo). Zod validation para path/query params.

Frontend: dos hooks TanStack (`useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`) con optimistic + rollback + invalidación de las query keys de US-071. Dos componentes botón (`MarkAsReadButton` por item, `MarkAllAsReadButton` en footer del dropdown). i18n en 4 locales.

Sin migración, sin schema change, sin realtime. Ventana de inconsistencia entre tabs = 60s (D3).

---

## 4. Scope Boundary

### In Scope

* Backend: `MarkNotificationAsReadUseCase` (extender), `MarkAllNotificationsAsReadUseCase` (nuevo), controllers, Zod schemas, no-revelación 404.
* Frontend: 2 hooks TanStack con optimistic UI + rollback, 2 componentes botón, i18n × 4 locales.
* Testing: UT + IT + optimistic rollback + E2E + A11Y + contract MSW.
* Documentation Alignment: 3 ítems.

### Out of Scope

* Bulk selectivo `mark-many-read` con lista de IDs (Future US).
* Mark-as-unread (Future).
* Auto-mark-as-read al click (US-071 D6 lo prohíbe explícitamente).
* Realtime WebSocket/SSE (D3).
* Cambios al `NotificationResponseDto`.
* Cambios al schema Prisma.
* Endpoints nuevos fuera de `docs/16 §34.2`.

### Explicit Non-Goals

* Modificar el patrón consumidor de US-071.
* Agregar dispatch por rol al `NotificationLinkResolver` (US-070 D3 ya lo hizo).
* Introducir `AdminAction` audit para el mark-as-read (no crítico).
* Batch API distinto al `mark-all-read` canónico.

---

## 5. Architecture Alignment

### Backend Architecture

* Módulo `notifications` (`docs/14 §443`) aloja los use cases y controller.
* Reuso de `NotificationOwnerPolicy` (US-071), `NotificationRepository`.
* Sin event bus. Single-statement UPDATE atómico (transacción implícita de PG).

### Frontend Architecture

* Next.js + TanStack Query + Tailwind + next-intl (`docs/15`).
* Client Components (dropdown de US-071).
* MSW para contract tests.

### Database Architecture

* PostgreSQL con Prisma. UPDATE atómico. Reuso de índices.

### API Architecture

* Endpoints canónicos de `docs/16 §34.2` (verbos ratificados por D1).

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Backend como source of truth de autorización (`docs/19`).
* `NotificationOwnerPolicy` server-side.
* No-revelación 404 para ajenas.
* Sin escalada de privilegios (admin sólo marca sus notifs).

### Testing Architecture

* Vitest + Supertest (backend).
* Vitest + Testing Library + MSW (frontend).
* Playwright + Axe (E2E + A11Y).

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                                          | Impacted Layer(s)               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Mark single                | `PATCH .../read` con ownership + UPDATE atómico + 204.                                                                            | Backend, Database                |
| AC-02 — Mark all                   | `POST /mark-all-read?channel=in_app` con UPDATE bulk filtrado.                                                                    | Backend, Database                |
| AC-03 — 401 sin sesión             | Middleware existente.                                                                                                              | Backend, Security                |
| AC-04 — Ajena → 404                | Ownership check + no-revelación.                                                                                                   | Backend, Security                |
| AC-05 — Inexistente → 404          | UPDATE con `RETURNING` vacío + verificación existencia.                                                                            | Backend                          |
| AC-06 — Idempotencia               | UPDATE incondicional o con WHERE `read_at IS NULL`; 204 en ambos casos.                                                            | Backend                          |
| AC-07 — Optimistic rollback        | TanStack `onError` restaura snapshot + toast.                                                                                      | Frontend                         |
| AC-08 — Performance                | Índice `idx_notifications_user_unread` optimiza `mark-all-read`.                                                                    | Backend, Database                |
| AC-09 — A11Y del botón             | Botones con `aria-label` localizado, foco visible, verificación Axe.                                                              | Frontend                         |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo `notifications` (`docs/14 §443`).

### Use Cases / Application Services

* `MarkNotificationAsReadUseCase` (extender, `docs/14 §730`):
  * Input: `{ notificationId: uuid, userId: uuid }`.
  * Pasos:
    1. Ownership check: `SELECT 1 FROM notifications WHERE id=$1 AND user_id=$2 LIMIT 1`.
    2. Si no existe (para ese user) → throw `NotificationNotFoundError` (404, no-revelación).
    3. UPDATE: `UPDATE notifications SET read_at=now(), status='read' WHERE id=$1 AND user_id=$2 AND read_at IS NULL`.
    4. Response 204 (independiente del `affected` count — idempotencia).

* `MarkAllNotificationsAsReadUseCase` (nuevo):
  * Input: `{ userId: uuid, channel: 'in_app' | 'email_simulated' | 'all' }` (default `in_app`).
  * Pasos:
    1. UPDATE: `UPDATE notifications SET read_at=now(), status='read' WHERE user_id=$1 AND status='unread' AND (channel=$2 OR $2='all')`.
    2. Response 204.
  * Log opcional `info` estructurado con `{ userId, channel, affected }` para métrica auditable.

### Controllers / Routes

* `NotificationsController.markAsRead(req, res)`:
  * `PATCH /api/v1/notifications/:notificationId/read`.
  * Zod: `params: z.object({ notificationId: z.string().uuid() })`.
  * Middleware sesión → 401 si falta.
  * Invoca use case; captura `NotificationNotFoundError` → 404.
  * Respuesta `res.status(204).send()`.

* `NotificationsController.markAllAsRead(req, res)`:
  * `POST /api/v1/notifications/mark-all-read`.
  * Zod: `query: z.object({ channel: z.enum(['in_app', 'email_simulated', 'all']).default('in_app') })`.
  * Middleware sesión.
  * Invoca use case.
  * Respuesta 204.

### DTOs / Schemas

* Sin DTO de response (204 no tiene body).
* Zod schemas para path/query params.

### Repository / Persistence

* `NotificationRepository.findByIdForUser(id, userId): Promise<Notification | null>` (para ownership check).
* `NotificationRepository.markAsRead(id, userId): Promise<{ affected: number }>` (UPDATE).
* `NotificationRepository.markAllAsReadForUser(userId, channel): Promise<{ affected: number }>` (UPDATE bulk).

### Validation Rules

* VR-01..VR-04 aplicadas en controller + use case.

### Error Handling

* 401 por middleware.
* 400 por Zod (INVALID_PATH_PARAM, INVALID_QUERY_PARAM).
* 404 por use case (no-revelación).
* 5xx propagan al middleware estándar.

### Transactions

* UPDATE atómico single-statement (transacción implícita PG). Sin `prisma.$transaction` explícita.

### Observability

* Correlation ID por request (middleware estándar).
* Log opcional `info` para `mark-all-read` con `{ userId, channel, affected, correlationId }`.

---

## 8. Frontend Technical Design

### Routes / Pages

* `NotificationsDropdown` de US-071 (sin rutas nuevas).

### Components

* `MarkAsReadButton` (Client Component):
  * Props: `{ notificationId: string, disabled?: boolean }`.
  * Renderiza icono ✓ o texto localizado.
  * `onClick` invoca `useMarkNotificationAsRead().mutate(notificationId)`.
  * `aria-label` localizado.
* `MarkAllAsReadButton` (Client Component):
  * Renderiza en footer del dropdown.
  * `onClick` invoca `useMarkAllNotificationsAsRead().mutate({ channel: 'in_app' })`.
  * `aria-label` localizado.

### Forms

`No aplica`.

### State Management

* Hook `useMarkNotificationAsRead()`:
  * `useMutation({
      mutationFn: (id) => notificationsApi.markAsRead(id),
      onMutate: async (id) => {
        await queryClient.cancelQueries(['notifications', 'me']);
        const previous = queryClient.getQueryData(['notifications', 'me']);
        queryClient.setQueryData(['notifications', 'me'], (old) =>
          old && { ...old, items: old.items.map(n => n.id === id ? { ...n, readAt: new Date().toISOString(), status: 'read' } : n) }
        );
        queryClient.setQueryData(['notifications', 'me', 'unreadCount'], (old) => Math.max(0, (old ?? 0) - 1));
        return { previous };
      },
      onError: (_err, _id, ctx) => {
        queryClient.setQueryData(['notifications', 'me'], ctx?.previous);
        toast.error(t('notifications.markErrorToast'));
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications', 'me']);
      },
    })`.
* Hook `useMarkAllNotificationsAsRead()`:
  * Similar; `onMutate` snapshotea todas las queries `['notifications', 'me', …]` y setea unreadCount = 0.
  * `onError` restaura snapshot.
  * `onSuccess` invalida broadly.

### Data Fetching

* `notificationsApi.markAsRead(id: string): Promise<void>` — `PATCH /api/v1/notifications/${id}/read`.
* `notificationsApi.markAllAsRead(channel: 'in_app' | 'email_simulated' | 'all' = 'in_app'): Promise<void>` — `POST /api/v1/notifications/mark-all-read${channel !== 'in_app' ? '?channel=' + channel : ''}`.

### Loading / Empty / Error / Success States

* Loading: mutation en flight puede mostrar spinner inline (opcional; el optimistic UI suele bastar).
* Success: cambio visual + toast opcional.
* Error: revierte cache + `role="alert"` toast localizado.

### Accessibility

* Cumplir NFR-A11Y-001..003.
* Botones con `aria-label` localizado (`notifications.markAsRead`, `notifications.markAllAsRead`).
* Foco visible.
* Verificación con Axe.

### i18n

* `next-intl` con 4 catálogos:
  * `notifications.markAsRead` (label + aria).
  * `notifications.markAllAsRead` (label + aria).
  * `notifications.markSuccessToast` (opcional).
  * `notifications.markErrorToast`.

---

## 9. API Contract Design

| Method | Endpoint                                            | Purpose                                            | Auth Required | Request                                                                                                     | Response                | Error Cases                                                            |
| ------ | --------------------------------------------------- | -------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| PATCH  | `/api/v1/notifications/:notificationId/read`         | Mark single como leída.                             | Sí             | Path: `notificationId` (UUID). Sin body.                                                                    | 204 No Content.          | 400 INVALID_PATH_PARAM; 401; 404 (no-revelación para ajenas y ausentes). |
| POST   | `/api/v1/notifications/mark-all-read`                | Mark all unread del usuario filtrado por channel.    | Sí             | Query opcional: `channel ∈ {in_app, email_simulated, all}` default `in_app`. Sin body.                       | 204 No Content.          | 400 INVALID_QUERY_PARAM; 401.                                          |

Documentation Alignment: la tabla `docs/16 §34.2` debe agregar el query param `channel` para `POST /mark-all-read` (D4).

---

## 10. Database / Prisma Design

### Models Impacted

| Model         | Operación | Detalle                                                                    |
| ------------- | --------- | -------------------------------------------------------------------------- |
| Notification  | UPDATE    | `read_at=now(), status='read'` con filtros por ownership y channel.        |
| Notification  | SELECT    | Ownership check en `mark single` (para 404 no-revelación).                 |

### Fields / Columns

Sin cambios. Se usan los campos existentes: `id, user_id, status, channel, read_at`.

### Relations

Sin cambios.

### Indexes

* Reuso de `idx_notifications_user_unread (user_id) WHERE status='unread'` (docs/18 §18.1) para el filtro del `mark-all-read`.
* Reuso de `idx_notifications_user_status_sent` para el ownership check.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones.**

### Seed Impact

* Reuso del seed de US-034/US-068..US-070; verificación en QA-005 (unread demo ≥ 1 tras seed).

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

* Session-based auth mediante HTTP-only cookie (`docs/19`).

### Authorization

* `NotificationOwnerPolicy` (reuso US-071).

### Ownership Rules

* Todas las mutations restringidas al `session.userId`.

### Role Rules

* Todos los roles autenticados pueden marcar sus notifs (organizer, vendor, admin).
* Admin no puede marcar notifs de otros (BR-NOTIF-005 explicit).

### Negative Authorization Scenarios

* Sin sesión → 401.
* Notif ajena → 404 (no-revelación).
* Query param inválido → 400.

### Audit Requirements

* Opcional: log `info` estructurado para `mark-all-read` con `{ userId, channel, affected }` como métrica auditable.

### Sensitive Data Handling

* Sin PII en logs (permitido sólo `userId, channel, affected, correlationId`).

---

## 13. Testing Strategy

### Unit Tests

* Backend:
  * UT-01: `MarkNotificationAsReadUseCase` con notif propia unread → UPDATE aplicado.
  * UT-02: notif propia ya leída → 204 idempotente.
  * UT-03: notif ajena → `NotificationNotFoundError` (404).
  * UT-04: notif inexistente → `NotificationNotFoundError`.
  * UT-05: `MarkAllNotificationsAsReadUseCase` con default `in_app` filtra correctamente (3 in_app + 2 email_simulated → sólo 3 read).
  * UT-06: `channel='all'` marca todas.
  * UT-07: `channel='email_simulated'` marca sólo esas.

* Frontend:
  * UT-08: `useMarkNotificationAsRead` optimistic + rollback ante mock 500.
  * UT-09: `useMarkAllNotificationsAsRead` optimistic + rollback ante mock 500.
  * UT-10: `MarkAsReadButton` renderiza `aria-label` correcto por locale.

### Integration Tests

* IT-01: PATCH mark single → 204; `read_at != null, status='read'`.
* IT-02: PATCH sobre ya leída → 204 sin cambios.
* IT-03: PATCH sobre ajena → 404 (no-revelación).
* IT-04: PATCH sobre inexistente → 404.
* IT-05: POST mark-all-read default `in_app` con mix de channels → sólo in_app queda read.
* IT-06: POST `?channel=all` → todas queda read.
* IT-07: POST `?channel=email_simulated` → sólo esas quedan read.
* IT-08: Sin sesión → 401 en ambos endpoints.
* IT-09: Zod inválido → 400 (`?channel=slack`, `:notificationId=abc`).

### API Tests

Cubiertos por Supertest en IT-01..IT-09.

### E2E Tests

* E2E-01 (Playwright): dropdown con 3 unread → click "Marcar todas como leídas" → badge = 0; items grisados.
* E2E-02: click "Marcar leída" del primer item → badge decrementa a 2; item cambia visualmente.
* E2E-03: mock backend 500 → toast de error; badge no cambia.

### Security Tests

* SEC-T-01: aislamiento — 2 users; user A intenta PATCH sobre notif de user B → 404 (no-revelación); notif de B queda unread.
* SEC-T-02: sin cookie → 401.

### Accessibility Tests

* A11Y-01 (Playwright + `@axe-core/playwright`): botones "Marcar leída" y "Marcar todas" sin violaciones críticas.
* A11Y-02: activables con `Enter`/`Space`; foco visible.
* A11Y-03: toast `role="alert"` correcto.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed, hay al menos 1 notif unread demo para probar mark-as-read manualmente.

### CI Checks

* Lint, type-check, Vitest, Supertest, Playwright.
* Contract test MSW verde (alineado con US-121).
* Cobertura ≥ 50% en el módulo `notifications`.

---

## 14. Observability & Audit

### Logs

* Middleware estándar registra request + `correlationId`.
* Opcional: log `info` estructurado para `mark-all-read` con `{ userId, channel, affected, correlationId }`.

### Correlation ID

* Presente por request.

### AdminAction

`No aplica`.

### Error Tracking

* Errores 5xx loggeados.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-034/US-068..US-070. Al menos 1 notif unread para probar `PATCH single` en demo.

### Demo Scenario Supported

* Login como organizer demo → abrir campanita → click "Marcar leída" en primer item → badge decrementa → click "Marcar todas" → badge 0.

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                     | Conflict                                                                                | Current Decision                                                                                | Recommended Action                                                                                                                                                | Blocks Implementation? |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §34.2` (query param `channel`) | No expone `channel` en `POST /mark-all-read`.                                            | D4 agrega query param opcional con default `in_app`.                                             | Ampliar tabla `Endpoints` en `docs/16 §34.2` para agregar el query param `channel`.                                                                                | No                     |
| PB-P2-008 Traceability                 | Verificar completitud.                                                                   | US-072 refinada declara IDs canónicos.                                                          | Ampliar Traceability con `FR-NOTIF-002, UC-NOTIF-002, BR-NOTIF-004/005/007, NFR-PERF-001, NFR-A11Y-001..003 · Decisión PO US-072`.                                | No                     |
| `docs/14 §Notifications`                | Ya lista `MarkNotificationAsReadUseCase` (§730). Falta `MarkAllNotificationsAsReadUseCase`. | Nuevo use case bulk global (D2).                                                                 | Documentar el nuevo use case con SQL y política de filtro `channel`.                                                                                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                       | Impact                                                       | Mitigation                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Express no soporta `PATCH` con path param                                                  | Router falla                                                 | Express soporta `app.patch(...)` desde v4.0; validación durante Tech Lead.                                                        |
| No-revelación 404 confunde a QA (esperaría 403 para ajenas)                                 | Tests iniciales fallan                                       | Documentado en AC-04, SEC-02; alineado con `docs/19`.                                                                              |
| Optimistic UI causa flash visual ante rollback frecuente                                    | UX pobre                                                     | Toast de error localizado; en producción es raro (endpoint idempotente).                                                          |
| `mark-all-read` con 100+ notifs supera P95 < 1.5s                                           | Test PERF falla                                              | UPDATE con `idx_notifications_user_unread` es O(N unread); mitigado por MVP dataset < 1k.                                        |
| Ventana 60s de inconsistencia entre tabs sorprende al usuario                              | UX pobre en escenario multi-tab                              | Riesgo aceptado (D3); documentado en Notes.                                                                                       |
| Race entre `mark-all-read` y emisión nueva                                                 | Nueva notif queda unread                                     | Comportamiento correcto y esperado (EC-03).                                                                                       |
| Cambio del query key TanStack en US-071 futuro rompe invalidación de US-072                  | Cache inconsistente                                          | Query key `['notifications', 'me', …]` declarada como contrato en US-071; contract test.                                          |

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
            mark-notification-as-read.use-case.ts        # extender (ownership + 404)
            mark-notification-as-read.use-case.spec.ts   # extender
            mark-all-notifications-as-read.use-case.ts   # nuevo
            mark-all-notifications-as-read.use-case.spec.ts  # nuevo
        infrastructure/
          controllers/
            notifications.controller.ts                   # agregar 2 handlers
          repositories/
            notification.repository.ts                    # agregar markAsRead + markAllAsReadForUser
        schemas/
          mark-as-read.schema.ts                          # nuevo Zod
          mark-all-as-read.schema.ts                      # nuevo Zod
          notification-not-found.error.ts                 # nuevo (404)

apps/web/
  components/
    notifications/
      MarkAsReadButton.tsx                                # nuevo
      MarkAllAsReadButton.tsx                             # nuevo
      NotificationItem.tsx                                 # extender (incorporar botón)
      NotificationsDropdown.tsx                            # extender (footer con MarkAll)
  hooks/
    useMarkNotificationAsRead.ts                          # nuevo
    useMarkAllNotificationsAsRead.ts                      # nuevo
  lib/
    api/
      notifications.ts                                     # extender con markAsRead + markAllAsRead
  messages/
    en/notifications.json                                  # extender
    es-LATAM/notifications.json                            # extender
    es-ES/notifications.json                               # extender
    pt/notifications.json                                  # extender
tests/
  e2e/
    notifications-mark-read.spec.ts                        # E2E-01..E2E-03
  contract/
    notifications-mark-read.contract.spec.ts               # contract MSW
```

### Orden de implementación recomendado

1. Backend: Zod schemas (mark-as-read + mark-all-as-read).
2. Backend: `NotificationRepository.markAsRead` + `markAllAsReadForUser`.
3. Backend: extender `MarkNotificationAsReadUseCase` con ownership y no-revelación.
4. Backend: implementar `MarkAllNotificationsAsReadUseCase`.
5. Backend: extender `NotificationsController` con los 2 handlers.
6. Backend: UT-01..UT-07 + IT-01..IT-09.
7. Frontend: `notificationsApi.markAsRead` + `markAllAsRead`.
8. Frontend: hooks TanStack con optimistic + rollback.
9. Frontend: componentes `MarkAsReadButton` y `MarkAllAsReadButton`.
10. Frontend: i18n × 4 locales.
11. Frontend: UT-08..UT-10 + A11Y-01..A11Y-03.
12. E2E + contract MSW.
13. Documentation Alignment.

### Decisiones que no deben reabrirse

* Verbos HTTP canónicos (D1).
* Sólo `mark-all-read` en MVP (D2).
* Sin realtime (D3).
* Filtro `channel` default `in_app` (D4).
* Response 204 (D5).
* Mark-as-read explícito (D6).

### Lo que no se debe implementar

* `mark-many-read` con lista de IDs.
* Mark-as-unread.
* Auto-mark al click.
* WebSocket/SSE.
* Endpoint de detalle `GET /notifications/:id`.
* Cambios al `NotificationResponseDto`.
* Migración.

### Asunciones a preservar

* `NotificationOwnerPolicy` disponible (US-071).
* Query keys canónicas de US-071: `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]`, `['notifications', 'me', 'unreadCount']`.
* Middleware sesión existente.
* Express soporta `PATCH`.

---

## 19. Task Generation Notes

### Suggested task groups

1. Backend — schemas & repository.
2. Backend — use cases & controller.
3. Frontend — API client & hooks.
4. Frontend — components & A11Y.
5. Frontend — i18n.
6. Testing UT + IT.
7. Testing A11Y + E2E + contract.
8. Security — no-revelación + aislamiento.
9. Documentation Alignment.

### Required QA tasks

* UT backend (UT-01..UT-07).
* UT frontend (UT-08..UT-10).
* IT (IT-01..IT-09).
* E2E (E2E-01..E2E-03).
* A11Y (A11Y-01..A11Y-03).
* Contract MSW.

### Required security tasks

* SEC-T-01 (aislamiento con no-revelación 404) + SEC-T-02 (401), etiquetados `@security`.

### Required seed/demo tasks

* Reuso (SEED-T-01 verificación).

### Required documentation tasks

* 3 ítems.

### Dependencies between tasks

```
Zod schemas → Repository → Use cases → Controller → Backend tests
notificationsApi client → Hooks → Components → i18n → Frontend tests
Backend endpoint → Contract test (MSW)
Frontend components → E2E + A11Y
```

### Consolidated tasks.md guidance

Opcional: PB-P2-008 tiene una sola US.

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

D1–D6 materializadas. Reuso máximo del contrato canónico `docs/16 §34.2`, del `NotificationOwnerPolicy` y de las query keys canónicas de US-071. Sin migración/schema change/realtime. Estrategia de testing multi-capa con explícita verificación de optimistic rollback y no-revelación 404.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-008/US-072-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-008
Execution Order: 8 (octavo ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-008, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 3 ítems no bloqueantes (§16).
