# PO/BA Decision Resolution — US-071

## Source User Story File
management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-071-refinement-review.md

## Decision Date
2026-07-06

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-071                                                                                              |
| User Story file path                         | `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`                             |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-071-refinement-review.md`                            |
| Existing decision resolution found           | No                                                                                                  |
| Backlog Item                                 | PB-P2-004 — Notificación T-7 (tareas) (P2, posición 2 de 2)                                          |
| Epic                                         | EPIC-NOT-001                                                                                        |
| Estado antes de decisiones                   | Needs Refinement                                                                                    |
| Cantidad de preguntas revisadas              | 6 (Q1–Q5 bloqueantes + Q6 parcial)                                                                 |
| Decisiones PO/BA tomadas                     | 6 (D1 bandeja unificada + ordenamiento; D2 badge + toggle unread; D3 deep link server-side; D4 confiar en banner US-032; D5 filtro `channel=in_app`; D6 mark-as-read explícito en US-072) |
| Decisiones técnicas recomendadas             | 2 (D3 patrón de link server-side y D5 query param `channel` — ambas requieren validación Tech Lead en Technical Spec) |
| ¿Desbloquea aprobación?                      | Sí                                                                                                  |
| User Story file updated                      | Yes                                                                                                 |
| Decision Resolution artifact created/updated | Yes                                                                                                 |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-071-decision-resolution.md`                        |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.        |

---

## 2. Decisiones Respondidas

## Decisión 1 — Alcance del listado y ordenamiento (Q1)

### Pregunta original

> ¿La campanita muestra sólo T-7 o todas las notificaciones? ¿Ordenamiento default?

### Respuesta PO/BA

`FR-NOTIF-002` (`docs/9`) declara que el usuario debe poder "consultar sus notificaciones in-app y marcarlas como leídas" — sin filtro por tipo. `BR-NOTIF-002` enumera 7+ tipos disparadores (T-7, `quote_request_received`, `booking_confirmed`, etc.). El endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico. Restringir la campanita a `type='task_due_soon'` obligaría al organizer a mirar dos bandejas y contradice el patrón UX de bandeja unificada.

### Decisión formal

```text
La campanita de US-071 muestra TODAS las notificaciones del organizer (bandeja unificada), sin filtro por `type`. El ordenamiento default es "unread primero, luego `sent_at DESC`". Los items con `type='task_due_soon'` reciben destacado visual (badge o color) para señalar la naturaleza T-7 sin filtrar el resto de tipos.
```

### Rationale

* Alineado con FR-NOTIF-002 y BR-NOTIF-002.
* Reusa el endpoint canónico de `docs/16 §34.2` sin cambios de contrato.
* Patrón UX de bandeja unificada es consistente con otras plataformas.
* El destacado visual (badge/color T-7) cubre el intento original de "T-7 en top" sin comprometer visibilidad de otros tipos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata                | Ajustar `Feature` a "Bandeja de notificaciones organizer" (o mantener el actual con nota).                                                                                                 |
| PO/BA Decisions Applied | Agregar D1.                                                                                                                                                                                |
| Acceptance Criteria     | Reescribir AC-01 con ordenamiento explícito.                                                                                                                                              |
| Scope Guardrails        | Nota: la US-071 entrega bandeja unificada, no listado exclusivo T-7.                                                                                                                       |
| Test Scenarios          | TS-01 verifica ordenamiento; agregar aserción de destacado visual T-7.                                                                                                                     |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Filtro unread/all y badge de conteo (Q2)

### Pregunta original

> ¿La lista incluye leídas por default? ¿Badge del header con conteo unread?

### Respuesta PO/BA

`idx_notifications_user_unread` (`docs/18 §18.1`) sugiere que la lectura de unread es un ciudadano de primera clase. Al mismo tiempo, mostrar sólo unread al abrir la campanita esconde el historial reciente y sorprende al organizer que ya marcó como leído. El patrón UX estándar es: badge muestra unread; el listado por default muestra todo con unread destacado.

### Decisión formal

```text
Al abrir la campanita, el listado por default retorna TODAS las notificaciones del usuario (sin filtro `status`), ordenadas por "unread primero, luego `sent_at DESC`". El header muestra un badge con el conteo de notificaciones `status='unread'`, con formato "9+" cuando el conteo excede 9. El dropdown ofrece un toggle "Sólo no leídas" que aplica el filtro `?status=unread` en el request. Sin toggle activo, `filter` no se envía y el backend retorna todo.
```

### Rationale

* Preserva la utilidad histórica del listado.
* Alinea el badge con el índice parcial `idx_notifications_user_unread`.
* El toggle es opt-in, no fuerza el default.
* El backend expone `?status=unread` como query param opcional (Documentation Alignment con `docs/16 §34.2`, no bloqueante).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D2.                                                                                                              |
| Acceptance Criteria     | AC-01 con default sin filtro `status`; AC nuevo para badge (formato "9+"); AC nuevo para toggle "Sólo no leídas".         |
| UX / UI Notes           | Definir badge, toggle y estado activo.                                                                                    |
| Technical Notes         | Frontend: `useNotifications({ filter, page })` con `filter` opcional.                                                    |
| Test Scenarios          | TS agregado para badge con conteo, toggle activo/inactivo, formato "9+".                                                 |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Contrato del `link` server-side (Q3)

### Pregunta original

> ¿El `link` en `NotificationResponseDto` se genera server-side o cliente? Para T-7, ¿ruta canónica?

### Respuesta PO/BA

`docs/16 §34.3` declara `link: string | null` sin patrón. Generar el link cliente-side obliga a cada frontend a conocer las rutas por tipo, duplica lógica y complica la evolución (una nueva versión de rutas requiere despliegue coordinado). US-032 aprobada expone `GET /api/v1/events/:eventId/tasks?range=7d`, y el frontend organizer usa el prefijo `/organizer` (patrón declarado en `docs/15-Frontend-Architecture-Design.md`).

### Decisión formal

```text
El campo `link` de `NotificationResponseDto` (`docs/16 §34.3`) se genera SIEMPRE server-side por el use case `ListMyNotificationsUseCase` (o `CreateNotificationUseCase` al persistir el registro, según opte el Tech Lead) mediante un patrón declarativo por `type`:

| type                     | link (ejemplo)                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| task_due_soon            | /organizer/events/{payload.eventId}/tasks?range=7d                    |
| quote_request_received   | /vendor/quote-requests/{payload.quoteRequestId}                       |
| quote_received           | /organizer/quote-requests/{payload.quoteRequestId}/comparator          |
| quote_rejected           | /vendor/quotes/{payload.quoteId}                                      |
| quote_expired            | /vendor/quotes/{payload.quoteId}                                      |
| booking_confirmed        | /organizer/events/{payload.eventId}/bookings/{payload.bookingId}      |
| review_received          | /vendor/reviews/{payload.reviewId}                                    |
| vendor_approved          | /vendor/profile                                                       |
| vendor_rejected          | /vendor/profile                                                       |

Si el payload no permite calcular el link (recurso eliminado / soft-deleted / payload incompleto), `link=null` y la UI muestra el ítem sin CTA. El patrón se declara en `docs/16 §34.3` como tabla `link generation by type` (Documentation Alignment Required, no bloqueante).
```

Nota: la decisión formal aplicable a US-071 es exclusivamente la fila `task_due_soon`. Las demás filas se incluyen como referencia consistente para el Tech Lead — su ratificación por tipo pertenece a las respectivas US.

### Rationale

* Backend como source of truth (`docs/13 §Backend authorization`).
* Reusa el patrón US-032 (`?range=7d` aprobado) sin invención.
* `link=null` como fallback defensivo previene crashes cuando el recurso apuntado fue eliminado.
* Documentation Alignment Required con `docs/16 §34.3` (no bloqueante para US-071 al declarar la US explícitamente el patrón).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3 (con patrón para `task_due_soon` explícito).                                                                                                                    |
| Acceptance Criteria     | Reescribir AC-02 con formato exacto del link y comportamiento cuando `link=null`.                                                                                          |
| Edge Cases              | EC nuevo: `link=null` (ítem sin CTA).                                                                                                                                      |
| Technical Notes         | Backend: patrón por tipo declarado; Frontend: navegar sólo si `link != null`.                                                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

Requiere validación Tech Lead durante la Technical Specification para (a) elegir dónde vive el patrón (use case `List` vs `Create`), (b) formalizar el schema del `payload` por tipo, (c) documentar Documentation Alignment con `docs/16 §34.3`.

---

## Decisión 4 — Evento asociado en `cancelled` / `completed` (Q4)

### Pregunta original

> ¿La navegación desde una notif T-7 cuyo evento está `cancelled` o `completed` cambia el comportamiento?

### Respuesta PO/BA

US-032 (aprobada) ya muestra banners read-only para eventos en `completed`/`cancelled` en el checklist (`docs/9 §FR-TASK-011`). Introducir un toast previo o esconder el link duplicaría la comunicación y sorprendería al organizer que quiere ver el estado histórico. Alinear con el comportamiento existente de US-032 es coherente y minimiza cambios.

### Decisión formal

```text
Cuando el organizer hace click en una notif T-7 cuyo `payload.eventId` referencia un evento en `event.status ∈ {cancelled, completed}`, la navegación procede normalmente al deep link `/organizer/events/{eventId}/tasks?range=7d`. Es responsabilidad del checklist (US-032 aprobada) mostrar el banner read-only correspondiente. Si el evento fue eliminado (soft-delete) o el payload apunta a un `eventId` inexistente, el backend retorna `link=null` (patrón D3) y la UI muestra el ítem sin CTA.
```

### Rationale

* Reusa el patrón ya validado en US-032.
* Simplifica la lógica de US-071 (no requiere validación previa del estado del evento en el listado).
* La opción (c) del review (link=null para no-`active`) escondería contexto histórico útil al organizer.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                                |
| Acceptance Criteria     | Nota en AC-02 sobre el banner read-only de US-032.                                                                        |
| Edge Cases              | EC nuevo: click sobre evento `cancelled`/`completed` → navega y respeta banner US-032.                                    |
| Test Scenarios          | TS agregado (no bloqueante): verificar redirección exitosa cuando evento está `completed`.                                 |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Filtro `channel=in_app` para deduplicar (Q5)

### Pregunta original

> ¿La campanita filtra `channel='in_app'` para evitar duplicidad contra `channel='email_simulated'`?

### Respuesta PO/BA

US-034 D5 (aprobada) emite 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` por tarea. `docs/16 §34.2` no expone hoy filtro por `channel`. Mostrar ambos canales en la campanita produce duplicidad UX (mismo evento dos veces). La solución más limpia y compatible con futuras notificaciones (donde el mismo tipo podría emitirse en múltiples canales) es agregar un query param `channel` opcional.

### Decisión formal

```text
El endpoint `GET /api/v1/notifications` acepta un query param opcional `channel` con enum `in_app | email_simulated | all`, default `in_app` (compatible retroactivo: cuando el cliente no envía `channel`, se aplica `in_app`). La campanita (US-071) consume el default, mostrando únicamente registros `channel='in_app'`. Los registros `channel='email_simulated'` quedan disponibles para auditoría por herramientas admin (Future) pero no aparecen en el listado del organizer. Se registra Documentation Alignment Required con `docs/16 §34.2` para actualizar la tabla de query params.
```

### Rationale

* Deduplica UX sin descartar el registro `email_simulated` (mantiene evidencia académica).
* Default `in_app` es la lectura conservadora y no rompe consumidores actuales (US-071 y US-072 son los primeros consumidores reales).
* Zod validation en el controller: enum estricto.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D5.                                                                                                                                          |
| Acceptance Criteria     | AC-01 explicita `channel=in_app` como filtro implícito (default del endpoint).                                                                       |
| Technical Notes         | Backend: agregar query param en `ListMyNotificationsUseCase`; Frontend: no envía `channel` explícitamente y confía en el default.                    |
| Test Scenarios          | TS agregado: verificar que un evento con dos registros (in_app + email_simulated) aparece una sola vez en la campanita.                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

Requiere validación Tech Lead durante la Technical Specification para (a) formalizar el enum en Zod, (b) actualizar `docs/16 §34.2` (Documentation Alignment).

---

## Decisión 6 — Auto-mark-as-read en US-071 (Q6, parcial)

### Pregunta original

> ¿El click en la campanita dispara mark-as-read automáticamente o el mark-as-read es explícito en US-072?

### Respuesta PO/BA

US-072 (PB-P2-008 — Marcar notificaciones como leídas, single + bulk) es una historia dedicada que materializa el mark-as-read explícito. Incluir auto-mark-as-read en US-071 pisaría el alcance de US-072 y complicaría la trazabilidad. Mantener US-071 restringida a "listar + navegar" preserva el patrón "una historia, un alcance".

### Decisión formal

```text
US-071 NO dispara mark-as-read en ningún flujo. El click sobre un ítem SÓLO navega al `link` (o no hace nada si `link=null`). El mark-as-read (single + "marcar todas") es alcance exclusivo de US-072. El badge de conteo unread se actualiza vía invalidación del query TanStack cuando US-072 dispara la mutación `PATCH /notifications/:id/read` o `POST /notifications/mark-all-read`.
```

### Rationale

* Preserva boundaries entre US-071 y US-072.
* Simplifica US-071 (sin mutations).
* El badge se sincroniza vía TanStack invalidation al mergearse US-072 sin cambios en US-071.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                              |
| ----------------------- | ----------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D6.                                                                    |
| Scope Guardrails        | `Explicitly Out of Scope`: mark-as-read explícito → US-072.                    |
| UX / UI Notes           | Remover "Marcar leída" como Secondary Action.                                  |
| Test Scenarios          | AUTH-TS-01 mantiene 200 al listado; sin tests de mutation en US-071.           |

### ¿Bloqueaba aprobación?

Parcialmente (no bloqueaba en sentido estricto; su omisión evita solapamiento con US-072).

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                          | Decisión                                                                                                                                          | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                             |
| -: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ------------------------------------------------ |
|  1 | Alcance del listado y ordenamiento            | Bandeja unificada, ordenamiento `unread first, sent_at DESC`; T-7 destacada visualmente.                                                          | PO                  | Sí                     | No requiere                                      |
|  2 | Filtro unread/all y badge de conteo           | Default sin filtro; toggle opt-in `?status=unread`; badge unread con formato "9+".                                                                | PO                  | Sí                     | No requiere                                      |
|  3 | Contrato del `link` server-side               | Generado server-side por tipo. Para `task_due_soon` → `/organizer/events/{eventId}/tasks?range=7d`. `link=null` si recurso ausente.               | Tech Recommendation | Sí                     | Requiere validación Tech Lead en Technical Spec  |
|  4 | Evento asociado `cancelled` / `completed`     | Navegación sigue; el banner read-only de US-032 comunica el estado. `link=null` sólo si el evento fue eliminado.                                   | PO                  | Sí                     | No requiere                                      |
|  5 | Filtro `channel=in_app` para deduplicar       | Query param opcional `channel` con enum `in_app \| email_simulated \| all`, default `in_app`. Documentation Alignment con `docs/16 §34.2`.        | Tech Recommendation | Sí                     | Requiere validación Tech Lead en Technical Spec  |
|  6 | Auto-mark-as-read en US-071                   | No aplica. Alcance exclusivo de US-072. El badge se sincroniza por invalidación TanStack al mergearse US-072.                                    | PO                  | Parcial                | No requiere                                      |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Backlog Item` agregado: `PB-P2-004 — Notificación T-7 (tareas) (P2, posición 2 de 2)`.
- `Feature` refinado: "Bandeja de notificaciones organizer con destacado T-7".
- `Status` actualizado a `Ready for Approval`.
- `Last Updated` actualizado a `2026-07-06`.

### Business Context
- `Assumptions`: reformulado ("Notifs emitidas por US-034 aprobada; endpoint canónico `GET /api/v1/notifications` de `docs/16 §34.2`; DTO `NotificationResponseDto` con `link` server-side").
- `Dependencies`: agregadas US-034 (upstream, aprobada), US-032 (deep link, aprobada), US-072 (mark-as-read, downstream).

### PO/BA Decisions Applied
Sección nueva con D1..D6 y referencia a este artefacto.

### Traceability
- FRD → `FR-NOTIF-001, FR-NOTIF-002, FR-NOTIF-005, FR-NOTIF-007`.
- UC → `UC-NOTIF-001`.
- BR → `BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-005, BR-NOTIF-007`.
- Permission → `Recipient (user_id = session.userId)`.
- Data Entity → `Notification, User`.
- API → `GET /api/v1/notifications` (`docs/16 §34.2`).
- NFR → `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001, NFR-A11Y-002, NFR-A11Y-003`.
- Related Documents → ampliado a `/docs/4, /docs/6 §Notification, /docs/9, /docs/10, /docs/14 §Notifications, /docs/15, /docs/16 §34, /docs/18 §18.1`.
- Backlog Item → `PB-P2-004`.

### Scope Guardrails
- `Explicitly Out of Scope`: agregado "Mark-as-read (alcance US-072)", "Realtime WebSocket / push automático de nuevas notifs (Future)", "Notificaciones broadcast cross-rol (BR-NOTIF-005)".
- `Scope Notes`: "Bandeja unificada organizer; sin mutations en US-071".

### Acceptance Criteria
- AC-01 reescrito con paginación, ordenamiento explícito, badge y filtro `channel=in_app` implícito.
- AC-02 reescrito con formato exacto del deep link para `task_due_soon`.
- AC-03 nuevo (401 sin sesión).
- AC-04 nuevo (aislamiento BR-NOTIF-005).
- AC-05 nuevo (paginación estable).
- AC-06 nuevo (empty / loading / error con roles ARIA y copy localizado).
- AC-07 nuevo (A11Y del dropdown — teclado, foco, roles).
- AC-08 nuevo (i18n en 4 locales).
- AC-09 nuevo (performance P95 < 1.5 s).

### Edge Cases
- EC-01 mantenido (sin notifs).
- EC-02 nuevo (evento en `cancelled`/`completed` — navega y respeta banner US-032).
- EC-03 nuevo (recurso eliminado → `link=null`).
- EC-04 nuevo (paginación con eliminación intermedia).
- EC-05 nuevo (dedup contra `channel='email_simulated'`).

### Validation Rules
- VR-01 mantenido (401 sin sesión).
- VR-02 nuevo (`user_id = session.userId`).

### Authorization & Security Rules
- SEC-01 mantenido y precisado.
- SEC-02 nuevo (reuso de `NotificationOwnerPolicy` o guard equivalente).
- SEC-03 nuevo (no-revelación 404).

### Technical Notes
- Frontend actualizado (query key TanStack, política de refetch, componentes, hook).
- Backend actualizado (reuso del endpoint canónico, query param `channel`, `?status=unread` opcional).
- Database sin migraciones.
- API tabla actualizada.

### UX / UI Notes
- Empty/Loading/Error con roles ARIA definidos.
- Removida acción "Marcar leída" (alcance US-072).
- Definido badge con formato "9+".

### Test Scenarios
- Ampliados con TS-02..TS-08, NT-02, AUTH-TS-02.

### Definition of Ready / Done
- DoR: `[x] PO/BA validó`.
- DoD: A11Y con Axe, contract test verde, i18n 4 locales, P95 < 1.5 s, badge sincronizado.

### Notes
- Documentación explícita de handoff a US-072 y consumo de US-034 + US-032.
- Documentation Alignment Required con `docs/16 §34.2` (`channel` param) y `docs/16 §34.3` (`link` generation table + type `task_due_soon`).

---

## 5. Documentation Alignment Required

| Documento / Fuente                            | Conflicto detectado                                                                                                                                          | Decisión vigente                                                                                                                                 | Acción recomendada                                                                                                                                                                | ¿Bloquea aprobación? |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3` (enum `type`)                 | Declara `task_due`; el canónico persistido es `task_due_soon`.                                                                                                | `task_due_soon` (docs/6 §Notification, docs/18 §18.1, US-034 aprobada).                                                                          | Corregir `docs/16 §34.3` para usar `task_due_soon` en el enum.                                                                                                                    | No                   |
| `docs/16 §34.2` (query params)                | No expone `channel` ni `status` como query params.                                                                                                            | D5 (agregar `channel` opcional con default `in_app`) y D2 (agregar `status=unread` opcional).                                                    | Extender la tabla `Endpoints` en `docs/16 §34.2` con los dos query params, ambos opcionales.                                                                                     | No                   |
| `docs/16 §34.3` (`link`)                       | El DTO declara `link: string \| null` sin patrón.                                                                                                             | D3 formaliza el patrón por tipo (tabla `link generation by type`).                                                                                | Agregar tabla `link generation by type` en `docs/16 §34.3`, empezando con `task_due_soon`. Handoff a los responsables de otras US para completar por tipo.                        | No                   |
| `docs/16 §34.2` (verbo mark-as-read)          | Declara `PATCH /notifications/:notificationId/read`. Alcance real en US-072.                                                                                 | Verbo canónico documentado; US-072 lo materializa.                                                                                                | Ratificar en Technical Spec de US-072. En US-071 no aplica.                                                                                                                       | No                   |
| `docs/10` / US-071 declaración `NFR-OBS-001`  | US-071 declaraba `NFR-OBS-001` (AdminAction) que no aplica.                                                                                                    | NFR canónicos: `NFR-PERF-001, NFR-USAB-001, NFR-A11Y-001..003`.                                                                                    | Reemplazado en US-071 durante la aplicación de esta resolución.                                                                                                                    | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                |
| User Story file path                         | `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`                                                                             |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-071-decision-resolution.md`                                                                       |
| New User Story status                        | Ready for Approval                                                                                                                                 |
| Remaining blockers                           | No                                                                                                                                                 |
| Reason                                       | Las 5 preguntas bloqueantes Q1–Q5 y Q6 parcial quedaron resueltas con respaldo documental (FR-NOTIF-002, BR-NOTIF-002/005, docs/16 §34, docs/18 §18.1, US-032 aprobada, US-034 aprobada). D3 y D5 quedan como Tech Recommendation para validación durante la Technical Specification, sin bloquear el formal approval gate. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 6 decisiones cierran los bloqueantes de refinamiento y quedan reflejadas tanto en la User Story como en este artefacto. La Documentation Alignment Required (5 ítems) es no bloqueante y se materializa durante la Technical Specification y en las US downstream (US-072).

---

## 8. Próximo Paso Recomendado

```text
1. Run `eventflow-user-story-refinement` para revalidación de segundo paso (recomendado por el orquestador).
2. Run `eventflow-user-story-approval` sobre `management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md`.
3. Run `eventflow-user-story-technical-spec` (D3 y D5 se validan formalmente como Tech Recommendation).
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-071-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval` directamente.
