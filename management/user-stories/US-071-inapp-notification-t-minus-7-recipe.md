# 🧾 User Story: Recibir aviso in-app de T-7 (vista organizer)

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-071                                                                        |
| Epic               | EPIC-NOT-001                                                                  |
| Backlog Item       | PB-P2-004 — Notificación T-7 (tareas) (P2, posición 2 de 2)                    |
| Feature            | Bandeja de notificaciones organizer con destacado T-7                          |
| Module / Domain    | Notifications                                                                 |
| User Role          | Organizer                                                                     |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Product Owner / Business Analyst                                              |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-06                                                                    |
| Ready for Development Tasks | Yes (notas no bloqueantes; ver §Notes Documentation Alignment Required) |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-06                                                                    |

---

## 🎯 User Story

**As an** organizador
**I want** abrir la campanita del header y ver mis notificaciones (con las notifs T-7 emitidas por US-034 destacadas)
**So that** acceda rápidamente al checklist del evento afectado desde el ítem T-7 y me mantenga al tanto de los avisos relevantes

---

## 🧠 Business Context

### Context Summary

Surface UI del organizer que consume el endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) y muestra en un dropdown accesible las notificaciones del usuario. Las notifs `type='task_due_soon'` emitidas por `EmitT7NotificationsJob` (US-034 aprobada) se destacan visualmente. El click sobre un ítem navega al deep link server-side. La US-071 NO implementa mark-as-read (alcance de US-072).

### Related Domain Concepts

* Surface UI de `Notification`.
* Deep link server-side por `type`.
* Badge de conteo `status='unread'` en el header.
* Ordenamiento "unread primero, luego `sent_at DESC`".

### Assumptions

* Las notifs `task_due_soon` ya son emitidas por US-034 (aprobada) con `channel='in_app'` y `channel='email_simulated'`.
* El endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) devuelve `NotificationResponseDto` (`docs/16 §34.3`) con `link` generado server-side según el patrón declarado en D3.
* El backend acepta el query param opcional `channel` con default `in_app` (D5); acepta también `status=unread` opcional (D2).

### Dependencies

* **US-034** (upstream, aprobada — emite las notifs `task_due_soon`).
* **US-032** (aprobada — expone `GET /api/v1/events/:eventId/tasks?range=7d`, destino del deep link T-7).
* **US-072** (downstream — mark-as-read explícito; la invalidación TanStack del badge se apoya en su mutation).

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-071-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                     |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Bandeja unificada: la campanita muestra TODAS las notificaciones del organizer (sin filtro por `type`). Ordenamiento default `unread first, sent_at DESC`. Los items `type='task_due_soon'` se destacan visualmente. |
| D2 | Default sin filtro `status`; toggle opt-in `?status=unread`. Badge del header muestra conteo `status='unread'` con formato `9+` cuando excede 9.                                                             |
| D3 | Campo `link` generado server-side por tipo. Para `type='task_due_soon'` → `/organizer/events/{payload.eventId}/tasks?range=7d`. Si el recurso apuntado no existe o el payload es incompleto, `link=null`.       |
| D4 | Click sobre notif T-7 cuyo evento está `event.status ∈ {cancelled, completed}` procede normalmente al deep link; el banner read-only de US-032 comunica el estado.                                            |
| D5 | Query param `channel` opcional en `GET /api/v1/notifications` con default `in_app`. La campanita consume el default y deduplica contra el registro `channel='email_simulated'` emitido por US-034.            |
| D6 | US-071 NO dispara mark-as-read. Alcance exclusivo de US-072. El badge se sincroniza vía invalidación TanStack al mergearse la mutation de US-072.                                                             |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-004 (posición 2 de 2)                                                                                                    |
| FRD Requirement(s)     | FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005, FR-NOTIF-007                                                                        |
| Use Case(s)            | UC-NOTIF-001                                                                                                                  |
| Business Rule(s)       | BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-005, BR-NOTIF-007                                                                        |
| Permission Rule(s)     | Recipient (`user_id = session.userId`)                                                                                        |
| Data Entity / Entities | Notification, User                                                                                                            |
| API Endpoint(s)        | GET /api/v1/notifications (`docs/16 §34.2`)                                                                                    |
| NFR Reference(s)       | NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003                                                          |
| Related ADR(s)         | —                                                                                                                             |
| Related Document(s)    | /docs/4 §BR-NOTIF-001/002/005/007, /docs/6 §Notification, /docs/8 §UC-NOTIF-001, /docs/9 §FR-NOTIF-001/002/005/007, /docs/10 §NFR-PERF-001 / §NFR-A11Y-001..003 / §NFR-USAB-001, /docs/14 §Notifications, /docs/15 §Client Components, /docs/16 §34, /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Mark-as-read (single + bulk) — alcance de **US-072**.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Realtime WebSocket / SSE para push automático de nuevas notifs — Future.
* Notificaciones broadcast cross-rol (BR-NOTIF-005 lo prohíbe).
* Filtro por tipo desde UI (no requerido en MVP; se puede agregar en Future si el volumen lo justifica).
* Bandeja "unificada admin" con notifs de otros usuarios.

### Scope Notes

* Bandeja unificada organizer. Sin mutations en US-071 (todas las lecturas). Sin cambios al schema de `notifications` ni al endpoint canónico (sólo se agregan query params opcionales).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Lista paginada con destacado T-7

**Given** un organizer autenticado con N `Notification(user_id=session.userId)`
**When** el frontend abre la campanita y solicita `GET /api/v1/notifications?page=1&pageSize=10` (el default `channel=in_app` aplica implícitamente por D5)
**Then** el backend retorna `200` con una página paginada de `NotificationResponseDto` (`docs/16 §34.3`) ordenada por `unread first, sent_at DESC`. La UI destaca visualmente los items con `type='task_due_soon'` (badge o color). El header muestra un badge con el conteo `status='unread'` en formato `9+` cuando excede 9.

### AC-02: Click abre checklist filtrado 7d

**Given** un item con `type='task_due_soon'` y `link='/organizer/events/{eventId}/tasks?range=7d'` (D3)
**When** el organizer hace click sobre el item
**Then** la UI navega a `/organizer/events/{eventId}/tasks?range=7d` reusando el checklist de US-032. Cuando el evento asociado está en `event.status ∈ {cancelled, completed}`, la navegación procede igual y US-032 muestra su banner read-only (D4). Si `link=null`, el ítem se renderiza sin CTA y el click no navega.

### AC-03: Sin sesión → 401

**Given** un cliente sin sesión válida
**When** invoca `GET /api/v1/notifications`
**Then** el backend responde `401` (VR-01) sin exponer datos ni conteo.

### AC-04: Aislamiento por destinatario (BR-NOTIF-005)

**Given** dos organizers `u1` y `u2` con notifs independientes
**When** `u1` invoca `GET /api/v1/notifications`
**Then** la respuesta contiene exclusivamente registros con `user_id=u1`. Un intento de acceso al detalle de una notif de `u2` (Future endpoint) responde `403` sin revelación (`docs/16 §34.2`).

### AC-05: Paginación estable

**Given** un organizer con 25 notifs no leídas
**When** el frontend pagina `page=1, pageSize=10`, luego `page=2, pageSize=10`, y luego `page=3, pageSize=10`
**Then** las tres páginas no contienen items duplicados y el `total` reportado por el backend es consistente entre requests dentro de la misma ventana de refetch (60 s).

### AC-06: Empty / Loading / Error con roles ARIA

**Given** un organizer sin notifs
**When** abre la campanita
**Then** ve un empty state con copy localizado en su idioma (`User.language_preference`, alineado con US-034 D6) y `aria-live="polite"`. Durante loading, el skeleton es accesible (`aria-busy="true"`). Ante error de red, un banner `role="alert"` ofrece "Reintentar".

### AC-07: Accesibilidad del dropdown (NFR-A11Y-001..003)

**Given** el organizer navega con teclado
**When** llega al botón "Campanita" con Tab
**Then** puede abrir el dropdown con `Enter`/`Space`, navegar los items con `↑`/`↓`, activar con `Enter`, y cerrar con `Esc`. El foco visible cumple `NFR-A11Y-003`. El dropdown usa `role="menu"` (o `role="listbox"` según design system) y cada item `role="menuitem"`. Verificación con Axe sin violaciones críticas (`NFR-A11Y-001`).

### AC-08: i18n en 4 locales

**Given** un organizer con `User.language_preference ∈ {es-LATAM, es-ES, pt, en}`
**When** consume la campanita
**Then** los copy de UI (empty, error, "Cargar más", tooltips del badge) están localizados en su idioma; los campos `title` y `body` del DTO fueron localizados server-side por US-034 D6 y se muestran tal cual.

### AC-09: Performance

**Given** un organizer con 100 notifs en el seed demo
**When** invoca `GET /api/v1/notifications?page=1&pageSize=10`
**Then** la respuesta cumple `NFR-PERF-001` (P95 < 1.5 s) medido en el entorno de demo. La percepción de carga (tiempo hasta primer render) es < 500 ms (Business Impact).

---

## ⚠️ Edge Cases

### EC-01: Sin notifs

**Given** un organizer sin notifs
**When** abre la campanita
**Then** ve el empty state localizado con `aria-live="polite"`.

#### Handling

* Copy localizado por locale (4 locales).

### EC-02: Evento asociado en `cancelled` / `completed`

**Given** una notif `task_due_soon` cuyo `payload.eventId` está en `event.status ∈ {cancelled, completed}`
**When** el organizer hace click
**Then** la UI navega al deep link y US-032 muestra el banner read-only correspondiente (D4).

#### Handling

* Reuso del banner de US-032; sin lógica adicional en US-071.

### EC-03: Recurso apuntado eliminado → `link=null`

**Given** una notif cuyo `payload.eventId` referencia un evento soft-deleted
**When** el backend serializa el DTO
**Then** el `link` retorna `null` y la UI muestra el item sin CTA.

#### Handling

* Frontend: no navegar cuando `link=null`; deshabilitar visualmente el CTA con `aria-disabled="true"`.

### EC-04: Paginación con nuevos items intermedios

**Given** un organizer que carga `page=1` y luego, tras 60 s, llegan 2 notifs nuevas por US-034
**When** solicita `page=2`
**Then** la paginación no duplica items ya vistos y el conteo total se reporta con el nuevo valor tras el próximo refetch (`refetchInterval=60s` en TanStack).

#### Handling

* Ordenamiento estable server-side (`unread first, sent_at DESC, id ASC`).

### EC-05: Dedup contra `channel='email_simulated'`

**Given** una tarea T-7 emitida por US-034 (crea 2 filas: `in_app` + `email_simulated`)
**When** el organizer abre la campanita
**Then** ve exactamente 1 item para esa tarea (default `channel=in_app`, D5).

#### Handling

* Filtro implícito server-side por default del query param.

---

## 🚫 Validation Rules

| ID    | Rule                                                                        | Message / Behavior                    |
| ----- | --------------------------------------------------------------------------- | ------------------------------------- |
| VR-01 | Sesión activa                                                                | 401 sin sesión (`docs/16 §34.2`)      |
| VR-02 | `user_id = session.userId` (aislamiento server-side, BR-NOTIF-005)          | Registros ajenos nunca listados       |
| VR-03 | `channel ∈ {in_app, email_simulated, all}` (default `in_app`) — D5           | 400 `INVALID_QUERY_PARAM` si inválido |
| VR-04 | `status ∈ {unread, all}` (default `all`) — D2                                | 400 `INVALID_QUERY_PARAM` si inválido |
| VR-05 | `page ∈ [1, ∞)`, `pageSize ∈ [1, 50]`                                       | 400 `INVALID_PAGINATION` fuera de rango |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------ |
| SEC-01 | Sólo notifs del usuario autenticado (`user_id = session.userId`).                                |
| SEC-02 | Reuso del policy `NotificationOwnerPolicy` (o guard equivalente definido en el backend base).    |
| SEC-03 | 401 sin sesión; 403 al detalle ajeno (Future endpoint); no-revelación 404 para IDs desconocidos. |
| SEC-04 | El DTO no expone `payload` completo si contiene datos sensibles; sólo campos necesarios para el link y el body localizado. |

### Negative Authorization Scenarios

* Sin sesión → 401 (VR-01).
* Organizer intenta acceder al detalle de una notif ajena → 403 (`docs/16 §34.2`).
* Admin invoca `GET /api/v1/notifications` → 200 pero sólo notifs del admin (no de otros usuarios, BR-NOTIF-005).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Screen / Route      | Header persistente del layout autenticado organizer (`app/(authenticated)/organizer/layout.tsx` o equivalente). |
| Main UI Pattern     | Botón "Campanita" con badge de conteo unread; abre un dropdown/menu accesible con la lista.                     |
| Primary Action      | Click sobre un item → navega al `link` server-side.                                                             |
| Secondary Actions   | Toggle "Sólo no leídas" (D2); botón "Cargar más" para paginación. Mark-as-read NO está en US-071 (D6, alcance US-072). |
| Empty State         | Copy localizado en 4 locales; `aria-live="polite"`.                                                             |
| Loading State       | Skeleton con `aria-busy="true"`.                                                                                |
| Error State         | Banner `role="alert"` con "Reintentar".                                                                         |
| Success State       | Lista con destacado visual para `type='task_due_soon'`.                                                         |
| Accessibility Notes | `role="menu"`/`role="listbox"` en el dropdown; navegación por teclado (`Enter`, `Space`, `↑`, `↓`, `Esc`); foco visible (NFR-A11Y-003). |
| Responsive Notes    | Mobile: la campanita puede abrir un sheet a pantalla completa en breakpoint `sm`.                              |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`. Copy de UI vía `next-intl`; `title`/`body` del DTO ya localizados server-side. |
| Currency Notes      | No aplica                                                                                                       |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * Header persistente del layout organizer autenticado.
* Components:

  * `NotificationsBell` (botón + badge unread), `NotificationsDropdown` (contenedor accesible), `NotificationItem`, `NotificationsEmptyState`, `NotificationsErrorBanner`.
* State Management:

  * TanStack Query con key `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]`.
  * `refetchOnWindowFocus=true`, `refetchInterval=60000` (60 s), `keepPreviousData=true` para paginación estable.
  * Badge unread: hook `useUnreadNotificationsCount()` con key `['notifications', 'me', 'unreadCount']`. Se invalida al mergearse US-072.
* Forms:

  * No aplica (US-071 es lectura pura).
* API Client:

  * `notificationsApi.list({ page, pageSize, status?, channel? })` en `apps/web/lib/api/notifications.ts`.

### Backend

* Use Case / Service:

  * `ListMyNotificationsUseCase` (módulo `notifications`, `docs/14 §730`) extendido con:
    - Query params opcionales `channel ∈ {in_app | email_simulated | all}` (default `in_app`, D5) y `status ∈ {unread | all}` (default `all`, D2).
    - Ordenamiento SQL `ORDER BY (status='unread') DESC, sent_at DESC, id ASC` (unread first).
    - Generación server-side del `link` según patrón por `type` (D3, tabla en `NotificationResponseDto`).
* Controller / Route:

  * `NotificationsController.list` (`GET /api/v1/notifications`) con Zod validation de query params.
* Authorization Policy:

  * `NotificationOwnerPolicy` (session-based). Sólo lista `user_id = session.userId`.
* Validation:

  * Zod schema para `channel`, `status`, `page`, `pageSize`.
* Transaction Required:

  * No.
* Generación del `link` server-side por `type`:
  - `task_due_soon` → `/organizer/events/{payload.eventId}/tasks?range=7d` (D3).
  - Si el recurso apuntado no existe o el payload es incompleto → `link=null`.

### Database

* Main Tables:

  * `notifications`.
* Constraints:

  * FK `notifications.user_id → users.id`.
* Index Considerations:

  * Reuso de `idx_notifications_user_status_sent (user_id, status, sent_at DESC)` para el listado ordenado.
  * Reuso de `idx_notifications_user_unread (user_id) WHERE status='unread'` para el conteo del badge.

### API

| Method | Endpoint                              | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/notifications`               | Listar notifs del usuario autenticado; params `page, pageSize, status?, channel?` |

### Observability / Audit

* Correlation ID Required: Yes (patrón estándar backend por request).
* Log Event Required: No (endpoint de lectura, no crítico).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                | Type        |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Lista paginada ordenada `unread first, sent_at DESC` con destacado visual para `type='task_due_soon'`.  | Integration |
| TS-02 | Sin sesión → 401 (VR-01, AC-03).                                                                        | Integration |
| TS-03 | Aislamiento: dos organizers en paralelo, cada uno ve sólo sus notifs (BR-NOTIF-005, AC-04).            | Integration |
| TS-04 | Paginación estable: page 1 + page 2 + page 3 sin duplicados (AC-05).                                    | Integration |
| TS-05 | Toggle "Sólo no leídas": `?status=unread` retorna sólo `status='unread'`.                              | Integration |
| TS-06 | Filtro por default `channel=in_app` deduplica: una tarea T-7 (2 filas emitidas por US-034) aparece 1 vez (EC-05). | Integration |
| TS-07 | Deep link server-side: notif `task_due_soon` retorna `link='/organizer/events/{eventId}/tasks?range=7d'` (D3, AC-02). | Integration |
| TS-08 | Recurso eliminado: `link=null` cuando `payload.eventId` no existe (EC-03).                              | Integration |
| TS-09 | Performance: 100 notifs seed, P95 < 1.5 s (NFR-PERF-001, AC-09).                                       | Integration/Perf |
| TS-10 | A11Y con Axe: `role`, `aria-*`, foco visible sin violaciones críticas (NFR-A11Y-001..003, AC-07).      | E2E / A11Y |
| TS-11 | Contract test frontend/backend con MSW (alineado con PB-P2-015 / US-121).                              | Contract    |
| TS-12 | i18n: `title`/`body` renderizados en 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) (AC-08).              | Integration |
| TS-13 | Evento asociado en `cancelled`/`completed`: navegación exitosa; banner US-032 se muestra (EC-02).      | E2E         |

### Negative Tests

| ID    | Scenario                                          | Expected Result                     |
| ----- | ------------------------------------------------- | ----------------------------------- |
| NT-01 | Otro user intenta acceder a detalle ajeno (Future endpoint) | 403                                 |
| NT-02 | Notif con `link=null` (EC-03)                     | No navega; item sin CTA             |
| NT-03 | Query param inválido: `?channel=slack`             | 400 `INVALID_QUERY_PARAM` (VR-03)    |
| NT-04 | Query param inválido: `?status=archived`           | 400 `INVALID_QUERY_PARAM` (VR-04)    |
| NT-05 | Query param inválido: `?page=0` o `?pageSize=999`  | 400 `INVALID_PAGINATION` (VR-05)     |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                     | Expected Result                                     |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------- |
| AUTH-TS-01 | Usuario propio invoca `GET /api/v1/notifications`             | 200 con sólo sus notifs                              |
| AUTH-TS-02 | Admin invoca `GET /api/v1/notifications`                      | 200 con notifs del admin (no de otros), BR-NOTIF-005 |

### Accessibility Tests

* Dropdown accesible: `role="menu"`/`role="listbox"`, navegación teclado, foco visible (AC-07).
* Empty state con `aria-live="polite"`; loading con `aria-busy="true"`; error con `role="alert"` (AC-06).
* Verificación con Axe sin violaciones críticas.

---

## 📊 Business Impact

| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| KPI Affected        | Engagement (apertura de campanita, click-through T-7)                                 |
| Expected Impact     | Recordatorio útil accionable; reducción de tareas T-7 olvidadas                       |
| Success Criteria    | Percepción de carga < 500 ms; NFR-PERF-001 (P95 < 1.5 s) cumplido; ≥ 60% de organizers abre la campanita al menos 1×/semana durante demo. |
| Academic Demo Value | Demuestra flujo end-to-end job (US-034) → bandeja → deep link (US-032)                |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componentes `NotificationsBell`, `NotificationsDropdown`, `NotificationItem`, `NotificationsEmptyState`, `NotificationsErrorBanner`.
* Hooks `useNotifications({ filter, page, pageSize })` y `useUnreadNotificationsCount()`.
* i18n catalogs para 4 locales.
* Tests A11Y con Axe + Playwright.

### Potential Backend Tasks

* Extender `ListMyNotificationsUseCase` con `channel`, `status` opcionales.
* Extender ordenamiento SQL `unread first, sent_at DESC, id ASC`.
* Implementar generador de `link` server-side por `type` (con fallback `null`).
* Zod validation de query params.

### Potential Database Tasks

* Not applicable for this story (sin migración).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite completa TS-01..TS-13 + NT-01..NT-05 + AUTH-TS-01..02.
* Verificación A11Y con Axe.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-NOTIF-001/002/005/007`, `UC-NOTIF-001`, `BR-NOTIF-001/002/005/007`).
* [x] Permisos identificados (Recipient).
* [x] Entidades listadas (`Notification`, `User`).
* [x] AC en GWT (AC-01..AC-09).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-05).
* [x] Out of Scope explícito (mark-as-read, push, realtime, broadcast).
* [x] Dependencias conocidas (US-034, US-032, US-072).
* [x] UX states identificados (empty/loading/error/success con roles ARIA).
* [x] API definida (`GET /api/v1/notifications` con nuevos query params opcionales).
* [x] Tests definidos (TS-01..TS-13, NT-01..NT-05, AUTH-TS-01..02, A11Y).
* [x] PO/BA validó (Q1–Q5 cerradas en `decision-resolutions/US-071-decision-resolution.md`).

---

## 🏁 Definition of Done

* [ ] `ListMyNotificationsUseCase` extendido con `channel`, `status` opcionales y generación server-side del `link`.
* [ ] Componentes `NotificationsBell` + dropdown implementados con accesibilidad completa (NFR-A11Y-001..003).
* [ ] Ordenamiento `unread first, sent_at DESC, id ASC` estable en paginación.
* [ ] Badge unread con formato `9+` visible en el header.
* [ ] Deep link `task_due_soon` → `/organizer/events/{eventId}/tasks?range=7d` verificado end-to-end contra US-032.
* [ ] Dedup contra `channel='email_simulated'` verificada (default `in_app`).
* [ ] Tests TS-01..TS-13 y NT-01..NT-05 verdes; A11Y Axe sin violaciones críticas.
* [ ] Contract test verde (MSW).
* [ ] i18n cubre 4 locales.
* [ ] Performance P95 < 1.5 s con 100 notifs seed.
* [ ] Documentation Alignment Required registrada (5 ítems, no bloqueantes).
* [ ] PO valida en demo: al abrir la campanita, la notif T-7 emitida por US-034 aparece destacada y el click abre el checklist con `?range=7d`.

---

## 📝 Notes

* Query key TanStack: `['notifications', 'me', { channel, status, page, pageSize }]`. Política: `refetchOnWindowFocus=true`, `refetchInterval=60s`, `keepPreviousData=true`.
* El badge unread se invalida cuando US-072 dispara `PATCH /notifications/:id/read` o `POST /notifications/mark-all-read`; la invalidación se declara en el hook compartido `useNotifications` para que US-071 la reciba sin código propio.
* Handoff explícito con US-034 (emisor upstream) y con US-032 (deep link).
* Documentation Alignment Required (no bloqueante; tracked en `decision-resolutions/US-071-decision-resolution.md §5`):
  * `docs/16 §34.3`: enum `type` debe usar `task_due_soon`.
  * `docs/16 §34.2`: agregar query params opcionales `channel`, `status`.
  * `docs/16 §34.3`: agregar tabla `link generation by type` (empezando por `task_due_soon`).
  * `docs/10`: reemplazo de `NFR-OBS-001` por NFRs canónicos ya aplicado en la US.
* Realtime/WebSocket para push automático de nuevas notifs: Future (Out of Scope).
