# User Story Refinement Review — US-072

## Source User Story File
management/user-stories/US-072-mark-notification-read.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-072-decision-resolution.md

## Review Date
2026-07-07 (revalidación: 2026-07-07)

## Revalidation Result (2026-07-07)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-072-decision-resolution.md`) y la actualización en sitio de la User Story:

| Verificación                                                                                                                                                | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (verbo HTTP) resuelta: `PATCH /notifications/:id/read` + `POST /notifications/mark-all-read` per `docs/16 §34.2`.                                          | OK        |
| Q2 (bulk scope) resuelta: sólo `mark-all-read`; `mark-many-read` = Future US.                                                                                | OK        |
| Q3 (broadcast tabs) resuelta: TanStack `refetchOnWindowFocus` + `refetchInterval=60s` (US-071 D2). Sin WebSocket.                                            | OK        |
| Q4 (filtro `channel`) resuelta: query param opcional con default `in_app` (paridad con US-071 D5).                                                          | OK        |
| Q5 (response shape) resuelta: `204 No Content` para ambos; frontend recomputa `unreadCount` via invalidación TanStack.                                       | OK        |
| Q6 (ratificación mark-as-read explícito) resuelta: ratificación US-071 D6. Sin auto-mark.                                                                    | OK        |
| Traceability corregida: `FR-NOTIF-002` (primario), `UC-NOTIF-002`, `BR-NOTIF-004/005/007`, `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.                  | OK        |
| Backlog Item declarado (`PB-P2-008`). API tabla corregida con verbos canónicos.                                                                             | OK        |
| AC reescritos (AC-01..AC-09), EC ampliados (EC-01..EC-05), VR/SEC/Test ampliados con optimistic + rollback + no-revelación 404.                              | OK        |
| Documentation Alignment Required (3 ítems, no bloqueantes).                                                                                                 | OK        |
| Sin scope creep (bulk selectivo, mark-as-unread, auto-mark, realtime permanecen Out of Scope).                                                              | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| User Story ID                              | US-072                                                                                                                          |
| File Path                                  | `management/user-stories/US-072-mark-notification-read.md`                                                                      |
| Backlog Item                               | PB-P2-008 — Marcar notificaciones como leídas (single + bulk) (P2, Should Have, posición 1 de 1)                                 |
| Epic                                       | EPIC-NOT-001                                                                                                                    |
| Estado actual                              | Draft                                                                                                                            |
| Estado recomendado                         | Needs Refinement                                                                                                                 |
| Nivel de riesgo                            | Bajo                                                                                                                             |
| Calidad general                            | Media                                                                                                                            |
| Requiere decisión PO                       | Sí                                                                                                                               |
| Requiere decisión técnica                  | Sí                                                                                                                               |
| Requiere decisión QA                       | No                                                                                                                               |
| Requiere decisión Seguridad                | No                                                                                                                               |
| Decision Resolution artifact found         | No                                                                                                                              |
| User Story file updated                    | No                                                                                                                              |
| Refinement review artifact created/updated | Yes                                                                                                                              |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-072-refinement-review.md`                                                        |

---

## 2. Diagnóstico PO/BA

US-072 formaliza el mark-as-read (single + bulk) de la bandeja unificada consumida por US-071 (aprobada) y, en Future, por la bandeja vendor. El requerimiento canónico es `FR-NOTIF-002` (`docs/9 §521`): "El sistema debe permitir al usuario consultar sus notificaciones in-app **y marcarlas como leídas**"; `UC-NOTIF-002` (`docs/8 §675`) documenta el use case; `BR-NOTIF-004` (`docs/4 §391`) define el `read_at` como acuse de lectura. `docs/16 §34.2` ya declara la superficie API: `PATCH /notifications/:notificationId/read` (single) y `POST /notifications/mark-all-read` (bulk global).

Ventajas del contexto: el patrón consumidor ya está aprobado en US-071 (query key TanStack, `refetchInterval=60s`, badge unread con formato `9+`). El endpoint canónico está catalogado en `docs/14 §730 MarkNotificationAsReadUseCase`. La invalidación TanStack está prevista en US-071 D6.

Sin embargo, el archivo llega con cinco bloques de problemas:

1. **Traceability incorrecta.** `FR-NOTIF-006` es "no push/SMS/WhatsApp en MVP" (`docs/9 §525`); el canónico primario es `FR-NOTIF-002`. `BR-NOTIF-006` es "WhatsApp fuera de alcance" (`docs/4 §393`); el canónico primario es `BR-NOTIF-004` (`read_at`). NFRs vacíos (deberían ser `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`). Backlog Item no declarado.

2. **Contradicción de verbo HTTP entre US-072 y `docs/16 §34.2`.** La US declara `POST /api/v1/notifications/:id/read`; `docs/16 §34.2` declara `PATCH /notifications/:notificationId/read`. US-071 D3 y la Technical Spec de US-071 asumen el verbo canónico de `docs/16 §34.2`. Decisión bloqueante: canónico es PATCH; corregir US-072.

3. **Alcance de bulk ambiguo.** PB-P2-008 dice "single + bulk". `docs/16 §34.2` sólo expone `POST /notifications/mark-all-read` (bulk global de todo unread). ¿Se agrega también un endpoint de bulk selectivo por lista de IDs? Recomendación: mantener sólo `mark-all-read` en MVP; bulk selectivo Future.

4. **Filtro por `channel` para consistencia con US-071 D5.** US-071 D5 formalizó default `channel=in_app` en el listado (dedup con `email_simulated`). Para consistencia, `POST /notifications/mark-all-read` debería aceptar el mismo query param `channel` opcional con default `in_app`. Sin decisión, el mark-all-read podría marcar registros `email_simulated` invisibles al usuario, generando confusión y mal cálculo del badge.

5. **AC delgados y decisiones UX abiertas.** AC-01/AC-02 no especifican response shape (`docs/16 §34.2` declara `204 No Content`), comportamiento optimistic UI, rollback ante 404/403, broadcast entre tabs, contadores del badge, etc. Faltan AC para 401, 403, 404, idempotencia (`read_at != null`), performance, i18n del feedback.

Adicionalmente, hay un solapamiento potencial con US-071: la nota "Cache TanStack" y `State Management: TanStack optimistic` sugieren mutations en el frontend, lo cual es alcance correcto de US-072 (US-071 sólo lista). Debe declararse explícitamente que US-072 provee las mutations y la invalidación de las query keys de US-071 (`['notifications', 'me', …]`, `['notifications', 'me', 'unreadCount']`).

Sin resolver Q1–Q5 (bloqueantes) y Q6 opcional, no pueden reescribirse AC/EC/VR/Technical Notes de forma consistente con `docs/16 §34.2` y US-071.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                       | Impacto                                                                                    | Recomendación                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Traceability con IDs INCORRECTOS: `FR-NOTIF-006` (no push) y `BR-NOTIF-006` (WhatsApp).                                                                                                                          | Rompe trazabilidad académica.                                                              | Reemplazar por canónicos: FR = `FR-NOTIF-002` (primario); UC = `UC-NOTIF-002`; BR = `BR-NOTIF-004` (read_at), `BR-NOTIF-005` (aislamiento); NFR = `NFR-PERF-001, NFR-A11Y-001..003, NFR-USAB-001`. |
| Alta      | Contradicción de verbo HTTP: US-072 dice `POST`; `docs/16 §34.2` dice `PATCH .../read`. US-071 D3 asumió `PATCH` (canónico).                                                                                    | Sin decisión, el frontend implementa un verbo que el backend no expone.                    | Resolver Q1 (Tech + PO). Canónico = `PATCH /api/v1/notifications/:notificationId/read` + `POST /api/v1/notifications/mark-all-read` per `docs/16 §34.2`.                   |
| Alta      | Alcance de bulk ambiguo. PB dice "single + bulk"; `docs/16 §34.2` sólo tiene `mark-all-read`.                                                                                                                    | Sin decisión, incierto si implementar `mark-many-read` con lista de IDs.                    | Resolver Q2 (PO). Recomendación: sólo `mark-all-read` en MVP; `mark-many-read` selectivo = Future US.                                                                       |
| Alta      | Filtro por `channel` para consistencia con US-071 D5. `mark-all-read` sin filtro marcaría registros `email_simulated` invisibles.                                                                              | Badge unread inconsistente con lo que el usuario ve; posible ruido en demo.                | Resolver Q4 (Tech + PO). Recomendación: `POST /mark-all-read?channel=in_app` (default), extensión de la tabla `docs/16 §34.2` (Documentation Alignment).                    |
| Media     | AC-01 y AC-02 delgados. No definen response, optimistic rollback, aislamiento, idempotencia, performance.                                                                                                       | QA no puede asertar.                                                                       | Reescribir con AC-01..AC-09 (patrón US-071 aprobada).                                                                                                                       |
| Media     | Broadcast entre tabs del mismo usuario. TanStack `refetchOnWindowFocus=true` de US-071 lo cubre; ratificar explícitamente.                                                                                     | Sin ratificación, UX asíncrona entre tabs podría sorprender.                              | Resolver Q3 (PO). Confirmar: no WebSocket; TanStack `refetchInterval=60s` + `refetchOnWindowFocus` bastan.                                                                 |
| Media     | Optimistic UI con rollback. Frontend debe manejar 404 (notif eliminada), 403 (ajena), errores 5xx.                                                                                                              | Sin especificación, la UI puede quedar inconsistente ante errores.                          | Definir contrato optimistic: aplicar `read_at=now()` local, revertir ante error 4xx/5xx con toast de error localizado.                                                     |
| Media     | Endpoint URL: US-072 dice `POST /api/v1/notifications/:id/read` y `/read-all`. `docs/16 §34.2` dice `PATCH /notifications/:notificationId/read` y `POST /notifications/mark-all-read`. Verbo y path difieren. | Documentation Alignment y decisión PO/Tech.                                                | Cubierto por Q1.                                                                                                                                                            |
| Media     | Auto-mark-as-read al click en un item (Q6 US-071 se decidió NO). Ratificar en US-072.                                                                                                                        | Sin ratificación, US-071 podría implementar auto-mark que solape con US-072.               | Resolver Q6. Ratificación: mark-as-read siempre explícito (D6 US-071 ya lo declara). US-072 provee el endpoint y la mutation TanStack; el trigger del cliente es el usuario. |
| Media     | Backlog Item no declarado.                                                                                                                                                                                    | Pérdida de trazabilidad.                                                                   | Agregar `Backlog Item: PB-P2-008`.                                                                                                                                          |
| Baja      | `i18n Notes: 4 locales` sin enumerar.                                                                                                                                                                          | QA puede no cubrir todos.                                                                  | Enumerar (`es-LATAM, es-ES, pt, en`).                                                                                                                                        |
| Baja      | Dependencies `US-068..US-071` correcto en alcance pero sin especificar `US-034` como origen del corpus de notifs demo.                                                                                          | Handoff poco explícito.                                                                    | Ampliar Dependencies.                                                                                                                                                        |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                       |
| No introduce contratos firmados      | Pass      | —                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | Sin surface push; sólo actualiza `read_at`.                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                            |
| Respeta backend como source of truth | Pass      | Backend valida ownership; frontend optimistic con rollback.              |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-034/US-068..US-070 sin cambios.                     |
| No introduce RAG/vector DB           | Pass      | —                                                                       |
| No introduce multi-tenant enterprise | Pass      | Ownership por `user_id`.                                                 |
| No introduce P4/Future scope         | Pass      | `mark-many-read` selectivo permanece Future.                             |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                                       | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail / Not Testable | "`read_at` poblado" sin definir verbo, response 204, idempotencia, aislamiento, optimistic UI. | Reescribir tras Q1. Ejemplo: "Dado un usuario autenticado propietario de una `Notification` con `status='unread'`, cuando invoca `PATCH /api/v1/notifications/:id/read`, entonces el backend actualiza `read_at=now()`, `status='read'`, retorna `204`; el frontend aplica optimistic update sobre las queries `['notifications', 'me', …]` y `['notifications', 'me', 'unreadCount']`."                |
| AC-02 | Needs Detail / Not Testable | "Todas read" sin definir filtro por `channel`, response, aislamiento.                    | Reescribir tras Q1 + Q4. Ejemplo: "Dado un usuario con N notifs `status='unread'` en `channel='in_app'`, cuando invoca `POST /api/v1/notifications/mark-all-read?channel=in_app` (default `in_app`), entonces el backend marca todas como `read_at=now(), status='read'`, retorna `204`; el frontend invalida el badge."                                                                                |

AC faltantes:
- AC para no autenticado → 401.
- AC para aislamiento (BR-NOTIF-005): 403 en single al detalle ajeno; `mark-all-read` sólo afecta las notifs del usuario.
- AC para notif no existente → 404.
- AC para idempotencia (`read_at != null`): 204 (no cambia; alineado con EC-01).
- AC para optimistic rollback ante error 4xx/5xx.
- AC para performance P95 < 1.5 s (`NFR-PERF-001`).
- AC para accesibilidad del botón y del bulk (`NFR-A11Y-001..003`).
- AC para i18n del feedback (toast de éxito/error) en 4 locales.
- AC para invalidación TanStack coordinada con US-071 (query keys y `unreadCount`).

---

## 6. Gaps Detectados

### Producto / Negocio
- Definir alcance de bulk (`mark-all-read` sí; selectivo Future).
- Ratificar filtro `channel=in_app` por default (Q4).
- Ratificar auto-mark-as-read NO en click (Q6).

### Backend / API
- Reuso del `MarkNotificationAsReadUseCase` (docs/14 §730) y agregar `MarkAllNotificationsAsReadUseCase`.
- Zod validation: `:notificationId` UUID; query param `channel ∈ {in_app, email_simulated, all}` default `in_app`.
- `NotificationOwnerPolicy` reusado (US-071 SEC-02).
- No-revelación 404 para ajenos (`docs/16 §34.2` implícito con 403/404).

### Frontend / UX
- Hooks TanStack:
  - `useMarkNotificationAsRead()` → mutation con `useMutation({ mutationFn, onMutate optimistic, onError rollback, onSuccess invalidate })`.
  - `useMarkAllNotificationsAsRead()` → similar con invalidación amplia.
- Optimistic update:
  - Actualizar los caches `['notifications', 'me', { channel: 'in_app', status, page, pageSize }]` y `['notifications', 'me', 'unreadCount']`.
  - Rollback ante error.
- Toast localizado en 4 locales.

### Base de Datos
- Sin migración. Reuso `idx_notifications_user_unread`.

### Seguridad / Autorización
- Ownership check en use case.
- 401 sin sesión (VR-01).
- 403 al detalle ajeno + no-revelación 404 (SEC-01 debe precisarse).

### QA / Testing
- IT: single mark, mark-all, idempotencia, aislamiento (2 usuarios en paralelo), 401, 403, 404, filtro por channel, response 204.
- Frontend: UT optimistic + rollback.
- E2E: click Mark all → badge → 0.
- Contract test con MSW (US-121).
- Regresión: `unreadCount` de US-071 se invalida correctamente.

### Seed / Demo
- Reuso.

### Documentación / Trazabilidad
- IDs canónicos, Backlog Item, ampliar `Related Document(s)`.
- Documentation Alignment con verbo HTTP (Q1) y filtro `channel` (Q4).

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                    | Bloquea aprobación | Responsable        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech + PO    | Q1. Verbo HTTP canónico: `PATCH /api/v1/notifications/:notificationId/read` + `POST /api/v1/notifications/mark-all-read` (per `docs/16 §34.2`) o `POST` en ambos (US-072). Recomendación: `docs/16 §34.2` prevalece (`PATCH` single + `POST` bulk).                                                                                                                                                                          | Sí                 | Tech Lead + PO     |
| PO           | Q2. Alcance de bulk. `mark-all-read` sí; ¿se agrega `mark-many-read` con lista de IDs para bulk selectivo? Recomendación: sólo `mark-all-read` en MVP; selectivo = Future US.                                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q3. Broadcast entre tabs del mismo usuario. Recomendación: sin WebSocket; TanStack `refetchInterval=60s` + `refetchOnWindowFocus=true` heredado de US-071 D2.                                                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| Tech + PO    | Q4. Filtro por `channel` en `mark-all-read`. Recomendación: query param opcional `channel ∈ {in_app, email_simulated, all}` con default `in_app` para dedup consistente con US-071 D5. Documentation Alignment con `docs/16 §34.2`.                                                                                                                                                                                          | Sí                 | Product Owner + Tech Lead |
| PO           | Q5. Response shape: 204 (No Content) según `docs/16 §34.2` o 200 con `{ notification, unreadCount }`? Recomendación: 204 alineado con `docs/16`; frontend calcula `unreadCount` localmente vía optimistic + refetch.                                                                                                                                                                                                        | Sí                 | Product Owner     |
| PO           | Q6 (ratificación). Auto-mark-as-read al click en un item de la campanita. US-071 D6 ya lo definió como "explícito, mark-as-read es acción del usuario en US-072". Ratificar: NO auto-mark en click; el usuario dispara la mutation explícitamente vía botón "Marcar leída".                                                                                                                                                    | Parcial            | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                     | Conflicto detectado                                                                                                                                    | Decisión vigente                                                                                                     | Acción recomendada                                                                                                                        | ¿Bloquea aprobación? |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.2` (verbo mark-as-read)   | US-072 declara `POST`; `docs/16` declara `PATCH` single + `POST` mark-all-read.                                                                        | Q1: `docs/16` prevalece.                                                                                              | Corregir la sección API de US-072.                                                                                                        | No                   |
| `docs/16 §34.2` (query param `channel`) | No expone `channel` explícito en `mark-all-read`.                                                                                                       | Q4: agregar `channel` opcional con default `in_app`.                                                                  | Ampliar tabla `Endpoints` con el nuevo query param.                                                                                        | No                   |
| PB-P2-008 Traceability                  | Verificar completitud.                                                                                                                                | US-072 refinada declara IDs canónicos (`FR-NOTIF-002, UC-NOTIF-002, BR-NOTIF-004/005/007, NFR-PERF-001, NFR-A11Y-*`). | Ampliar Traceability del backlog item.                                                                                                    | No                   |
| `docs/14 §Notifications`                | Ya declara `MarkNotificationAsReadUseCase` (§730). Falta `MarkAllNotificationsAsReadUseCase`.                                                          | Agregar el use case bulk global.                                                                                     | Documentar el use case bulk.                                                                                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-072-mark-notification-read.md`                                                                                                                                                                                                                                                                                   |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                                                                                          |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-072-decision-resolution.md`                                                                                                                                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                                                                                          |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-072-refinement-review.md`                                                                                                                                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                                                                                         |
| Reason                                     | 5 preguntas bloqueantes Q1–Q5 + Q6 ratificación parcial. Q1 corrige contradicción de verbo HTTP con `docs/16 §34.2` (impacto directo en el contrato consumido por US-071 y el frontend). Q2 acota bulk a `mark-all-read`. Q4 asegura consistencia con US-071 D5 (`channel=in_app` default). Reescritura de AC/Technical Notes depende de Q1–Q5. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-008 (posición 1 de 1)`.
- `Feature`: "Mark notification as read (single + all)".
- `User Role`: "Organizer / Vendor / Admin (usuarios con notifs propias)".
- `Status → Ready for Approval`.

### Business Context
- Dependencies ampliadas: US-034 (origen del corpus), US-068..US-070 (emisores), US-071 (surface consumidor aprobada; provee las query keys a invalidar).

### PO/BA Decisions Applied
- Sección nueva con D1..D6.

### Traceability
- FRD → `FR-NOTIF-002` (primario).
- UC → `UC-NOTIF-002`.
- BR → `BR-NOTIF-004` (read_at), `BR-NOTIF-005` (aislamiento), `BR-NOTIF-007` (idioma para toasts).
- Permission → `Owner (user_id = session.userId)`.
- Data Entity → `Notification, User`.
- API → `PATCH /api/v1/notifications/:notificationId/read`, `POST /api/v1/notifications/mark-all-read?channel=in_app`.
- NFR → `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.
- Related Documents → `/docs/4 §BR-NOTIF-004/005/007`, `/docs/6 §Notification`, `/docs/8 §UC-NOTIF-002`, `/docs/9 §FR-NOTIF-002`, `/docs/10 §NFR-PERF-001 §NFR-A11Y-001..003`, `/docs/14 §730 §731`, `/docs/16 §34.2`, `/docs/18 §18.1`.
- Backlog Item.

### Scope Guardrails
- Out of Scope: bulk selectivo (`mark-many-read` por lista de IDs) — Future US; mark-as-unread — Future; auto-mark al click (US-071 D6 lo prohíbe); realtime WebSocket; push; SMS/WhatsApp.

### Acceptance Criteria
- AC-01..AC-09 (single, bulk, idempotencia, aislamiento, 401, 404, optimistic rollback, performance, i18n).

### Edge Cases
- EC-01 (ya leída) — ratificar 204 idempotente.
- EC-02 (bulk sin unread) — 204.
- EC-03 (bulk race con nueva notif emitida durante el mark-all) — nueva notif queda unread.
- EC-04 (optimistic rollback ante 4xx/5xx).
- EC-05 (broadcast entre tabs — TanStack refresh natural).

### Validation Rules
- VR-01: sesión activa; 401 sin.
- VR-02: `:notificationId` UUID válido; 400 si no.
- VR-03: `channel ∈ {in_app, email_simulated, all}` (default `in_app`); 400 si no.
- VR-04: `user_id = session.userId` (BR-NOTIF-005) — no revelar 404 vs 403 según `docs/19`.

### Authorization & Security
- SEC-01: Ownership por `NotificationOwnerPolicy` (reuso US-071).
- SEC-02: 401 sin sesión; 403 a ajena; no-revelación 404 para IDs desconocidos.
- SEC-03: `mark-all-read` sólo afecta `WHERE user_id = session.userId`.

### Technical Notes (Backend)
- `MarkNotificationAsReadUseCase` (existente, `docs/14 §730`): mantener; validar ownership.
- Nuevo `MarkAllNotificationsAsReadUseCase`:

  * Input: `{ userId, channel?: 'in_app' | 'email_simulated' | 'all' }` (default `in_app`).
  * SQL: `UPDATE notifications SET read_at=now(), status='read' WHERE user_id=$1 AND status='unread' AND (channel=$2 OR $2='all')`.
- Zod schema para query param `channel` y `:notificationId` UUID.
- Response `204 No Content`.

### Technical Notes (Frontend)
- Hooks:
  * `useMarkNotificationAsRead()` con `onMutate` optimistic (`read_at=now()`, `status='read'`), `onError` rollback, `onSuccess` invalida `['notifications', 'me', …]` y `['notifications', 'me', 'unreadCount']`.
  * `useMarkAllNotificationsAsRead()` invalida broadly.
- Botón "Marcar leída" en cada `NotificationItem` (US-071 lo mostraba con "aria-disabled" cuando `link=null`); ahora habilitado siempre para unread.
- Botón "Marcar todas como leídas" en el footer del dropdown.
- i18n toasts en 4 locales.

### API
| Method | Endpoint                                              | Purpose                                                                        |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| PATCH  | `/api/v1/notifications/:notificationId/read`             | Mark single (ownership; 204; idempotente).                                     |
| POST   | `/api/v1/notifications/mark-all-read?channel=in_app`     | Mark all unread of user (query param opcional `channel` default `in_app`).     |

### Observability / Audit
- Correlation ID: Yes.
- Log Event Required: No (endpoint no crítico; puede loggearse resumen `affected=N` en `mark-all-read` como métrica auditable).
- AdminAction: No.

### Test Scenarios
- TS-01..TS-09 (single, bulk, idempotencia, aislamiento, 401, 404, filtro channel, response 204, optimistic rollback).
- E2E-01 (click Mark all → badge = 0).
- Contract test con MSW.
- A11Y del botón.

### Definition of Ready / Done
- DoR: PO/BA validó.
- DoD: single + bulk verdes, optimistic rollback verificado, i18n 4 locales, A11Y sin violaciones, contract test verde, PO valida en demo.

### Notes
- Handoff explícito con US-071 (surface consumidor); las query keys canónicas se declaran en US-071 y esta US las invalida.
- Bulk selectivo (`mark-many-read`) queda Future US.

---

## 11. Recomendación Final

`Needs Refinement`

Q1–Q5 bloqueantes + Q6 ratificación parcial. Q1 corrige contradicción documental crítica con `docs/16 §34.2`. Q4 asegura consistencia con US-071 D5 aprobada. Todas las decisiones son deterministas desde documentación aprobada.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver`.

---

User Story file updated: No
Path: management/user-stories/US-072-mark-notification-read.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-072-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
