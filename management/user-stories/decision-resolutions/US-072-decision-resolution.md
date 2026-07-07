# PO/BA Decision Resolution — US-072

## Source User Story File
management/user-stories/US-072-mark-notification-read.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-072-refinement-review.md

## Decision Date
2026-07-07

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-072                                                                                                            |
| User Story file path                         | `management/user-stories/US-072-mark-notification-read.md`                                                        |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-072-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-008 — Marcar notificaciones como leídas (single + bulk) (P2, Should Have, posición 1 de 1)                  |
| Epic                                         | EPIC-NOT-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 6 (Q1–Q5 bloqueantes + Q6 ratificación parcial)                                                                   |
| Decisiones PO/BA tomadas                     | 6 (D1 verbo HTTP canónico; D2 bulk scope; D3 broadcast entre tabs; D4 filtro channel default in_app; D5 response 204; D6 ratificación mark-as-read explícito) |
| Decisiones técnicas recomendadas             | 2 (D1 y D4 requieren validación Tech Lead durante Technical Spec)                                                  |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                |
| User Story file updated                      | Yes                                                                                                               |
| Decision Resolution artifact created/updated | Yes                                                                                                               |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-072-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

---

## 2. Decisiones Respondidas

## Decisión 1 — Verbo HTTP canónico (Q1)

### Respuesta PO/BA

`docs/16 §34.2` declara `PATCH /notifications/:notificationId/read` (single) y `POST /notifications/mark-all-read` (bulk). US-071 D3 y su Technical Spec asumieron estos verbos al construir la tabla `link generation by type` y al declarar la mutation TanStack esperada. Cambiar los verbos rompería consistencia con documentación aprobada.

### Decisión formal

```text
US-072 expone dos endpoints canónicos según `docs/16 §34.2`:
1) `PATCH /api/v1/notifications/:notificationId/read` — mark single. Response `204 No Content`. Errores: `401`, `403`, `404`.
2) `POST /api/v1/notifications/mark-all-read` — mark all unread del usuario. Response `204 No Content`. Errores: `401`.

El verbo `PATCH` se justifica semánticamente porque el mark single es una actualización parcial del recurso `Notification`. El verbo `POST` para bulk se justifica porque es una acción sin representación de recurso único.

Se corrige la sección API de US-072 (que declaraba `POST` para ambos) para alinearla con `docs/16 §34.2`.
```

### Rationale

* `docs/16 §34.2` es la fuente única del contrato API.
* US-071 D3 asumió estos verbos.
* Alineación semántica REST.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                          |
| Acceptance Criteria  | AC-01 con `PATCH`; AC-02 con `POST /mark-all-read`.                                  |
| Technical Notes      | Backend + Frontend actualizados con verbos correctos.                                |
| API                  | Tabla corregida.                                                                      |
| Documentation Alignment | Confirmado alineamiento con `docs/16 §34.2` (no requiere corrección).             |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** durante Technical Spec para confirmar que el router Express soporta `PATCH` con el path parameter `:notificationId`.

---

## Decisión 2 — Alcance de bulk (Q2)

### Respuesta PO/BA

PB-P2-008 dice "single + bulk". `docs/16 §34.2` sólo expone `mark-all-read` (todas unread). Introducir bulk selectivo `mark-many-read` con lista de IDs requiere: (a) validación adicional de tamaño (¿límite 50 como PB §4.2 US-031?), (b) response con conteo, (c) tests adicionales. Para MVP, el patrón "mark-all-read" cubre el 90% del caso demo. Bulk selectivo puede considerarse Future.

### Decisión formal

```text
US-072 implementa exactamente dos endpoints:
- `PATCH /api/v1/notifications/:notificationId/read` (single).
- `POST /api/v1/notifications/mark-all-read` (bulk global).

`POST /api/v1/notifications/mark-many-read` con lista de IDs = Future US, no listada en el backlog actual. La decisión se revisará cuando aparezca un caso demo que lo justifique (p.ej., si el organizer quiere marcar un subset visual seleccionado con checkboxes — Future UX).
```

### Rationale

* PB "single + bulk" se satisface con single + mark-all-read.
* Simplicidad MVP; menor superficie de tests y contrato.
* Reversibilidad: agregar `mark-many-read` en Future US no rompe consumidores actuales.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                          |
| Scope Guardrails     | `Explicitly Out of Scope`: bulk selectivo por lista de IDs → Future US.              |
| API                  | Sólo 2 endpoints.                                                                    |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 3 — Broadcast entre tabs (Q3)

### Respuesta PO/BA

Introducir WebSocket para broadcast entre tabs violaría MVP guardrails (`realtime chat/WebSocket` = Future explícito en múltiples doc). US-071 D2 ya declaró `refetchOnWindowFocus=true` y `refetchInterval=60s`; basta para sincronización eventual entre tabs sin infra adicional. La ventana de inconsistencia (60s como máximo) es aceptable para mark-as-read.

### Decisión formal

```text
Sin WebSocket ni SSE. La sincronización entre múltiples tabs del mismo usuario descansa exclusivamente en el patrón TanStack heredado de US-071 D2:
- `refetchOnWindowFocus=true`: al cambiar de tab, el nuevo tab activo revalida.
- `refetchInterval=60000`: cada tab abierta refresca cada 60s.

Cuando el usuario marca leída una notif en la tab A, la tab B ve el cambio al recibir foco o al pasar 60s desde la última refetch. La ventana máxima de inconsistencia es 60s; aceptable para mark-as-read.

Realtime WebSocket/SSE para sync inmediato = Future US, requiere ADR.
```

### Rationale

* MVP-first; sin infra realtime.
* Patrón US-071 D2 ya aprobado y probado.
* Ventana de inconsistencia acotada.

### Impacto

| Sección              | Cambio                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                              |
| Scope Guardrails     | Realtime WebSocket/SSE explícitamente Out of Scope.                                       |
| Notes                | Documentar riesgo aceptado: ventana máxima 60s.                                          |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Filtro `channel` en `mark-all-read` (Q4)

### Respuesta PO/BA

US-071 D5 aprobada agregó `channel` como query param opcional en `GET /api/v1/notifications` con default `in_app` para dedup contra `email_simulated`. Sin `channel` en `mark-all-read`, el bulk marcaría también registros `email_simulated` (invisibles al usuario), rompiendo la consistencia del badge unread. Para paridad con US-071 D5, `mark-all-read` debe aceptar el mismo query param con el mismo default.

### Decisión formal

```text
`POST /api/v1/notifications/mark-all-read` acepta query param opcional `channel ∈ {in_app | email_simulated | all}` con default `in_app`. Cuando el cliente no envía `channel`, el backend marca únicamente registros `channel='in_app'` del usuario que estén `status='unread'`. Se registra Documentation Alignment con `docs/16 §34.2` para actualizar la tabla `Endpoints`.
```

### Rationale

* Paridad con US-071 D5.
* Prevención del bug: badge queda sincronizado con lo que el usuario ve.
* Zod validation retrocompatible: default `in_app`.

### Impacto

| Sección              | Cambio                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                          |
| Acceptance Criteria  | AC-02 explicita default `channel=in_app`.                                            |
| Technical Notes      | Backend: query param + Zod.                                                          |
| API                  | Tabla actualizada.                                                                    |
| Documentation Alignment | `docs/16 §34.2` extensión de query params.                                          |
| Test Scenarios       | Verificar que `channel=email_simulated` marca sólo esos registros; default marca sólo `in_app`. |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** durante Technical Spec para confirmar el schema Zod y la query SQL.

---

## Decisión 5 — Response shape (Q5)

### Respuesta PO/BA

`docs/16 §34.2` declara `204 No Content` para ambos endpoints. Introducir un response body con `{notification, unreadCount}` requiere: (a) query adicional para computar `unreadCount`, (b) cambio del contrato canónico, (c) sincronización manual con `docs/16`. El frontend puede computar `unreadCount` localmente via optimistic + refetch periódico (US-071 D2).

### Decisión formal

```text
Ambos endpoints (`PATCH single` y `POST mark-all-read`) responden `204 No Content` sin body. El frontend:
- En `PATCH single`: al recibir 204, aplica el optimistic update definitivo y decrementa el `unreadCount` local en 1 (invalidando la query key `['notifications', 'me', 'unreadCount']`).
- En `POST mark-all-read`: al recibir 204, invalida las queries `['notifications', 'me', …]` completo y el `unreadCount` a 0.
```

### Rationale

* Alineación con `docs/16 §34.2`.
* Reduce carga backend (sin query adicional).
* TanStack invalidación es idiomática y suficiente.

### Impacto

| Sección              | Cambio                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                          |
| Acceptance Criteria  | AC-01/AC-02 declaran 204.                                                            |
| Technical Notes      | Frontend documenta la lógica de invalidación tras 204.                              |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Ratificación mark-as-read explícito (Q6, parcial)

### Respuesta PO/BA

US-071 D6 aprobada ya definió: "US-071 NO dispara mark-as-read. Alcance exclusivo de US-072". Se ratifica aquí en US-072: el click en un item de la campanita NO dispara mark-as-read automáticamente. El mark-as-read siempre requiere acción explícita del usuario (botón "Marcar leída" en el item o "Marcar todas como leídas" en el footer del dropdown).

### Decisión formal

```text
Mark-as-read es SIEMPRE una acción explícita del usuario:
- Botón "Marcar leída" por notification item (dispara `PATCH single`).
- Botón "Marcar todas como leídas" en el footer del dropdown (dispara `POST mark-all-read`).

El click sobre un item que sólo navega al deep link (AC-02 US-071) NO marca la notif como leída. El usuario debe pulsar explícitamente el botón "Marcar leída" para actualizar `read_at`.

Auto-mark-as-read = Future US, requiere ADR (cambia semántica de UX y afecta el badge).
```

### Rationale

* Ratificación de US-071 D6.
* Boundary preservado: US-071 = listar/navegar; US-072 = marcar.
* Predictibilidad UX: usuarios saben cuándo marcan.

### Impacto

| Sección              | Cambio                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                          |
| UX / UI Notes        | Botón "Marcar leída" por item + "Marcar todas" en footer.                            |
| Scope Guardrails     | Auto-mark-as-read = Future.                                                          |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                | Decisión                                                                                                        | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Verbo HTTP canónico                  | `PATCH /notifications/:id/read` + `POST /notifications/mark-all-read` per `docs/16 §34.2`.                     | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  2 | Alcance de bulk                     | Sólo `mark-all-read`. `mark-many-read` selectivo = Future US.                                                   | PO                  | Sí                     | No requiere                                     |
|  3 | Broadcast entre tabs                | Sin WebSocket. TanStack `refetchOnWindowFocus` + `refetchInterval=60s` (US-071 D2). Ventana máx 60s.            | PO                  | Sí                     | No requiere                                     |
|  4 | Filtro `channel` en `mark-all-read` | Query param opcional `channel` default `in_app` (paridad con US-071 D5). Documentation Alignment `docs/16 §34.2`. | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  5 | Response shape                      | `204 No Content` para ambos endpoints. Frontend recomputa `unreadCount` via invalidación TanStack.               | PO                  | Sí                     | No requiere                                     |
|  6 | Mark-as-read explícito              | Ratificación US-071 D6: siempre acción explícita del usuario; sin auto-mark al click.                          | PO                  | Parcial                | No requiere                                     |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-072-mark-notification-read.md`.

Resumen: Metadata (Backlog Item, Feature, Status → Ready for Approval, Approval Metadata), Business Context (Dependencies ampliadas + PO/BA Decisions D1..D6), Traceability con IDs canónicos (`FR-NOTIF-002` primario, `UC-NOTIF-002`, `BR-NOTIF-004/005/007`, `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`), Scope Guardrails ampliado, AC-01..AC-09, EC-01..EC-05, VR-01..VR-04, SEC-01..SEC-03, Technical Notes con backend + frontend, Test Scenarios TS-01..TS-09 + E2E + A11Y, DoR/DoD.

---

## 5. Documentation Alignment Required

| Documento / Fuente                     | Conflicto                                                                    | Decisión vigente                                                                              | Acción recomendada                                                                                                    | ¿Bloquea aprobación? |
| -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.2` (query param `channel`) | No expone `channel` en `mark-all-read`.                                       | D4 agrega `channel` opcional con default `in_app` (paridad con US-071 D5).                    | Ampliar tabla `Endpoints` con el nuevo query param en `docs/16 §34.2`.                                                | No                   |
| PB-P2-008 Traceability                 | Verificar completitud.                                                        | US-072 refinada declara IDs canónicos (`FR-NOTIF-002, UC-NOTIF-002, BR-NOTIF-004/005/007`).    | Ampliar Traceability del backlog item.                                                                                | No                   |
| `docs/14 §Notifications`                | Ya lista `MarkNotificationAsReadUseCase` (§730). Falta `MarkAllNotificationsAsReadUseCase`. | Handler bulk global (D2).                                                                     | Documentar el nuevo use case bulk.                                                                                    | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                                       |
| User Story file path                         | `management/user-stories/US-072-mark-notification-read.md`                                                                                                                |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                                       |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-072-decision-resolution.md`                                                                                              |
| New User Story status                        | Ready for Approval                                                                                                                                                        |
| Remaining blockers                           | No                                                                                                                                                                        |
| Reason                                       | 6 decisiones D1–D6 formalizadas con respaldo documental (docs/16 §34.2, docs/9 FR-NOTIF-002, docs/4 BR-NOTIF-004/005/007, docs/14 §730/731, US-071 D2/D3/D5/D6). D1 y D4 marcadas como Tech Recommendation. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-072-mark-notification-read.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-072-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
