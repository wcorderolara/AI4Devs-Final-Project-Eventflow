# 🧾 User Story: Marcar notificación como leída

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-072                                                                        |
| Epic               | EPIC-NOT-001                                                                  |
| Backlog Item       | PB-P2-008 — Marcar notificaciones como leídas (single + bulk) (P2, posición 1 de 1) |
| Feature            | Mark notification as read (single + all)                                       |
| Module / Domain    | Notifications                                                                 |
| User Role          | Organizer / Vendor / Admin (usuarios con notifs propias)                       |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Product Owner / Business Analyst                                              |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-07                                                                    |
| Ready for Development Tasks | Yes                                                                  |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-07                                                                    |

---

## 🎯 User Story

**As a** usuario con notifs
**I want** marcar una notif como leída individualmente o marcar todas de una vez
**So that** mi bandeja quede limpia y el badge del header refleje mi estado real

---

## 🧠 Business Context

### Context Summary

US-072 provee las mutations que permiten al usuario actualizar `Notification.read_at` (y por consecuencia `status='read'`). Expone dos endpoints canónicos del `docs/16 §34.2`:

* `PATCH /api/v1/notifications/:notificationId/read` — mark single.
* `POST /api/v1/notifications/mark-all-read?channel=in_app` — mark all unread del usuario (default filtro `in_app` para paridad con US-071 D5).

Ambos endpoints responden `204 No Content`. El frontend aplica **optimistic UI** con rollback ante error 4xx/5xx y coordina la invalidación de las query keys canónicas declaradas por US-071 (`['notifications', 'me', …]`, `['notifications', 'me', 'unreadCount']`).

Fuentes canónicas: `FR-NOTIF-002` (`docs/9 §521`) — "El sistema debe permitir al usuario consultar sus notificaciones in-app y marcarlas como leídas"; `UC-NOTIF-002` (`docs/8 §675`); `BR-NOTIF-004` (`docs/4 §391`) — "Acuse de lectura in-app (`read_at`)"; `BR-NOTIF-005` (aislamiento); `docs/14 §730 MarkNotificationAsReadUseCase` (existente).

### Related Domain Concepts

* `Notification.read_at` (`docs/6 §Notification`, `docs/18 §18.1`).
* `NotificationStatus` (`unread`, `read`) — `docs/18 §998`.
* `NotificationOwnerPolicy` — reuso de US-071.
* Optimistic UI + TanStack Query invalidation.
* Ventana de inconsistencia acotada por `refetchInterval=60s` (US-071 D2).

### Assumptions

* MVP single-process (`docs/14 §23.1`).
* US-071 (aprobada) declara las query keys canónicas y define la política de refetch (`refetchOnWindowFocus=true`, `refetchInterval=60s`).
* Los emisores de notifs (US-034, US-068, US-069, US-070) ya persisten `Notification` con `status='unread', read_at=null`.
* `MarkNotificationAsReadUseCase` (`docs/14 §730`) existe; se agrega `MarkAllNotificationsAsReadUseCase`.

### Dependencies

* **US-034** (upstream — origen del corpus de notifs T-7).
* **US-068** (upstream — QR received).
* **US-069** (upstream — Quote received).
* **US-070** (upstream — Booking confirmed).
* **US-071** (surface consumidor aprobada — declara las query keys que US-072 invalida).
* Nota: la bandeja UI vendor genérica sigue como Future US (mismo gap identificado en US-068 D4); cuando se materialice, consumirá esta misma US-072 sin cambios.

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-072-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                             |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Verbos HTTP canónicos: `PATCH /api/v1/notifications/:notificationId/read` (single) + `POST /api/v1/notifications/mark-all-read` (bulk global) per `docs/16 §34.2`.                                    |
| D2 | Bulk = sólo `mark-all-read`. `mark-many-read` (bulk selectivo por lista de IDs) = Future US.                                                                                                          |
| D3 | Broadcast entre tabs: sin WebSocket. TanStack `refetchOnWindowFocus=true` + `refetchInterval=60s` (heredado de US-071 D2). Ventana máxima de inconsistencia = 60s.                                    |
| D4 | Query param opcional `channel ∈ {in_app, email_simulated, all}` con default `in_app` en `POST /mark-all-read` (paridad con US-071 D5). Documentation Alignment con `docs/16 §34.2`.                    |
| D5 | Response `204 No Content` para ambos endpoints. Frontend recomputa `unreadCount` via optimistic + invalidación TanStack (`['notifications', 'me', 'unreadCount']`).                                    |
| D6 | Mark-as-read SIEMPRE explícito (ratificación de US-071 D6). Botones "Marcar leída" (por item) + "Marcar todas como leídas" (footer). Sin auto-mark al click.                                          |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-008                                                                                                                        |
| FRD Requirement(s)     | FR-NOTIF-002 (primario — consulta + mark-as-read)                                                                                |
| Use Case(s)            | UC-NOTIF-002 (Marcar notificación como leída)                                                                                    |
| Business Rule(s)       | BR-NOTIF-004 (acuse `read_at`), BR-NOTIF-005 (aislamiento), BR-NOTIF-007 (idioma para toasts localizados)                        |
| Permission Rule(s)     | Owner (`user_id = session.userId`)                                                                                                |
| Data Entity / Entities | Notification, User                                                                                                                |
| API Endpoint(s)        | PATCH /api/v1/notifications/:notificationId/read, POST /api/v1/notifications/mark-all-read                                        |
| NFR Reference(s)       | NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003                                                             |
| Related ADR(s)         | — (Future ADR sólo si se promueve realtime WebSocket)                                                                             |
| Related Document(s)    | /docs/4 §BR-NOTIF-004/005/007, /docs/6 §Notification, /docs/8 §UC-NOTIF-002, /docs/9 §FR-NOTIF-002, /docs/10 §NFR-PERF-001 §NFR-A11Y-001..003 §NFR-USAB-001, /docs/14 §730 §Notifications, /docs/16 §34.2, /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Bulk selectivo `POST /api/v1/notifications/mark-many-read` con lista de IDs — Future US (D2).
* Mark-as-unread (revertir `read_at`) — Future.
* Auto-mark-as-read al click en el item — Future US, requiere ADR (D6 ratifica US-071 D6).
* Realtime WebSocket/SSE para sync inmediato entre tabs (D3) — Future.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Categorías/tagging de notifs — Out of Scope original.
* Bulk por rango de fechas — Future.

### Scope Notes

* US-072 entrega backend (2 endpoints + 2 use cases) + frontend (2 hooks TanStack + botones).
* Ventana máxima de inconsistencia entre tabs = 60s (D3, riesgo aceptado).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Mark single

**Given** un usuario autenticado propietario de una `Notification` con `status='unread'` (identificada por `:notificationId` UUID válido)
**When** el frontend invoca `PATCH /api/v1/notifications/:notificationId/read`
**Then** el backend valida ownership (`user_id = session.userId`), actualiza `read_at=now()` y `status='read'`, y responde `204 No Content`. El frontend aplica optimistic update sobre las query keys `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]` (marcando el ítem como `read`) y decrementa el `unreadCount` en 1 vía invalidación de `['notifications', 'me', 'unreadCount']`.

### AC-02: Mark all (bulk global)

**Given** un usuario autenticado con N notifs `status='unread' AND channel='in_app'`
**When** el frontend invoca `POST /api/v1/notifications/mark-all-read` (query param `channel` opcional, default `in_app`)
**Then** el backend ejecuta `UPDATE notifications SET read_at=now(), status='read' WHERE user_id=$1 AND status='unread' AND channel='in_app'` (filtro por default; si `?channel=all`, sin filtro `channel`), y responde `204 No Content`. El frontend invalida todas las queries `['notifications', 'me', …]` y setea `unreadCount=0` optimistic (rollback si error).

### AC-03: Sin sesión → 401

**Given** un cliente sin sesión válida
**When** invoca cualquiera de los dos endpoints
**Then** el backend responde `401` sin exponer datos.

### AC-04: Notif ajena → 403 con no-revelación 404 (BR-NOTIF-005)

**Given** un usuario autenticado que invoca `PATCH /api/v1/notifications/:notificationId/read` con `notificationId` que pertenece a otro usuario
**When** el backend valida ownership
**Then** responde `404 Not Found` (política de no-revelación de `docs/19`: no distinguir entre "no existe" y "existe pero es ajena"). No se actualiza ningún `read_at`.

### AC-05: Notif inexistente → 404

**Given** `notificationId` que no corresponde a ningún registro
**When** invoca `PATCH .../read`
**Then** responde `404`.

### AC-06: Idempotencia (ya leída)

**Given** una notif con `read_at != null AND status='read'` propiedad del usuario
**When** invoca `PATCH .../read`
**Then** responde `204` sin modificar el registro (idempotente).

### AC-07: Optimistic rollback

**Given** un frontend que aplica optimistic update tras el click del usuario
**When** el backend responde `4xx` (401/403/404) o `5xx`
**Then** el frontend revierte el cambio local (restaura `status='unread'` y `read_at=null` en el cache) y muestra un toast de error localizado (`role="alert"`, i18n 4 locales).

### AC-08: Performance

**Given** un usuario con 100 notifs seed
**When** invoca `POST /api/v1/notifications/mark-all-read`
**Then** el backend responde en `P95 < 1.5 s` (`NFR-PERF-001`) medido en entorno demo.

### AC-09: A11Y del botón

**Given** el organizer navega con teclado
**When** llega al botón "Marcar leída" de un item o al botón "Marcar todas como leídas" del footer
**Then** puede activar con `Enter`/`Space`; el botón tiene `aria-label` localizado; el foco es visible (`NFR-A11Y-003`); Axe no reporta violaciones críticas (`NFR-A11Y-001`).

---

## ⚠️ Edge Cases

### EC-01: Notif ya leída (idempotencia)

**Given** una notif con `read_at != null`
**When** el usuario invoca `PATCH .../read`
**Then** 204 sin cambios (AC-06).

#### Handling

* SQL `UPDATE ... WHERE read_at IS NULL` para evitar toque innecesario, o `UPDATE` incondicional con response 204.

### EC-02: Mark-all sin unread

**Given** un usuario con 0 notifs `unread`
**When** invoca `POST /mark-all-read`
**Then** 204 (UPDATE afecta 0 filas); el frontend confirma optimistic (no cambia).

#### Handling

* SQL retorna 0 filas afectadas; sin error.

### EC-03: Race con nueva notif emitida durante `mark-all-read`

**Given** el usuario invoca `mark-all-read` en `t0`; entre la `SELECT` implícita del `UPDATE` y el commit, US-034/US-068/US-069/US-070 emite una nueva notif con `sent_at > t0`
**When** el `UPDATE` termina
**Then** la nueva notif queda `unread` (no la afecta el `UPDATE` que ya seleccionó su set). Aceptable en MVP; el badge la reflejará al próximo refetch.

#### Handling

* Comportamiento natural de PostgreSQL (READ COMMITTED por default). Documentado en Notes.

### EC-04: Optimistic rollback ante error

**Given** el frontend aplicó optimistic (`status='read'` en cache); el backend responde `500`
**When** el frontend recibe el error
**Then** revierte cache + toast de error (AC-07).

#### Handling

* TanStack `onError` con snapshot previo del cache.

### EC-05: Broadcast entre tabs (D3)

**Given** el usuario tiene tabs A y B abiertas; marca leída una notif en tab A
**When** el usuario cambia a tab B
**Then** el `refetchOnWindowFocus=true` (US-071 D2) refresca tab B y muestra el estado actualizado. Ventana máxima de inconsistencia = 60s si no cambia de foco.

#### Handling

* Heredado de US-071 D2. Sin infra realtime.

---

## 🚫 Validation Rules

| ID    | Rule                                                                        | Message / Behavior                     |
| ----- | --------------------------------------------------------------------------- | -------------------------------------- |
| VR-01 | Sesión activa                                                                | 401 sin sesión                          |
| VR-02 | `:notificationId` UUID válido                                                | 400 `INVALID_PATH_PARAM` si no          |
| VR-03 | `channel ∈ {in_app, email_simulated, all}` (default `in_app`)                | 400 `INVALID_QUERY_PARAM` si no válido  |
| VR-04 | Ownership: `notification.user_id = session.userId` (BR-NOTIF-005)            | 404 (no-revelación de ajenas)           |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership por `NotificationOwnerPolicy` (reuso de US-071). Sólo el destinatario puede marcar sus notifs.       |
| SEC-02 | 401 sin sesión; 404 a notif ajena (no-revelación `docs/19`); `mark-all-read` sólo afecta `WHERE user_id = session.userId`. |
| SEC-03 | No hay elevación de privilegios; admin puede marcar SUS notifs pero no las de otros usuarios (BR-NOTIF-005).    |

### Negative Authorization Scenarios

* Sin sesión → 401 (VR-01, AC-03).
* Notif ajena → 404 (VR-04, AC-04).
* Notif inexistente → 404 (AC-05).
* Query param inválido → 400 (VR-02, VR-03).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input / Output / Human-in-the-loop / Fallback

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Dropdown notifs del header (`NotificationsDropdown` de US-071).                                                     |
| Main UI Pattern     | Botón "Marcar leída" por item (icono ✓ o texto localizado); botón "Marcar todas como leídas" en el footer del dropdown. |
| Primary Action      | Click en botón "Marcar leída" → `PATCH /notifications/:id/read` con optimistic.                                       |
| Secondary Actions   | Click en "Marcar todas" → `POST /notifications/mark-all-read` con optimistic.                                         |
| Empty State         | No aplica (esta US no tiene bandeja propia; el empty state vive en US-071).                                         |
| Loading State       | Spinner inline en el botón mientras la mutation está pendiente (opcional; optimistic UI puede no requerirlo).       |
| Error State         | Toast `role="alert"` con copy localizado (i18n 4 locales); revierte cache.                                          |
| Success State       | Ítem cambia visualmente a "leído" (grisado, sin badge de unread); badge del header decrementa.                       |
| Accessibility Notes | Botón con `aria-label` localizado ("Marcar como leída" / "Marcar todas como leídas"); foco visible (NFR-A11Y-003).   |
| Responsive Notes    | Mobile-first: botón "Marcar leída" con área táctil ≥ 44×44 px.                                                     |
| i18n Notes          | 4 locales: `es-LATAM, es-ES, pt, en`. Keys: `notifications.markAsRead`, `notifications.markAllAsRead`, `notifications.markSuccessToast`, `notifications.markErrorToast`. |
| Currency Notes      | No aplica                                                                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `NotificationsDropdown` de US-071 (sin nuevas rutas).
* Components:

  * `MarkAsReadButton` por `NotificationItem` (US-071 lo declara pero delega la implementación aquí).
  * `MarkAllAsReadButton` en el footer del dropdown.
* State Management:

  * Hook `useMarkNotificationAsRead()`:

    * `useMutation({ mutationFn: notificationsApi.markAsRead, onMutate: optimistic, onError: rollback, onSuccess: invalidate })`.
    * `onMutate`: snapshot del cache actual + optimistic patch (`status='read'`, `read_at=now()`).
    * `onError`: restaurar snapshot + toast.
    * `onSuccess`: `queryClient.invalidateQueries(['notifications', 'me'])`.
  * Hook `useMarkAllNotificationsAsRead()`:

    * Similar; `onSuccess` invalida todas las queries `['notifications', 'me', …]`.
* Forms:

  * No aplica.
* API Client:

  * `notificationsApi.markAsRead(notificationId): Promise<void>` — `PATCH /api/v1/notifications/${id}/read`.
  * `notificationsApi.markAllAsRead(channel?: 'in_app' | 'email_simulated' | 'all'): Promise<void>` — `POST /api/v1/notifications/mark-all-read${channel !== 'in_app' ? '?channel=' + channel : ''}`.

### Backend

* Use Case / Service:

  * `MarkNotificationAsReadUseCase` (existente, `docs/14 §730`):

    * Input: `{ notificationId, userId }`.
    * SQL: `UPDATE notifications SET read_at=now(), status='read' WHERE id=$1 AND user_id=$2 AND read_at IS NULL RETURNING 1`.
    * Si `RETURNING` vacío → verificar existencia: si no existe o es ajena → 404 (no-revelación); si existe pero ya leída → 204 idempotente.
  * `MarkAllNotificationsAsReadUseCase` (nuevo):

    * Input: `{ userId, channel: 'in_app' | 'email_simulated' | 'all' }` (default `in_app`).
    * SQL: `UPDATE notifications SET read_at=now(), status='read' WHERE user_id=$1 AND status='unread' AND (channel=$2 OR $2='all') RETURNING id`.
    * Response: 204 (no body; `affected` count queda en el log de auditoría opcional).
* Controller / Route:

  * `NotificationsController.markAsRead(req, res)`:

    * `PATCH /api/v1/notifications/:notificationId/read`.
    * Zod: `notificationId: z.string().uuid()`.
  * `NotificationsController.markAllAsRead(req, res)`:

    * `POST /api/v1/notifications/mark-all-read`.
    * Zod query: `channel: z.enum(['in_app', 'email_simulated', 'all']).default('in_app')`.
* Authorization Policy:

  * `NotificationOwnerPolicy` (reuso US-071 SEC-02).
* Validation:

  * Zod aplicado en el controller.
* Transaction Required:

  * No (single-statement UPDATE atómico).

### Database

* Main Tables:

  * `notifications`.
* Constraints:

  * FK `user_id → users.id`.
* Index Considerations:

  * Reuso de `idx_notifications_user_unread (user_id) WHERE status='unread'` (docs/18 §18.1) para el filtro del `mark-all-read`.

### API

| Method | Endpoint                                              | Purpose                                                                              |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| PATCH  | `/api/v1/notifications/:notificationId/read`             | Mark single. Ownership. Response `204`.                                              |
| POST   | `/api/v1/notifications/mark-all-read`                    | Mark all unread. Query param opcional `channel` default `in_app`. Response `204`.    |

### Observability / Audit

* Correlation ID Required: Yes (patrón backend estándar).
* Log Event Required: Opcional — log `info` estructurado del `mark-all-read` con `{ userId, channel, affected }` sin PII, para métrica auditable.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                          | Type        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Mark single: `PATCH .../read` sobre notif propia unread → 204; `read_at != null, status='read'`.                   | Integration |
| TS-02 | Mark all (default `in_app`): 5 notifs unread (3 in_app + 2 email_simulated) → sólo las 3 in_app quedan `read`.     | Integration |
| TS-03 | Mark all (`?channel=all`): las 5 quedan `read`.                                                                    | Integration |
| TS-04 | Mark all (`?channel=email_simulated`): sólo las 2 email_simulated quedan `read`.                                    | Integration |
| TS-05 | Idempotencia: `PATCH .../read` sobre notif ya `read` → 204 sin cambios.                                            | Integration |
| TS-06 | Aislamiento: usuario A intenta `PATCH .../read` sobre notif del usuario B → 404 (no-revelación); B queda unread.   | Integration |
| TS-07 | Response 204: ambos endpoints retornan sin body.                                                                    | Integration |
| TS-08 | Performance: `mark-all-read` con 100 notifs seed → P95 < 1.5 s.                                                     | Integration/Perf |
| TS-09 | Optimistic rollback (frontend): mock `500` en `markAsRead` → cache revierte + toast error.                          | UT frontend |

### Negative Tests

| ID    | Scenario                                        | Expected Result                             |
| ----- | ----------------------------------------------- | ------------------------------------------- |
| NT-01 | Sin sesión → 401.                                | 401 sin body.                                |
| NT-02 | `:notificationId` no UUID → 400.                 | 400 `INVALID_PATH_PARAM`.                    |
| NT-03 | `?channel=slack` → 400.                          | 400 `INVALID_QUERY_PARAM`.                   |
| NT-04 | `:notificationId` inexistente → 404.             | 404.                                          |
| NT-05 | Notif ajena (no-revelación) → 404.               | 404 (no 403).                                 |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                | Expected Result                                     |
| ---------- | ------------------------------------------------------- | --------------------------------------------------- |
| AUTH-TS-01 | Dueño invoca `PATCH .../read` sobre su notif             | 200/204 (204 canónico).                              |
| AUTH-TS-02 | Admin invoca `POST /mark-all-read`                       | 204 con `WHERE user_id = admin.id` (BR-NOTIF-005: sólo sus notifs). |

### Accessibility Tests

* Botón "Marcar leída" con `aria-label` localizado, foco visible, activable con `Enter`/`Space`.
* Botón "Marcar todas como leídas" con `aria-label` localizado.
* Toast de error con `role="alert"`.
* Verificación con Axe (Playwright + `@axe-core/playwright`) sin violaciones críticas.

### E2E Tests

* E2E-01: usuario abre campanita con 3 notifs unread → click "Marcar todas como leídas" → badge = 0; dropdown muestra las 3 grisadas.
* E2E-02: usuario click en botón "Marcar leída" del primer item → badge decrementa a 2; item cambia visualmente.
* E2E-03: mock backend `500` → toast de error; badge no cambia.

### Contract Tests

* MSW contract test (alineado con PB-P2-015 / US-121):
  * `PATCH /api/v1/notifications/:id/read` → 204.
  * `POST /api/v1/notifications/mark-all-read?channel=in_app` → 204.

---

## 📊 Business Impact

| Field               | Value                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| KPI Affected        | UX (higiene de bandeja); engagement (usuarios que interactúan explícitamente con notifs).                  |
| Expected Impact     | Bandeja controlable por el usuario; badge refleja estado real.                                             |
| Success Criteria    | Optimistic UI operativa (`< 100 ms` percibido); NFR-PERF-001 cumplido; A11Y verde.                          |
| Academic Demo Value | Demuestra mutations REST + optimistic UI + TanStack invalidation end-to-end.                                |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Cliente `notificationsApi.markAsRead` y `notificationsApi.markAllAsRead`.
* Hooks `useMarkNotificationAsRead` y `useMarkAllNotificationsAsRead` con optimistic + rollback.
* Componentes `MarkAsReadButton`, `MarkAllAsReadButton`.
* Extender i18n catalogs con 4 keys × 4 locales = 16 entradas.
* Tests UT + A11Y + E2E.

### Potential Backend Tasks

* Extender `MarkNotificationAsReadUseCase` (verificar ownership + no-revelación 404).
* Implementar `MarkAllNotificationsAsReadUseCase` con filtro `channel`.
* Extender `NotificationsController` con los dos handlers.
* Zod schemas.
* Tests UT + IT.

### Potential Database Tasks

* No aplica — sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite TS-01..TS-09, NT-01..NT-05, AUTH-TS-01..02, A11Y, E2E, contract.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (usuario con notifs propias — organizer/vendor/admin).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-NOTIF-002, UC-NOTIF-002, BR-NOTIF-004/005/007).
* [x] Permisos identificados (Owner).
* [x] Entidades listadas (`Notification`, `User`).
* [x] AC en GWT (AC-01..AC-09).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-04).
* [x] Out of Scope explícito (bulk selectivo, mark-as-unread, auto-mark, realtime).
* [x] Dependencias conocidas (US-034/068/069/070/071).
* [x] UX states identificados.
* [x] API definida (`PATCH single`, `POST mark-all-read?channel=in_app`).
* [x] Tests definidos.
* [x] PO/BA validó (Q1–Q5 + Q6 cerradas).

---

## 🏁 Definition of Done

* [ ] `MarkNotificationAsReadUseCase` verifica ownership con no-revelación 404.
* [ ] `MarkAllNotificationsAsReadUseCase` implementado con Zod query param `channel`.
* [ ] `NotificationsController` expone `PATCH .../read` y `POST .../mark-all-read`.
* [ ] Hooks TanStack con optimistic + rollback verificados (TS-09).
* [ ] Componentes `MarkAsReadButton` y `MarkAllAsReadButton` con A11Y correcta.
* [ ] Catálogos i18n × 4 locales.
* [ ] Tests TS-01..TS-09 y NT-01..NT-05 verdes; A11Y con Axe sin violaciones críticas.
* [ ] Contract test verde.
* [ ] Performance P95 < 1.5 s con 100 notifs seed.
* [ ] Documentation Alignment con `docs/16 §34.2` (query param `channel`) tracked.
* [ ] PO valida en demo: marca leída una notif → badge decrementa; marca todas → badge = 0.

---

## 📝 Notes

* Optimistic UI: patrón `useMutation({ onMutate, onError, onSuccess })` idiomático de TanStack.
* Query keys canónicas invalidadas por US-072 (declaradas por US-071):
  * `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]`.
  * `['notifications', 'me', 'unreadCount']`.
* Ventana máxima de inconsistencia entre tabs = 60s (D3, aceptado).
* Race con notif emitida durante `mark-all-read` documentada en EC-03; comportamiento natural de PostgreSQL.
* Documentation Alignment Required (no bloqueante; ver `decision-resolutions/US-072-decision-resolution.md §5`):
  * Extender `docs/16 §34.2` tabla `Endpoints` con query param `channel` opcional para `POST /mark-all-read`.
  * Ampliar Traceability de PB-P2-008 con IDs canónicos.
  * Documentar `MarkAllNotificationsAsReadUseCase` en `docs/14 §Notifications`.
* D1 y D4 marcadas como `Tech Recommendation — Requires Tech Lead Validation` durante Technical Spec.
* Handoff explícito: US-071 (surface consumidor aprobada — declara las query keys); US-034/068/069/070 (upstream — emisores).
* Bulk selectivo (`mark-many-read`), mark-as-unread, y auto-mark-as-read quedan Future.
