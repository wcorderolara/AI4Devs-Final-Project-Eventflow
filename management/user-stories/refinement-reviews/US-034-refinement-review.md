# User Story Refinement Review — US-034

## Source User Story File
management/user-stories/US-034-inapp-notification-t-minus-7.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-034-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-034-decision-resolution.md`) y la actualización en sitio del archivo de la User Story, esta segunda pasada de refinement confirma:

| Verificación                                                                                                                                                | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (scheduler + timezone) resuelta: cron único `0 8 * * *` en `TZ=America/Guatemala`. Sin campo `timezone` en Event/Location en MVP.                          | OK        |
| Q2 (idempotencia) resuelta: SELECT antes de INSERT en transacción por chunk; `Tech Recommendation` para validar en Technical Specification.                  | OK        |
| Q3 (estados de evento) resuelta: `event.status='active' AND event_task.status IN ('pending','in_progress')`.                                                  | OK        |
| Q4 (T-7 operativo) resuelta: `due_date::date = (CURRENT_DATE AT TIME ZONE 'America/Guatemala') + INTERVAL '7 days'`, igualdad exacta.                          | OK        |
| Q5 (granularidad email) resuelta: 1 `Notification(in_app)` + 1 `Notification(email_simulated)` + 1 log `[EMAIL]` por tarea; log resumen `affected=N` por run. | OK        |
| D6 (idioma) formalizado: `User.language_preference` con fallback a `event.language_code`.                                                                    | OK        |
| Traceability corregida: `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003`; `UC-NOTIF-001`; `BR-TASK-008, BR-NOTIF-001/002/003/005/007`; `NFR-OBS-004, NFR-OBS-005`.    | OK        |
| Backlog Item declarado (`PB-P2-004`) y `Epic` actualizado a `EPIC-NOT-001 / EPIC-TASK-001`.                                                                   | OK        |
| Recorte de alcance: surface UI y "marcar leída" movidos a `Explicitly Out of Scope` con handoff a US-071/US-072.                                              | OK        |
| AC reescritos (AC-01..AC-05), EC ampliados (EC-01..EC-07), VR/SEC/Test ampliados, Observability con `correlationId` y `affected=N`.                          | OK        |
| Documentation Alignment Required (5 ítems): PB-P2-004 traceability, `docs/14 §23.2`, `docs/4 §BR-NOTIF-007`, `docs/10 §NFR-OBS-004`. Ninguno bloqueante.       | OK        |
| Sin scope creep (push/SMS/WhatsApp permanecen Out of Scope; `notification_delivery_log` continúa Future).                                                     | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-034                                                                                                |
| File Path                                  | `management/user-stories/US-034-inapp-notification-t-minus-7.md`                                       |
| Backlog Item                               | PB-P2-004 — Notificación T-7 (tareas) · `Job EmitT7NotificationsJob + surface in-app`                  |
| Epic                                       | EPIC-NOT-001 / EPIC-TASK-001 (canónico según PB-P2-004; la US declara sólo `EPIC-TASK-001`)            |
| Estado actual                              | Draft                                                                                                  |
| Estado recomendado                         | Needs Refinement                                                                                       |
| Nivel de riesgo                            | Medio                                                                                                  |
| Calidad general                            | Media                                                                                                  |
| Requiere decisión PO                       | Sí                                                                                                     |
| Requiere decisión técnica                  | Sí                                                                                                     |
| Requiere decisión QA                       | No                                                                                                     |
| Requiere decisión Seguridad                | No                                                                                                     |
| Decision Resolution artifact found         | No                                                                                                     |
| User Story file updated                    | No                                                                                                     |
| Refinement review artifact created/updated | Yes                                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-034-refinement-review.md`                               |

---

## 2. Diagnóstico PO/BA

US-034 entrega un job programado (`EmitT7NotificationsJob`) que materializa el aviso T-7 ya comprometido por el Backlog (PB-P2-004) y por las reglas de negocio (BR-TASK-008 y BR-NOTIF-002 mencionan explícitamente `T-7`). Es una pieza demo-valiosa, pequeña, alineada con MVP y sin scope creep estructural respecto al MVP (in-app + email simulado; push/SMS/WhatsApp continúan Out of Scope).

Sin embargo, el archivo llega con cuatro problemas que impiden refinarlo en sitio de forma segura:

1. **Traceability con IDs incorrectos.** La US referencia `FR-TASK-011` (cambios de estado en eventos `cancelled`/`completed`) y `FR-NOTIF-004` (notificación al proveedor por `Quote` rechazada/expirada). Los canónicos para T-7 son `FR-TASK-010` (destacar T-7 y emitir notificación in-app), `FR-NOTIF-001` (notificaciones in-app, incluye T-7) y `FR-NOTIF-003` (email simulado por log). El UC declarado `UC-TASK-007` **no existe** (el rango canónico va hasta `UC-TASK-006`). El BR declarado `BR-NOTIF-004` corresponde a "acuse de lectura `read_at`" (alcance de US-072), no a T-7. El NFR declarado `NFR-OBS-001` corresponde a `AdminAction` (no aplica); el canónico para job/email simulado es `NFR-OBS-004` y, complementariamente, `NFR-OBS-005` (cambios de estado críticos en logs). Curiosamente, el Backlog Item PB-P2-004 también arrastra `FR-NOTIF-004, FR-TASK-011` en su columna `Traceability`: misma inconsistencia, alineable como Documentation Alignment Required hacia el backlog.
2. **Solapamiento de alcance con US-071 y US-072.** La US declara `AC-02 Visualización in-app` (campanita + lista) y describe en `UX / UI Notes` la lista, el botón "Marcar leída" y el badge del header. Esos surfaces son responsabilidad explícita de `US-071` (recibir aviso in-app de T-7, organizer) y `US-072` (marcar notificación como leída). Tanto la matriz de cobertura (`management/artifacts/2-User-Stories-Coverage-Matrix.md`) como el README de user stories declaran que US-071 "consume US-034". US-034 debe limitarse al job (emisión idempotente de `Notification` in-app + log de email simulado) y delegar el surface a US-071/US-072.
3. **Decisiones operacionales ya formalizadas en el Backlog que la US trata como dudas abiertas.** La sección `Notes` dice "Confirmar horario del job (sugerido 08:00 hora local del evento o UTC)". El Backlog ya formaliza la decisión en §4.2 ("EmitT7NotificationsJob | **08:00 hora local del evento** | US-034 | Fallback `America/Guatemala`") y PB-P2-004 reitera "Job a 08:00 hora local. Idempotente. Solo tareas `pending/in_progress`." Esas tres reglas deben moverse a `PO/BA Decisions Applied` y reflejarse en AC/VR/EC. Su mecánica de implementación, no obstante, sí está abierta (ver Q1 y Q2 en §7).
4. **Decisiones de fondo sin formalizar.** Idempotencia (mecanismo concreto; la tabla `notifications` no tiene unique constraint y `docs/18 §18.1` declara explícitamente que no existe `notification_delivery_log` en MVP), semántica exacta del rango T-7 (día calendario en `timezone` del evento, comparación inclusive/exclusive), inclusión/exclusión de tareas en eventos `cancelled`/`completed`, granularidad del email simulado (uno por tarea vs resumen por organizador) e idioma del contenido siguen abiertas y requieren decisión PO/Tech.

No hay scope creep hacia push/SMS/WhatsApp. La historia es pequeña y demoable, pero antes de aprobar debe (a) limpiar traceability, (b) recortar AC-02 y UX/UI hacia US-071/US-072, (c) registrar formalmente las tres decisiones operacionales y (d) resolver Q1–Q5 (§7).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                       | Impacto                                                                                                                                       | Recomendación                                                                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | Traceability incorrecta: `FR-TASK-011` (cancelled/completed) y `FR-NOTIF-004` (Quote rechazada/expirada) no aplican a T-7. UC declarado `UC-TASK-007` no existe en `docs/8`. `BR-NOTIF-004` es `read_at` (US-072). `NFR-OBS-001` es `AdminAction`, no aplica.                                  | Si se aprueba con estos IDs, la trazabilidad académica y la Documentation Alignment se rompen en cadena (PB ↔ FRD ↔ UC ↔ BRD ↔ NFR).            | Reemplazar por IDs canónicos durante refinación: FR-TASK-010 + FR-NOTIF-001 + FR-NOTIF-003; UC-NOTIF-001 (recepción) y, si corresponde, transversal (job no tiene UC dedicado); BR-TASK-008 + BR-NOTIF-001/002/003/005/007; NFR-OBS-004 (+ NFR-OBS-005 complementario). Ver §10. |
| Alta      | Solapamiento de alcance: `AC-02` y la sección `UX / UI Notes` describen la campanita, la lista de notificaciones y el botón "Marcar leída", todos del dominio de `US-071` (surface T-7 organizer) y `US-072` (marcar como leída).                                                              | Aprobar US-034 con surface UI duplica el alcance con US-071/US-072 y rompe el handoff explícito ya declarado en la matriz de cobertura.       | Recortar US-034 al job + persistencia (`Notification` + log de email simulado). Mover AC-02 y `UX / UI Notes` a `Explicitly Out of Scope` con handoff a US-071 y US-072.                                                                                                  |
| Alta      | Mecánica del scheduler abierta. PB §4.2 fija "08:00 hora local del evento, fallback `America/Guatemala`", pero `docs/14 §23.2` no lista `EmitT7NotificationsJob` y no existe atributo `timezone` documentado en `Event` o `Location` en `docs/6 / docs/18` para resolver la "hora local".         | Sin decisión, el job se vuelve no implementable de forma determinista: distintas interpretaciones generan duplicados o tareas saltadas.        | Resolver Q1 (PO + Tech Lead) y agregar `EmitT7NotificationsJob` a `docs/14 §23.2` como Documentation Alignment Required (no bloqueante una vez decidido).                                                                                                                |
| Alta      | Idempotencia sin mecanismo definido. `notifications` no tiene unique constraint que evite duplicados y `docs/18 §18.1` declara explícitamente que no existe `notification_delivery_log` en MVP. El "Acceptance Summary" del PB-P2-004 exige idempotencia pero la US no operacionaliza cómo.        | Re-ejecuciones del job (por reinicio, por overlap de cron) pueden emitir N notificaciones por tarea, contradiciendo PB-P2-004 y BR-NOTIF-005. | Resolver Q2 (Tech Lead + PO). Opciones: índice único parcial sobre `(user_id, type, (payload->>'task_id'))`, chequeo SELECT/INSERT en transacción, o flag/columna nueva. La elección impacta migración y AC.                                                              |
| Alta      | Definición operativa de "T-7" no explícita. AC-01 dice `due_date == today + 7` sin precisar (a) la timezone aplicada para "today", (b) si `due_date` es comparado por día calendario o instante, (c) inclusive/exclusive, (d) tolerancia ante eventos de timezone fronteriza.                  | AC-01 no es testeable de forma determinista; QA no puede inyectar clock con seguridad.                                                       | Resolver Q4 (PO + Tech Lead). Especificar la fórmula exacta y un caso de prueba canónico para clock injectable.                                                                                                                                                          |
| Media     | Tareas en eventos `cancelled` y `completed` no están explícitamente cubiertas en EC. La US sólo descarta `done`/`skipped` a nivel de tarea, pero PB-P2-004 dice "solo tareas `pending/in_progress`" y FR-TASK-011 pone tareas de eventos `cancelled`/`completed` en estado especial.            | Riesgo de notificar tareas de eventos cancelados o completados, ruido en demo.                                                                | Resolver Q3 (PO). Recomendación natural: excluir tareas de eventos cuyo `event.status ∈ {cancelled, completed}`.                                                                                                                                                         |
| Media     | Email simulado: granularidad sin decidir. PB-P2-004 dice "in-app + email simulado por cada tarea", pero BR-NOTIF-002/003 + NFR-OBS-004 permiten leer "una entrada de log por notificación" o "log de batch". La US asume implícitamente una entrada por tarea (canal `email_simulated`) sin formalizarlo. | Riesgo de inconsistencia entre US-034 y la implementación; QA no puede aserciones precisas sobre el log estructurado.                       | Resolver Q5 (PO). Confirmar 1 fila `notification(channel='email_simulated')` + 1 entrada de log estructurado por tarea, ambas con `correlationId = job-<name>-<timestamp>`.                                                                                              |
| Media     | Idioma de la notificación sin declarar. BR-NOTIF-007 dice "idioma preferido del destinatario o del evento, según corresponda". La US no especifica cuál aplica para T-7.                                                                                                                       | Riesgo de contenido en idioma incorrecto en demo multilingüe.                                                                                | Documentation Alignment Required: aplicar `User.language_preference` con fallback al idioma del evento. Si se confirma, agregar como `PO/BA Decisions Applied`.                                                                                                          |
| Media     | NFR `NFR-OBS-001` no aplica (es para `AdminAction`); falta declarar NFR-OBS-004 (email log) y NFR-OBS-005 (cambios críticos en logs) como referencias canónicas.                                                                                                                                | Métrica de éxito y observabilidad sin trazabilidad NFR válida.                                                                                | Reemplazar `NFR-OBS-001` por `NFR-OBS-004` + `NFR-OBS-005`. Documentation Alignment Required (no bloqueante).                                                                                                                                                            |
| Media     | Backlog Item no declarado en la US. PB-P2-004 es el único ítem aplicable.                                                                                                                                                                                                                       | Pérdida de trazabilidad académica y operativa.                                                                                                | Agregar `Backlog Item: PB-P2-004` en `Metadata` y en `Traceability`.                                                                                                                                                                                                     |
| Baja      | `Epic` declarado sólo como `EPIC-TASK-001`. PB-P2-004 lo declara como `EPIC-NOT-001 / EPIC-TASK-001`.                                                                                                                                                                                          | Pérdida menor de trazabilidad; matriz de cobertura ubica la historia bajo `EPIC-NOT-001` (US-068..US-073).                                    | Cambiar a `EPIC-NOT-001 / EPIC-TASK-001` para reflejar el Backlog.                                                                                                                                                                                                       |
| Baja      | `i18n Notes: 4 locales` sin enumerar (`es-LATAM`, `es-ES`, `pt`, `en` según PB §4.3 / US-007).                                                                                                                                                                                                  | QA puede no cubrir todos los locales.                                                                                                         | Enumerar locales canónicos durante refinación.                                                                                                                                                                                                                            |
| Baja      | `EmitT7NotificationsJob` no aparece en la tabla `docs/14 §23.2`.                                                                                                                                                                                                                                | Documentation Alignment Required.                                                                                                             | Agregar el job a `docs/14 §23.2` con propósito, schedule, idempotencia y observabilidad. No bloquea aprobación si la US lo declara claramente.                                                                                                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | Out of Scope explícito (push, SMS, WhatsApp).                                                                                                                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                                                                               |
| Respeta backend como source of truth | Pass      | Backend emite `Notification`; frontend (US-071/US-072) consume.                                                                                                            |
| Respeta seed/demo si aplica          | N/A       | Seed actual de tareas/eventos alcanza para demo, siempre que el job permita inyección de clock. Confirmar en Q4. No requiere cambios estructurales del seed.                |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                                                                                  |
| No introduce multi-tenant enterprise | Pass      | Ownership por `user_id` (destinatario único) y `event.owner_id` (origen).                                                                                                  |
| No introduce P4/Future scope         | Pass      | Surface UI permanece en US-071/US-072; `notification_delivery_log` y push siguen Future.                                                                                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                          | Problema detectado                                                                                                                                                                                                                                                              | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable      | "tareas con `due_date == today + 7`" no define timezone, comparación por día/instante, inclusive/exclusive, ni manejo de DST/timezone fronteriza. "Log de email simulado" no especifica formato (NFR-OBS-004).                                                                  | Reescribir tras Q1, Q4 y Q5. Ejemplo (sujeto a decisión): "Dado un evento `e` activo (`status ∈ {active}`) y una tarea `t` con `status ∈ {pending, in_progress}` y `t.due_date::date == (now_in_event_tz + 7 días)::date`, cuando el job corre a las 08:00 hora local de `e`, entonces se crean exactamente 1 `Notification(channel='in_app', type='task_due_soon')` y 1 entrada de log `[EMAIL]...`." |
| AC-02 | Out of Scope                     | "El usuario abre la campanita y ve la notificación" pertenece al alcance de `US-071` (surface T-7 organizer); además, AC-02 supone implícitamente la presencia de `US-072` (marcar como leída) por el botón en `UX / UI Notes`.                                                  | Eliminar AC-02 de US-034. Mover a `Explicitly Out of Scope` con handoff explícito: "Surface in-app y lectura cubierta por US-071 + US-072".                                                                                                                                                                                                                                                          |

Edge case detectado en EC-01 ("Tarea ya done") cubre dos estados (`done` y `skipped`) en una sola entrada. PB-P2-004 dice "Solo tareas `pending/in_progress`", lo que también excluye `cancelled` (si existe como estado de tarea) y tareas IA en `pending` con confirmación dudosa. Falta ampliar EC a: evento `cancelled`/`completed` (Q3), eventos sin tareas, tareas con `due_date` ya pasada (no aplica T-7), reejecución del job en la misma ventana (idempotencia).

Faltantes a nivel de AC:
- AC para idempotencia (Q2): "Dado que la `Notification` task_due_soon para `(user_id, task_id)` ya existe en la ventana T-7 actual, cuando el job re-procesa la tarea, entonces no se crea una segunda `Notification` ni una segunda entrada de log".
- AC para autorización del destinatario (BR-NOTIF-005): el `user_id` de la `Notification` debe ser `event.owner_id`, nunca un tercero.
- AC para idioma (BR-NOTIF-007): el `language_code` se toma de `User.language_preference` (o `event.language` según Q6).
- AC para observabilidad: log estructurado `job.t7Notifications.affected=N` con `correlationId = job-emit-t7-<timestamp>` (alineado con `docs/14 §23.2`).
- AC para PII (SEC-02): el log no debe contener email del destinatario ni datos sensibles; sólo `userId`, `taskId`, `eventId`, `correlationId`.

---

## 6. Gaps Detectados

### Producto / Negocio
- Falta declaración explícita del Backlog Item `PB-P2-004`.
- Falta `PO/BA Decisions Applied` con las tres decisiones operacionales ya formalizadas (schedule, idempotencia obligatoria, sólo `pending/in_progress`).
- Falta política para eventos `cancelled` y `completed` (Q3).

### Backend / API
- Falta nombre canónico del use case (`EmitT7NotificationsUseCase`) y del job (`EmitT7NotificationsJob`) en `Technical Notes`.
- Falta entrada en `docs/14 §23.2` (Documentation Alignment Required).
- Falta contrato exacto del payload `Notification.payload` para `type='task_due_soon'` (sugerido: `{ taskId, eventId, eventName, dueDate, title }`).
- Falta declarar dependencia de la timezone (Q1).
- Falta declarar mecanismo de idempotencia (Q2): índice único parcial vs validación en código.
- Falta declarar estrategia de batch (`chunk_size`) y manejo de error por chunk (alineado con `docs/14 §23.2`).
- El endpoint `GET /api/v1/notifications` listado en la US pertenece a US-071 / US-072; debe removerse o anotarse explícitamente como "endpoint consumido por surface".

### Frontend / UX
- **Toda la sección `Frontend` y `UX / UI Notes` debe migrar a US-071 / US-072.** US-034 no entrega componentes frontend.
- Si el organizer no usa el surface (US-071 pendiente), la `Notification` queda persistida y será visible cuando US-071 entregue. Documentar este handoff en `Notes`.

### Base de Datos
- No requiere migraciones nuevas si Q2 se resuelve por código (chequeo SELECT antes de INSERT).
- Si Q2 elige índice único parcial, requiere migración con `CREATE UNIQUE INDEX ... ON notifications ((payload->>'task_id'), type) WHERE type='task_due_soon'`. Documentation Alignment Required hacia `docs/18 §18.1`.

### Seguridad / Autorización
- `SEC-01` correcto (Sistema → usuario dueño).
- Falta declarar reuso del policy de aislamiento de notificaciones (`BR-NOTIF-005`): ningún usuario distinto de `event.owner_id` debe recibir esta notificación.
- `SEC-02` (log no expone PII) requiere especificar campos permitidos en el log: `userId`, `taskId`, `eventId`, `dueDate`, `correlationId`. Nombre del usuario, email y título de la tarea **no** deben entrar en el log (alineado con `docs/19 §logging y PII`).

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
- Falta test de idempotencia (re-ejecución del job en la misma ventana).
- Falta test con clock injectable (decidido en `Notes` pero no formalizado en `Test Scenarios`).
- Falta test de timezone (eventos en distintas timezones o fallback `America/Guatemala`).
- Falta test de exclusión por estado de evento (`cancelled`, `completed`).
- Falta test de log estructurado (NFR-OBS-004 / NFR-OBS-005).
- Falta test de aislamiento (BR-NOTIF-005): un organizer no recibe notificaciones de tareas de otro evento.

### Seed / Demo
- No requiere cambios estructurales del seed.
- Confirmar que el seed actual incluye al menos una tarea con `due_date` en T-7 respecto al `event_date` del evento demo principal (alineado con US-145).

### Documentación / Trazabilidad
- IDs incorrectos en `FRD Requirement(s)`, `Use Case(s)`, `Business Rule(s)` y `NFR Reference(s)`. Corrección directa en refinación tras resolver Q1–Q5.
- `Related Document(s)` enumera sólo `/docs/8`; debe ampliarse a `/docs/4 §BR-NOTIF-001/002/003/005/007 + §BR-TASK-008`, `/docs/9 §FR-TASK-010 / §FR-NOTIF-001 / §FR-NOTIF-003`, `/docs/10 §NFR-OBS-004 / §NFR-OBS-005`, `/docs/14 §23.2`, `/docs/18 §18.1`.
- Backlog Item no aparece referenciado.

---

## 7. Preguntas Pendientes

| Tipo           | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Bloquea aprobación | Responsable        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech + PO      | Q1. ¿De dónde se obtiene la "hora local del evento" para disparar el job a las 08:00? Opciones: (a) campo `timezone` en `Event` (no documentado hoy en `docs/6 / docs/18`); (b) `Location.timezone` derivada del país/ciudad; (c) fallback fijo `America/Guatemala` para todo MVP. Adicional: ¿la implementación es (i) `node-cron` único cada hora que filtra eventos cuya hora local sea 08:00, (ii) `node-cron` único a 08:00 UTC que aplica un offset por evento, o (iii) `node-cron` único a una hora fija UTC con cálculo en SQL del `(now_utc + tz_offset)`? La decisión impacta migraciones, índices y AC-01. | Sí                 | Tech Lead + PO     |
| Tech + PO      | Q2. ¿Cómo se garantiza la idempotencia? Opciones: (a) índice único parcial sobre `(user_id, type, (payload->>'task_id')) WHERE type='task_due_soon'` (requiere migración y Documentation Alignment con `docs/18 §18.1`); (b) chequeo SELECT/INSERT en transacción dentro del use case (sin migración, depende de aislamiento serializable); (c) columna `task_id uuid` añadida a `notifications` (mayor impacto en schema). La elección debe ser explícita.                                                                                                                                                  | Sí                 | Tech Lead + PO     |
| PO             | Q3. ¿Se notifica T-7 para tareas cuyo evento esté en estado `cancelled` o `completed`? Implícitamente PB-P2-004 dice "Solo tareas `pending/in_progress`" pero la regla habla de la tarea, no del evento. FR-TASK-011 pone esas tareas en lectura. Recomendación natural: excluir.                                                                                                                                                                                                                                                                                                                       | Sí                 | Product Owner     |
| PO + Tech      | Q4. Definición operativa exacta de "T-7": ¿`t.due_date::date == (now_in_event_tz + 7 días)::date`? ¿Día calendario inclusive o exclusive? ¿Qué pasa con tareas cuyo `due_date` cae justo en el cambio DST? ¿Cómo se materializa el clock injectable para QA (TS-01/TS-02 dependen de esto)?                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner + Tech Lead |
| PO             | Q5. Granularidad del email simulado: ¿1 entrada de log `[EMAIL]` por tarea (1:1 con `Notification(channel='email_simulated')`) o 1 entrada agrupada por organizador (lista de tareas)? PB-P2-004 dice "in-app + email simulado por cada tarea". Confirmar que el patrón canónico es 1:1 con persistencia adicional de un registro `Notification(channel='email_simulated')` por tarea, alineado con `docs/18 §18.1`.                                                                                                                                                                                       | Sí                 | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                                  | Conflicto detectado                                                                                                                                                                                                                                                                                                                            | Decisión vigente                                                                                                                                                                                              | Acción recomendada                                                                                                                                                                                                            | ¿Bloquea aprobación? |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P2-004) | `Traceability` del backlog item declara `FR-NOTIF-004, FR-TASK-011`; los canónicos son `FR-TASK-010 + FR-NOTIF-001 + FR-NOTIF-003`.                                                                                                                                                                                                            | El FRD (`docs/9`) y el BRD (`docs/4 §BR-NOTIF-002 / §BR-TASK-008`) son fuente única; los IDs `FR-NOTIF-004` y `FR-TASK-011` no aplican.                                                                       | Corregir `Traceability` del backlog item PB-P2-004 a `FR-TASK-010, FR-NOTIF-001, FR-NOTIF-003 · Decisión PO US-034`. No bloquea aprobación si la US declara los IDs canónicos.                                                | No                   |
| `docs/14-Backend-Technical-Design.md §23.2`                         | La tabla de jobs MVP no lista `EmitT7NotificationsJob`. PB §4.2 ya formalizó su schedule.                                                                                                                                                                                                                                                       | El job está formalizado en PB §4.2; debe agregarse a `docs/14 §23.2`.                                                                                                                                          | Agregar fila en `docs/14 §23.2` con `Job=EmitT7NotificationsJob`, `Propósito`, `Implementación=node-cron`, `Schedule=<resultado de Q1>`, `Entidades=EventTask, Notification`, `Idempotencia=<resultado de Q2>`, `Observabilidad=log estructurado job-emit-t7-<timestamp>`. | No                   |
| `docs/18-Database-Physical-Design.md §18.1`                         | `docs/18 §18.1` declara explícitamente "No se modela una tabla `notification_delivery_log` en MVP". Si Q2 elige índice único parcial sobre `notifications`, requiere actualizar la sección.                                                                                                                                                       | Hoy no hay unique constraint sobre `notifications`; sólo `idx_notifications_user_status_sent` y `idx_notifications_user_unread`.                                                                              | Tras Q2, si la decisión es índice único parcial, agregar a `docs/18 §18.1` y a `docs/18 §unique constraints`. Si la decisión es chequeo SELECT/INSERT en código, no requiere alineación.                                       | No (si Q2 resuelta)  |
| `docs/4-Business-Rules-Document.md §BR-NOTIF-007`                   | BR-NOTIF-007 dice "idioma preferido del destinatario o del evento, según corresponda". Falta precisar para T-7.                                                                                                                                                                                                                                | Decisión recomendada: aplicar `User.language_preference` con fallback al idioma del evento.                                                                                                                    | Tras confirmación, agregar nota a BR-NOTIF-007 o documentar como `PO/BA Decisions Applied` en US-034.                                                                                                                          | No                   |
| `docs/10-Non-Functional-Requirements.md §NFR-OBS-004`               | `NFR-OBS-004` referencia `FR-NOTIF-002` como FR origen; el FR canónico del email simulado es `FR-NOTIF-003`. La US-034 declara `NFR-OBS-001` que no aplica.                                                                                                                                                                                       | Para US-034 el NFR canónico es `NFR-OBS-004` (email log) + `NFR-OBS-005` (cambios de estado críticos en logs).                                                                                                | Reemplazar `NFR-OBS-001` por `NFR-OBS-004` y `NFR-OBS-005` en la US. La inconsistencia del FR origen en NFR-OBS-004 ya está fuera del alcance de esta US.                                                                       | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-034-inapp-notification-t-minus-7.md`                                                                                                                                                                                                                                                                            |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                                                                                         |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-034-decision-resolution.md`                                                                                                                                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-034-refinement-review.md`                                                                                                                                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                                                                                         |
| Reason                                     | Existen 5 preguntas bloqueantes (Q1–Q5) que requieren decisión PO + Tech Lead antes de aprobar. La US no puede actualizarse en sitio porque resolver Q1 obliga a reescribir AC-01, Technical Notes y Validation Rules; Q2 impacta migraciones; Q3–Q5 obligan a reescribir EC, AC y `PO/BA Decisions Applied`. Además, AC-02 y la sección `UX / UI Notes` deben migrarse a Out of Scope (handoff a US-071/US-072), lo cual es un recorte de alcance que requiere validación PO explícita. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. La siguiente lista es prescriptiva para aplicar tras la resolución de Q1–Q5.)

### Metadata
- `Epic` → `EPIC-NOT-001 / EPIC-TASK-001` (canónico según PB-P2-004).
- Añadir `Backlog Item: PB-P2-004 — Notificación T-7 (tareas) (P2)`.
- `Last Updated` → fecha de la próxima ejecución de la skill.
- `Status` → `Ready for Approval` sólo tras aplicar todos los cambios.

### Business Context
- `Assumptions`: reemplazar "MockEmailService simula envío" por "El email se simula como log estructurado vía `SimulatedEmailAdapter` con formato `[EMAIL] to=<userId> subject=… body=…` (alineado con `docs/14 §23.2` + NFR-OBS-004). No se persiste tabla `notification_delivery_log` (decidido por `docs/18 §18.1`)."
- `Dependencies`: agregar `US-071` (surface organizer), `US-072` (mark as read) como dependencias para el cierre demo end-to-end. Mantener `PB-P1-018` y `PB-P2-009` ya declaradas en el Backlog.

### PO/BA Decisions Applied
Añadir sección nueva con las decisiones operacionales y de fondo, citando `management/user-stories/decision-resolutions/US-034-decision-resolution.md`:
- D1 (PB §4.2): `EmitT7NotificationsJob` corre a las **08:00 hora local del evento** con fallback `America/Guatemala`.
- D2 (PB-P2-004 Acceptance Summary): el job es **idempotente** (resultado de Q2).
- D3 (PB-P2-004 Acceptance Summary): el job sólo procesa tareas con `status ∈ {pending, in_progress}`.
- D4 (resultado de Q3): tareas de eventos en `status ∈ {cancelled, completed}` se excluyen del job.
- D5 (resultado de Q4): definición operativa exacta del rango T-7.
- D6 (resultado de Q5): 1 fila `Notification(channel='email_simulated')` por tarea + 1 entrada de log estructurado.
- D7 (BR-NOTIF-007, recomendada): `language_code` se toma de `User.language_preference` con fallback al idioma del evento.

### Traceability
- `FRD Requirement(s)` → `FR-TASK-010` (destacar T-7 + notificación in-app) + `FR-NOTIF-001` (notificaciones in-app, incluye T-7) + `FR-NOTIF-003` (email simulado por log).
- `Use Case(s)` → `UC-NOTIF-001` (recibir notificaciones in-app). Anotar que el job en sí es transversal y no implementa un UC dedicado: "Transversal — job programado que materializa el disparador T-7 de UC-NOTIF-001".
- `Business Rule(s)` → `BR-TASK-008` (indicador T-7 + notificación) + `BR-NOTIF-001` (canales) + `BR-NOTIF-002` (eventos disparadores, incluye T-7) + `BR-NOTIF-003` (email log) + `BR-NOTIF-005` (sólo al destinatario) + `BR-NOTIF-007` (idioma).
- `NFR Reference(s)` → `NFR-OBS-004` (email simulado por log) + `NFR-OBS-005` (cambios críticos en logs estructurados).
- `Data Entity / Entities` → `EventTask`, `Event`, `Notification`, `User`.
- `API Endpoint(s)` → "No aplica (job programado). El surface de consumo (`GET /api/v1/notifications`, `POST /:id/read`) pertenece a US-071 / US-072."
- `Related Document(s)` → `/docs/4 §BR-NOTIF-001/002/003/005/007, §BR-TASK-008`, `/docs/6 §Notification`, `/docs/8 §UC-NOTIF-001`, `/docs/9 §FR-TASK-010 / §FR-NOTIF-001 / §FR-NOTIF-003`, `/docs/10 §NFR-OBS-004 / §NFR-OBS-005`, `/docs/14 §23.2`, `/docs/18 §18.1`.
- Agregar `Backlog Item: PB-P2-004`.

### Scope Guardrails
- `Explicitly Out of Scope`: añadir "Surface in-app (campanita, lista, badge) — alcance de **US-071**", "Botón/acción de marcar como leída — alcance de **US-072**", "Push, SMS y WhatsApp (BR-NOTIF-006)", "`notification_delivery_log` (Future, `docs/18 §18.1`)".
- `Scope Notes`: ajustar a "Job + persistencia de `Notification(channel='in_app')` y `Notification(channel='email_simulated')` + log estructurado. Sin componentes frontend."

### Acceptance Criteria
- Reescribir AC-01 con la fórmula final de Q1+Q4 y la regla de Q3 (excluye eventos `cancelled`/`completed`) y Q5 (1+1 notificaciones por tarea).
- Eliminar AC-02 (mover a Out of Scope).
- Añadir AC-02 (idempotencia): "Dada una tarea `t` para la que ya existe `Notification(user_id=event.owner_id, type='task_due_soon', payload->>'task_id'=t.id)` emitida en la ventana T-7 actual, cuando el job re-procesa `t`, entonces no se crea una segunda `Notification` ni una segunda entrada de log."
- Añadir AC-03 (aislamiento): la `Notification` se crea con `user_id = event.owner_id`; ningún otro usuario recibe la notificación (BR-NOTIF-005).
- Añadir AC-04 (idioma): `language_code` = `User.language_preference` con fallback al idioma del evento (D7).
- Añadir AC-05 (observabilidad): el job emite log estructurado `job.t7Notifications.affected=N` con `correlationId=job-emit-t7-<timestamp>` (NFR-OBS-005) y, por cada tarea, una entrada `[EMAIL] to=<userId> subject=… body=…` sin PII (NFR-OBS-004 / SEC-02).

### Edge Cases
- EC-01: ampliar a "Tarea `done` o `skipped`".
- EC-02: "Evento en `status ∈ {cancelled, completed}`" → omitida (D4).
- EC-03: "Re-ejecución del job en la misma ventana T-7" → sin duplicados (AC-02).
- EC-04: "Tarea con `due_date` ya pasada" → no aplica T-7.
- EC-05: "Evento sin tareas pending/in_progress" → 0 notificaciones, log `affected=0`.
- EC-06: "Evento en timezone fronteriza / DST" → política definida en Q1+Q4.

### Validation Rules
- VR-01: ampliar a "Tarea activa (`status ∈ {pending, in_progress}`) con `due_date` que satisface la regla T-7 (D5) y cuyo evento está en `status='active'`".
- VR-02: `Notification.user_id` debe igualar `event.owner_id` (BR-NOTIF-005).

### Authorization & Security Rules
- SEC-01: mantener "Sistema; notificación al dueño".
- SEC-02: precisar campos permitidos en log (`userId`, `taskId`, `eventId`, `dueDate`, `correlationId`); excluir `email`, `displayName`, título de la tarea, descripción.
- SEC-03: agregar reuso explícito de `NotificationOwnerPolicy` (cuando US-072 lo implemente) para que el surface sólo retorne las notificaciones del solicitante (no es responsabilidad de US-034, pero refuerza el handoff).

### Technical Notes (Backend)
- `Use Case / Service`: `EmitT7NotificationsUseCase`.
- `Controller / Route`: no aplica (job).
- `Scheduler`: `node-cron` (alineado con `docs/14 §23.2`). Schedule según Q1.
- `Authorization Policy`: System.
- `Validation`: filtros SQL por (`event.status='active'`, `task.status ∈ {pending,in_progress}`, expresión T-7 según Q4).
- `Transaction Required`: por chunk (alineado con `docs/14 §23.2`).
- `Repositorios`: `EventTaskRepository`, `NotificationRepository`, `SimulatedEmailAdapter`.
- `Idempotencia`: implementación según Q2.

### Technical Notes (Frontend)
- **Eliminar la sección completa** (alcance de US-071/US-072). Mantener una sola línea: "No aplica — surface en US-071 (lista + badge) y US-072 (marcar como leída)."

### UX / UI Notes
- **Eliminar la sección completa** o reemplazarla por "No aplica — surface en US-071/US-072".

### Database Notes
- Sin migraciones nuevas si Q2 = chequeo SELECT/INSERT.
- Si Q2 = índice único parcial: migración con `CREATE UNIQUE INDEX uq_notifications_task_due_soon ON notifications ((payload->>'task_id')) WHERE type='task_due_soon'`.
- Reusar `idx_notifications_user_status_sent` y `idx_notifications_user_unread` (existentes).

### API
- Reemplazar la tabla de endpoints por: "No aplica (job programado). Surface en US-071 (`GET /api/v1/notifications`) y US-072 (`POST /api/v1/notifications/:id/read`)."

### Observability / Audit
- `Correlation ID Required`: Yes (artificial `job-emit-t7-<timestamp>` según `docs/14 §23.2`).
- `Log Event Required`: Yes (`job.t7Notifications.affected=N`, alineado con NFR-OBS-005).
- `AdminAction Required`: No.
- `AIRecommendation Required`: No.

### Test Scenarios
- Mantener TS-01 (emisión correcta T-7, Integration) con clock injectable explícito.
- Eliminar TS-02 (E2E del surface) o reasignar a US-071 (su responsable natural).
- Añadir TS-03: idempotencia (Integration, re-ejecución).
- Añadir TS-04: timezone (Integration, eventos en `America/Guatemala`, `America/Mexico_City` y `Europe/Madrid` si el modelo lo soporta).
- Añadir TS-05: exclusión por estado de evento (`cancelled`, `completed`).
- Añadir TS-06: log estructurado verifica `[EMAIL]` por tarea y `affected=N` por corrida.
- Añadir TS-07: aislamiento (BR-NOTIF-005) — un organizer distinto no recibe la notificación.
- Eliminar `NT-01 Tarea done` (cubierto por EC-01 y exclusión por estado de tarea); reasignarlo como negative test puro en `Negative Tests` si se desea redundancia.
- Añadir negative test: `due_date == today + 6` o `+ 8` → ignorada (rango exacto).
- Eliminar `AUTH-TS-02 Usuario lee propias` (alcance de US-071/US-072).

### Definition of Ready
- Marcar `[x] PO/BA validó` sólo tras aprobación.

### Definition of Done
- Añadir: clock injectable validado en CI; log estructurado verificado en pruebas; idempotencia comprobada (un solo `Notification` por `(user_id, task_id)` por ventana T-7).
- Mantener: "Notif visibles" pero anotar que la visibilidad final depende de US-071 entregada en paralelo.

### Notes
- Reemplazar "Confirmar horario del job (sugerido 08:00 hora local del evento o UTC)" por la decisión final de Q1 anotada en `PO/BA Decisions Applied`.
- Añadir handoff a US-071 y US-072.
- Añadir referencia a `docs/14 §23.2` (entrada nueva del job) y a `docs/18 §18.1` (sin `notification_delivery_log` en MVP).

---

## 11. Recomendación Final

`Needs Refinement`

La historia no puede actualizarse en sitio porque cinco decisiones (Q1: mecánica de scheduler + timezone; Q2: mecanismo de idempotencia; Q3: tareas en eventos `cancelled`/`completed`; Q4: definición operativa exacta de T-7; Q5: granularidad del email simulado) están abiertas y bloquean la reescritura de AC, EC, VR, Technical Notes y Traceability. Adicionalmente, AC-02 y `UX / UI Notes` deben recortarse y migrar a Out of Scope (handoff a US-071/US-072), lo cual también requiere confirmación PO.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review para resolver Q1–Q5 desde la documentación aprobada (PB §4.2, PB-P2-004, `docs/4 §BR-NOTIF-*`, `docs/14 §23.2`, `docs/18 §18.1`) o, en su defecto, elevarlas a PO formal.

---

User Story file updated: No
Path: management/user-stories/US-034-inapp-notification-t-minus-7.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-034-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
