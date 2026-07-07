# 🧾 User Story: Bandeja unificada de notificaciones vendor

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-073                                                                        |
| Epic               | EPIC-NOT-001                                                                  |
| Backlog Item       | PB-P2-009 — Surface vendor de notificaciones de rechazo/expiración (P2, Must Have, posición 1 de 1) |
| Feature            | Bandeja unificada de notificaciones vendor con destacado visual por tipo       |
| Module / Domain    | Notifications                                                                 |
| User Role          | Vendor                                                                        |
| Priority           | Must Have (Decisión PO 8.1 #13 — cierre bilateral del loop de quotes)          |
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

**As a** proveedor
**I want** ver en mi bandeja del vendor todas mis notificaciones (con destacado visual por tipo)
**So that** conozca inmediatamente el resultado de mis Quotes (rechazadas, expiradas), las nuevas QuoteRequest recibidas y las confirmaciones de BookingIntent, y actúe en consecuencia

---

## 🧠 Business Context

### Context Summary

US-073 entrega la **bandeja unificada del vendor** (patrón US-071 D1 aprobada). Muestra TODAS las notifs con `user_id = session.userId` sin filtro por `type`. Con destacado visual por tipo (D4). Consume el endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) ya extendido por US-071 con query params `channel, status, page, pageSize`.

Esta decisión **cierra el gap identificado en US-068 D4 y US-070 D4** ("bandeja vendor genérica = Future US no listada"): la bandeja vendor genérica queda entregada por US-073. No se requiere Future US adicional.

Tipos de notif que el vendor recibe (todos aparecen en la bandeja):

* `quote_rejected` (US-054 upstream aprobada).
* `quote_expired` (US-054 upstream aprobada).
* `quote_request_received` (US-068 upstream aprobada).
* `booking_confirmed` (US-070 upstream aprobada — vendor recipient).
* `vendor_approved` / `vendor_rejected` (futuros por US-047).

Fuentes canónicas:

* `FR-QUOTE-009` (`docs/9 §467`) — Quote expired + notif al vendor.
* `FR-QUOTE-010` (`docs/9 §468`) — Quote rejected + notif al vendor.
* `FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005`.
* `UC-NOTIF-001, UC-QUOTE-009, UC-QUOTE-010`.
* Decisión PO 8.1 #13 (cierre bilateral).

### Related Domain Concepts

* Bandeja unificada `Notification` del vendor.
* `NotificationLinkResolver` extendido con estrategias vendor (D2).
* Reuso 1:1 del patrón US-071 aprobada (componentes + hooks + query keys + i18n).
* Reuso 1:1 de US-072 aprobada para mark-as-read.

### Assumptions

* US-054, US-068, US-070 emiten `Notification` correctamente (upstream aprobadas).
* US-071 declara las query keys canónicas y define `refetchOnWindowFocus=true`, `refetchInterval=60s`, `keepPreviousData=true`.
* US-072 provee `MarkAsReadButton` y `MarkAllAsReadButton` reusables.
* Vendor layout `apps/web/app/(authenticated)/vendor/layout.tsx` existe (D6, ratifica Tech Lead durante Technical Spec) o se crea como task de foundation en US-073.

### Dependencies

* **US-054** (upstream, aprobada — emite `quote_rejected`, `quote_expired`).
* **US-068** (upstream, Ready for Sprint Planning — emite `quote_request_received` al vendor).
* **US-070** (upstream, Ready for Sprint Planning — emite `booking_confirmed` al vendor).
* **US-071** (patrón bandeja aprobada — reuso 1:1 de componentes, hooks, query keys, i18n).
* **US-072** (mark-as-read aprobada — reuso 1:1 de mutations y botones).

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-073-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                          |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Bandeja unificada vendor (patrón US-071 D1). Muestra todos los tipos con `user_id = session.userId`. Cierra gap identificado en US-068 D4 y US-070 D4.                                            |
| D2 | Deep links por tipo: `quote_rejected` y `quote_expired` → `/vendor/quotes/{payload.quoteId}`. Extensión de `LINK_STRATEGY_BY_TYPE` (US-071 D3). Documentation Alignment con `docs/16 §34.3`.        |
| D3 | Sin filtros por tipo desde UI en MVP (simetría US-071). Toggle Future US. Destacado visual por tipo (D4) provee la señal.                                                                          |
| D4 | Mapping `TYPE_TO_VARIANT` con color + icono + texto (NFR-A11Y-005 anti color-only). Variants: `destructive` (rejected), `warning` (expired), `info` (QR received / task_due_soon), `success` (booking_confirmed / vendor_approved), `neutral` (default). |
| D5 | Mark-as-read reuso 1:1 de US-072 aprobada. Sin mutations propias en US-073. Ratificación paralela a US-071 D6 (mark-as-read siempre explícito).                                                     |
| D6 | Vendor layout: verificar existencia en `apps/web/app/(authenticated)/vendor/layout.tsx`; si no existe, crear layout mínimo simétrico al organizer como task de foundation dentro de US-073.        |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-009                                                                                                                         |
| FRD Requirement(s)     | FR-QUOTE-009 (Quote expired + notif vendor), FR-QUOTE-010 (Quote rejected + notif vendor), FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005 |
| Use Case(s)            | UC-NOTIF-001 (recibir notifs in-app), UC-QUOTE-009 (rechazo), UC-QUOTE-010 (expiración por sistema)                              |
| Business Rule(s)       | BR-NOTIF-001 (canales), BR-NOTIF-002 (disparadores), BR-NOTIF-005 (aislamiento), BR-NOTIF-007 (idioma)                            |
| Permission Rule(s)     | Owner (`user_id = session.userId`)                                                                                                 |
| Data Entity / Entities | Notification, Quote, VendorProfile, User                                                                                            |
| API Endpoint(s)        | GET /api/v1/notifications (`docs/16 §34.2`, canonical; ya extendido por US-071 con `channel, status, page, pageSize`)               |
| NFR Reference(s)       | NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003, NFR-A11Y-005                                                |
| Related ADR(s)         | — (Future ADR si se promueve realtime WebSocket)                                                                                    |
| Related Document(s)    | /docs/4 §BR-NOTIF-001/002/005/007, /docs/6 §Notification §Quote, /docs/8 §UC-NOTIF-001 §UC-QUOTE-009 §UC-QUOTE-010, /docs/9 §FR-QUOTE-009 §FR-QUOTE-010 §FR-NOTIF-001/002/005, /docs/10 §NFR-PERF-001 §NFR-A11Y-001..005 §NFR-USAB-001, /docs/14 §Notifications, /docs/15 §Client Components §Vendor Layout, /docs/16 §34.2 §34.3, /docs/18 §18.1 |
| PO Decision(s)         | Decisión PO 8.1 #13 (cierre bilateral)                                                                                             |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (Decisión PO 8.1 #13)

### Explicitly Out of Scope

* Mark-as-read — alcance **US-072 aprobada** (reuso 1:1).
* Filtros por tipo desde UI — Future US (D3).
* Toggle "Sólo no leídas" — heredado de US-071 D2 (reuso; no se re-declara aquí).
* Realtime WebSocket / SSE — Future.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Notifs de otros roles — el aislamiento server-side impide que el vendor vea notifs ajenas (BR-NOTIF-005).
* Cambios al `NotificationResponseDto`.
* Cambios al schema Prisma.

### Scope Notes

* Bandeja vendor unificada; reuso 1:1 del patrón US-071 aprobado + componentes de US-072 aprobada.
* Cierra el gap identificado en US-068 D4 y US-070 D4 (bandeja vendor genérica) sin nueva Future US.
* Variant visual por tipo con color + icono + texto (D4, anti color-only).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Bandeja unificada con destacado visual

**Given** un vendor autenticado con N `Notification(user_id=session.userId)` de tipos `quote_rejected`, `quote_expired`, `quote_request_received`, `booking_confirmed`
**When** el frontend abre el `NotificationsBell` del layout vendor y solicita `GET /api/v1/notifications?page=1&pageSize=10` (default `channel=in_app` per US-071 D5)
**Then** el backend retorna `200` con `PaginatedNotificationsResponse` ordenado por `unread first, sent_at DESC, id ASC` (US-071 D1). La UI destaca cada item con el `variant` derivado del mapping `TYPE_TO_VARIANT` (D4), combinando color + icono + texto (`aria-label` localizado). El header muestra el badge unread con formato `9+` (US-071 D2).

### AC-02: Deep link por tipo (D2)

**Given** un item con `type ∈ {quote_rejected, quote_expired}` y `payload.quoteId` válido
**When** el vendor hace click
**Then** la UI navega a `/vendor/quotes/{payload.quoteId}` (D2). Si `link=null` (recurso eliminado), el ítem se renderiza sin CTA (heredado US-071 EC-03).

### AC-03: Sin sesión → 401

**Given** un cliente sin sesión válida
**When** invoca `GET /api/v1/notifications`
**Then** el backend responde `401` (heredado US-071 AC-03).

### AC-04: Aislamiento por destinatario (BR-NOTIF-005)

**Given** dos vendors `v1` y `v2` con notifs propias
**When** `v1` invoca `GET /api/v1/notifications`
**Then** la respuesta contiene exclusivamente registros con `user_id=v1.user_id`; ningún registro de `v2` aparece (heredado US-071 AC-04).

### AC-05: Paginación estable

**Given** un vendor con 25 notifs
**When** el frontend pagina page 1..3
**Then** no hay duplicados y el `total` es consistente (heredado US-071 AC-05).

### AC-06: Empty / Loading / Error con ARIA

**Given** un vendor sin notifs
**When** abre la campanita
**Then** ve el empty state con `aria-live="polite"` + copy localizado. Loading con `aria-busy="true"`. Error con `role="alert"` y botón "Reintentar" (heredado US-071 AC-06).

### AC-07: Accesibilidad del dropdown (NFR-A11Y-001..003, D4)

**Given** el vendor navega con teclado
**When** llega al botón "Campanita" con Tab
**Then** puede abrir con `Enter`/`Space`, navegar items con `↑`/`↓`, activar con `Enter`, cerrar con `Esc`. El foco visible cumple `NFR-A11Y-003`. Cada `NotificationItem` incluye icono + texto además del color (D4, NFR-A11Y-005). Axe sin violaciones críticas.

### AC-08: i18n en 4 locales

**Given** un vendor con `User.language_preference ∈ {es-LATAM, es-ES, pt, en}`
**When** consume la campanita
**Then** los copy de UI (`aria-label` por variant, empty, error, "Cargar más") están localizados; `title` y `body` del DTO llegan localizados server-side por US-054/US-068/US-070 D6 equivalente.

### AC-09: Performance

**Given** un vendor con 100 notifs seed
**When** invoca `GET /api/v1/notifications?page=1&pageSize=10`
**Then** cumple `NFR-PERF-001` (P95 < 1.5 s). Percepción de carga < 500 ms.

---

## ⚠️ Edge Cases

### EC-01: Bulk de rechazos

**Given** un vendor recibe N rechazos en corto tiempo (batch)
**When** abre la campanita
**Then** ve los N items paginados con destacado `destructive`; sin agrupar (política simple MVP).

#### Handling

* Paginación estable (AC-05); orden `unread first, sent_at DESC`.

### EC-02: Notif con `link=null`

**Given** una notif cuyo recurso apuntado fue eliminado (Quote soft-deleted)
**When** el vendor hace click
**Then** no navega; item con `aria-disabled="true"` (heredado US-071 EC-03).

#### Handling

* Frontend valida `link != null` antes de navegar.

### EC-03: Vendor sin sesión

**Given** vendor no autenticado
**When** intenta acceder
**Then** 401 (AC-03).

#### Handling

* Session middleware.

### EC-04: Aislamiento

**Given** vendor `v1` intenta ver notifs de `v2` (imposible por endpoint; caso teórico)
**When** invoca endpoint
**Then** sólo ve sus notifs (AC-04).

#### Handling

* Server-side `WHERE user_id = session.userId`.

### EC-05: Type futuro no mapeado

**Given** una notif con `type` que aún no está en `TYPE_TO_VARIANT`
**When** se renderiza
**Then** variant fallback = `neutral` + `aria-label` genérico "Notificación" localizado. Link puede ser `null`.

#### Handling

* Mapping declarativo con default explícito.

---

## 🚫 Validation Rules

| ID    | Rule                                                                        | Message / Behavior                    |
| ----- | --------------------------------------------------------------------------- | ------------------------------------- |
| VR-01 | Sesión activa (heredado US-071 VR-01)                                        | 401 sin sesión                         |
| VR-02 | `user_id = session.userId` (heredado US-071 VR-02, BR-NOTIF-005)             | Server-side isolation                  |
| VR-03 | `channel ∈ {in_app, email_simulated, all}` default `in_app` (heredado US-071 D5) | 400 `INVALID_QUERY_PARAM` si inválido |
| VR-04 | `status ∈ {unread, all}` default `all` (heredado US-071 D2)                   | 400 `INVALID_QUERY_PARAM` si inválido |
| VR-05 | `page ∈ [1, ∞)`, `pageSize ∈ [1, 50]` (heredado US-071 VR-05)                | 400 `INVALID_PAGINATION` fuera de rango |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------ |
| SEC-01 | Sólo notifs del vendor autenticado (`user_id = session.userId`).                                 |
| SEC-02 | Reuso del policy `NotificationOwnerPolicy` (US-071 SEC-02).                                        |
| SEC-03 | 401 sin sesión; 403/404 no-revelación para el detalle (heredado US-071/US-072); admin no ve notifs vendor por BR-NOTIF-005. |
| SEC-04 | El DTO no expone `payload` completo si contiene datos sensibles; sólo campos necesarios para el link y el body localizado (heredado US-071 SEC-04). |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Vendor A intenta acceder al detalle de una notif de vendor B → 404 (heredado no-revelación US-072).
* Admin autenticado → 200 pero sólo notifs del admin (BR-NOTIF-005; heredado US-071 AUTH-TS-02).
* Query param inválido → 400.

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
| Screen / Route      | `apps/web/app/(authenticated)/vendor/layout.tsx` (verificar/crear per D6). El `NotificationsBell` se monta en el header, junto al menú de usuario. |
| Main UI Pattern     | Reuso 1:1 del `NotificationsBell` + `NotificationsDropdown` de US-071. Botones "Marcar leída" (por item, US-072) + "Marcar todas" (footer, US-072). |
| Primary Action      | Click en item → navega al `link` server-side.                                                                        |
| Secondary Actions   | `MarkAsReadButton` (US-072). Toggle "Sólo no leídas" (heredado US-071 D2).                                            |
| Empty State         | Copy localizado en 4 locales; `aria-live="polite"` (heredado US-071).                                                |
| Loading State       | Skeleton con `aria-busy="true"` (heredado US-071).                                                                    |
| Error State         | `role="alert"` con "Reintentar" (heredado US-071).                                                                    |
| Success State       | Lista con destacado visual por tipo (D4).                                                                             |
| Accessibility Notes | Cada `NotificationItem` combina color + icono + texto (D4, NFR-A11Y-005). Navegación teclado, foco visible.          |
| Responsive Notes    | Mobile: sheet a pantalla completa en `sm` (heredado US-071).                                                          |
| i18n Notes          | 4 locales `es-LATAM, es-ES, pt, en`. Reuso de i18n de US-071; extensión con `aria-label` por variant (D4).             |
| Currency Notes      | No aplica                                                                                                              |

### Mapping `TYPE_TO_VARIANT` (D4)

| type                     | variant       | color semántico (design token) | icono sugerido            |
| ------------------------ | ------------- | ------------------------------ | ------------------------- |
| quote_rejected            | destructive   | rojo                            | ✗ / X                     |
| quote_expired             | warning       | amarillo                        | ⏱ / clock                 |
| quote_request_received    | info          | azul                            | 📩 / mail                 |
| booking_confirmed         | success       | verde                            | ✓ / check                 |
| task_due_soon             | info          | azul                            | 📅 / calendar             |
| review_received           | neutral       | gris                            | ⭐ / star                  |
| vendor_approved           | success       | verde                            | ✓ / check                 |
| vendor_rejected           | destructive   | rojo                            | ✗ / X                     |
| (default / desconocido)   | neutral       | gris                            | 🔔 / bell                 |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Vendor layout (`apps/web/app/(authenticated)/vendor/layout.tsx`) — verificar/crear per D6.
* Components:
  * **Reuso 1:1**: `NotificationsBell`, `NotificationsDropdown`, `NotificationsList`, `NotificationsEmptyState`, `NotificationsErrorBanner`, `UnreadBadge` (todos de US-071 aprobada).
  * **Extensión**: `NotificationItem` recibe prop `variant` derivada de `TYPE_TO_VARIANT[notification.type]`. Renderiza color + icono + texto localizado.
  * **Reuso 1:1**: `MarkAsReadButton`, `MarkAllAsReadButton` (US-072 aprobada).
* State Management:
  * **Reuso 1:1** de hooks TanStack de US-071 con las mismas query keys canónicas: `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]` y `['notifications', 'me', 'unreadCount']`.
  * Sin nuevos hooks propios en US-073.
  * Mutations de US-072 invalidan estas keys automáticamente.
* Forms:
  * No aplica.
* API Client:
  * Reuso 1:1 de `notificationsApi.list` (US-071) y `notificationsApi.markAsRead` + `markAllAsRead` (US-072).

### Backend

* **Sin cambios**: reuso 1:1 del endpoint canónico `GET /api/v1/notifications` (extendido por US-071 con query params) y de los use cases `MarkNotificationAsReadUseCase` + `MarkAllNotificationsAsReadUseCase` (US-072).
* **Única extensión backend**: `NotificationLinkResolver` (US-071 D3) con 2 estrategias adicionales (D2):
  * `quote_rejected` → `/vendor/quotes/{payload.quoteId}`.
  * `quote_expired` → `/vendor/quotes/{payload.quoteId}`.

### Database

* Sin migración.
* Reuso de índices de US-071.

### API

| Method | Endpoint                                      | Purpose                                                    |
| ------ | --------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/notifications`                        | Consumo bandeja (canonical, `docs/16 §34.2`, ya extendido por US-071). |
| PATCH  | `/api/v1/notifications/:notificationId/read`   | Mark single (reuso US-072).                                 |
| POST   | `/api/v1/notifications/mark-all-read`          | Mark all (reuso US-072).                                    |

### Observability / Audit

* Reuso: middleware estándar con `correlationId`. Sin logs específicos nuevos.
* AdminAction: No.
* AIRecommendation: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                       | Type        |
| ----- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Bandeja unificada con 4 tipos → 4 items con variant correcto (rojo/amarillo/azul/verde).                        | E2E         |
| TS-02 | Deep link `quote_rejected` → navega a `/vendor/quotes/{id}` (D2).                                              | E2E         |
| TS-03 | Deep link `quote_expired` → navega a `/vendor/quotes/{id}` (D2).                                                | E2E         |
| TS-04 | Aislamiento: vendor B no ve notifs de vendor A (heredado US-071 TS-03).                                        | Integration |
| TS-05 | Paginación estable (heredado US-071 TS-04).                                                                    | Integration |
| TS-06 | Performance P95 < 1.5 s con 100 notifs (heredado US-071 TS-09).                                                | Integration/Perf |
| TS-07 | i18n en 4 locales.                                                                                              | Integration |
| TS-08 | Type futuro no mapeado (`unknown_type`) → variant `neutral` + `aria-label` genérico (EC-05).                     | UT Frontend |

### Negative Tests

| ID    | Scenario                                | Expected Result                     |
| ----- | --------------------------------------- | ----------------------------------- |
| NT-01 | Sin sesión → 401.                        | 401 sin body.                        |
| NT-02 | Notif con `link=null` (EC-02).           | No navega; item sin CTA.             |
| NT-03 | Vendor B intenta acceder a notif de A.   | 404 (heredado no-revelación US-072). |
| NT-04 | Query param inválido.                    | 400.                                  |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                             | Expected Result                                     |
| ---------- | ---------------------------------------------------- | --------------------------------------------------- |
| AUTH-TS-01 | Vendor invoca `GET /api/v1/notifications`             | 200 con sólo sus notifs (heredado US-071).           |
| AUTH-TS-02 | Admin invoca `GET /api/v1/notifications`              | 200 con notifs del admin (BR-NOTIF-005; heredado).   |

### Accessibility Tests

* A11Y-01 (Playwright + `@axe-core/playwright`): dropdown abierto sin violaciones críticas; cada variant combina color + icono + texto (D4, NFR-A11Y-005 anti color-only).
* A11Y-02: navegación completa con teclado (heredado US-071 AC-07).
* A11Y-03: contraste WCAG (NFR-A11Y-005) verificado por variant.

### E2E Tests

* E2E-01: login vendor demo con notifs `quote_rejected` → abrir campanita → click en item → aterriza en `/vendor/quotes/{id}` (D2).
* E2E-02: login vendor demo → verificar que ve al menos 1 item por tipo con variant correcto (D4).

### Contract Tests

* MSW contract test (alineado con PB-P2-015 / US-121):
  * `GET /api/v1/notifications` (heredado US-071).
  * `NotificationResponseDto` con `type ∈ {quote_rejected, quote_expired, ...}` y `link` correcto por tipo (D2).

---

## 📊 Business Impact

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Confianza vendor; cierre bilateral del flujo (Decisión PO 8.1 #13); reducción de vendors sin visibilidad de resultado.      |
| Expected Impact     | Vendor obtiene visibilidad simétrica al organizer; resultado de sus Quotes claro; recepción de nuevas QRs y bookings visible en un único lugar. |
| Success Criteria    | Vendor demo abre la campanita y ve al menos 1 item de cada tipo relevante con destacado visual correcto; deep links funcionan; A11Y verde. |
| Academic Demo Value | Cierre del flujo vendor end-to-end; demuestra bandeja unificada bilateral (organizer US-071 + vendor US-073) sobre el mismo endpoint canonical. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Verificar/crear vendor layout (`apps/web/app/(authenticated)/vendor/layout.tsx`).
* Extender `NotificationItem` con prop `variant` y mapping `TYPE_TO_VARIANT` (D4).
* Extender i18n con `aria-label` por variant (4 locales × ~9 variants).
* Montar `NotificationsBell` en el vendor layout (reuso US-071).
* Tests E2E + A11Y + snapshot visual.

### Potential Backend Tasks

* Extender `NotificationLinkResolver` (US-071 D3) con 2 estrategias: `quote_rejected` y `quote_expired` (D2).
* Verificar `payload` de las notifs emitidas por US-054 (aprobada) contiene `quoteId` (asumido; ratificar en Tech Spec).

### Potential Database Tasks

* Not applicable for this story.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite TS-01..TS-08 + NT-01..NT-04 + AUTH-TS-01..02 + A11Y + E2E + contract.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Vendor).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-001/002/005/007).
* [x] Permisos identificados (Owner).
* [x] Entidades listadas.
* [x] AC en GWT (AC-01..AC-09).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-05).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-054/068/070/071/072).
* [x] UX states identificados.
* [x] API definida (canonical + extensión resolver).
* [x] Tests definidos.
* [x] PO/BA validó (Q1–Q5 + Q6 cerradas).

---

## 🏁 Definition of Done

* [ ] Vendor layout verificado o creado (D6).
* [ ] `NotificationsBell` montado en el vendor layout.
* [ ] `NotificationItem` extendido con `variant` per D4.
* [ ] `NotificationLinkResolver` extendido con estrategias `quote_rejected` y `quote_expired` (D2).
* [ ] i18n `aria-label` por variant en 4 locales.
* [ ] Tests TS-01..TS-08, NT-01..NT-04, AUTH-TS-01..02 verdes.
* [ ] A11Y con Axe sin violaciones críticas (color + icono + texto verificados).
* [ ] E2E verde: login vendor demo → aterriza en `/vendor/quotes/{id}` al hacer click.
* [ ] Contract test verde.
* [ ] Performance P95 < 1.5 s con 100 notifs seed.
* [ ] Documentation Alignment tracked (5 ítems).
* [ ] PO valida en demo: vendor demo ve todas sus notifs con destacado visual correcto; navega correctamente por tipo.

---

## 📝 Notes

* **Reuso máximo** de US-071 (patrón bandeja aprobada) y US-072 (mark-as-read aprobada). US-073 es principalmente extensión frontend + 2 líneas del resolver backend.
* **Cierre de gap**: US-068 D4 y US-070 D4 declararon "bandeja vendor genérica = Future US no listada". US-073 (con D1 bandeja unificada) CIERRA ese gap sin necesidad de Future US adicional.
* Query keys canónicas TanStack heredadas de US-071:
  * `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]`.
  * `['notifications', 'me', 'unreadCount']`.
* Documentation Alignment Required (no bloqueante):
  * Agregar 2 filas (`quote_rejected`, `quote_expired`) a `docs/16 §34.3` tabla `link generation by type`.
  * Actualizar `Description` de PB-P2-009 a "Bandeja unificada del vendor con destacado visual por tipo".
  * Actualizar `Acceptance Summary` de PB-P2-009 reemplazando "Filtros por tipo" por "Destacado visual por tipo".
  * Ampliar Traceability de PB-P2-009 con `FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-002/005, NFR-A11Y-*, NFR-PERF-001`.
  * Actualizar `management/artifacts/2-User-Stories-Coverage-Matrix.md` para reflejar la ampliación de alcance.
* D1, D2 y D6 marcadas como `Tech Recommendation — Requires Tech Lead Validation`.
* Handoff explícito:
  * Upstream: US-054, US-068, US-070 (emisores).
  * Patrón: US-071 (reuso 1:1 de componentes, hooks, query keys, i18n base).
  * Mutations: US-072 (reuso 1:1 de mark-as-read).
* Priority "Must Have" alineada con Decisión PO 8.1 #13 (cierre bilateral del loop de quotes), aunque el Backlog Item lo prioriza como P2 por dependencia con Surface. Esta excepción se documenta explícitamente aquí.
