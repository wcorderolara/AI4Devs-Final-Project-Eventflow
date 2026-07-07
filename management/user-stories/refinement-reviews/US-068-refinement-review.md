# User Story Refinement Review — US-068

## Source User Story File
management/user-stories/US-068-inapp-notification-new-quote-request.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-068-decision-resolution.md

## Review Date
2026-07-06 (revalidación: 2026-07-06)

## Revalidation Result (2026-07-06)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-068-decision-resolution.md`) y la actualización en sitio de la User Story, esta segunda pasada confirma:

| Verificación                                                                                                                       | Resultado |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (transaction scope) resuelta: handler in-transaction dentro del `CreateQuoteRequestUseCase`.                                     | OK        |
| Q2 (idempotencia) resuelta: SELECT antes de INSERT en la misma tx por `(user_id, type, payload->>'quote_request_id')`.              | OK        |
| Q3 (payload + link) resuelta: `payload={quoteRequestId, eventId, organizerId, categoryCode}`; `link=/vendor/quote-requests/{id}`.   | OK        |
| Q4 (surface vendor) resuelta: Out of Scope. Bandeja vendor = Future US no listada. Mark-as-read = US-072.                          | OK        |
| Q5 (idioma) resuelta: fallback ladder `User.language_preference → event.language_code → en`.                                        | OK        |
| Q6 (defensa vendor no-approved) resuelta: skip + warning log.                                                                       | OK        |
| Traceability corregida: `FR-NOTIF-001/003`, `UC-NOTIF-001 + UC-QUOTE-001`, `BR-NOTIF-001/002/003/005/007`, `NFR-OBS-004/005`.       | OK        |
| Recorte de alcance: sección Frontend y UX/UI eliminadas. Backlog Item declarado (`PB-P2-005`).                                     | OK        |
| AC reescritos (AC-01..AC-07), EC ampliados (EC-01..EC-04), VR/SEC/Test ampliados. Observability con `correlationId` y no-PII.      | OK        |
| Documentation Alignment Required (4 ítems, no bloqueantes).                                                                        | OK        |
| Sin scope creep (push/SMS/WhatsApp/event bus/`notification_delivery_log` permanecen Out of Scope).                                  | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| User Story ID                              | US-068                                                                                          |
| File Path                                  | `management/user-stories/US-068-inapp-notification-new-quote-request.md`                        |
| Backlog Item                               | PB-P2-005 — Notificación de QuoteRequest creada (P2, Should Have)                              |
| Epic                                       | EPIC-NOT-001                                                                                    |
| Estado actual                              | Draft                                                                                            |
| Estado recomendado                         | Needs Refinement                                                                                 |
| Nivel de riesgo                            | Medio                                                                                            |
| Calidad general                            | Media                                                                                            |
| Requiere decisión PO                       | Sí                                                                                               |
| Requiere decisión técnica                  | Sí                                                                                               |
| Requiere decisión QA                       | No                                                                                               |
| Requiere decisión Seguridad                | No                                                                                               |
| Decision Resolution artifact found         | No                                                                                              |
| User Story file updated                    | No                                                                                              |
| Refinement review artifact created/updated | Yes                                                                                              |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-068-refinement-review.md`                        |

---

## 2. Diagnóstico PO/BA

US-068 formaliza el handler `OnQuoteRequestCreatedHandler` que emite una `Notification(type='quote_request_received')` al vendor cuando `CreateQuoteRequestUseCase` (US-049) persiste una `QuoteRequest`. El paso 6 del flujo principal de `UC-QUOTE-001` (`docs/8 §3070`) declara textualmente: "Sistema dispara `Notification(type='quote_request_received', user_id=vendor)`". La historia es demo-valiosa, pequeña, alineada con MVP y sin scope creep hacia push/SMS/WhatsApp. El patrón es simétrico al de US-034 (job emisor) ya aprobada.

Sin embargo, el archivo llega con cuatro bloques de problemas que impiden refinar en sitio:

1. **Solapamiento de alcance con un surface UI vendor no existente.** `UX / UI Notes` describe "Vendor inbox", campanita, "Marcar leída", empty/loading/error states; `Technical Notes → Frontend` declara `NotificationsBell`, TanStack y `notificationsApi.list`. Nada de esto pertenece al emisor. El vendor surface (bandeja de notificaciones vendor) NO tiene US dedicada en el backlog: EPIC-NOT-001 sólo cubre US-068 (QR creada), US-069/070 (otras emisiones), US-071 (surface organizer T-7), US-072 (marcar leída, cross-role) y US-073 (surface vendor rechazo/expiración). La bandeja vendor genérica es un gap del backlog que debe formalizarse por separado o incorporarse como Future.
2. **Traceability incompleta.** `FR-NOTIF-001` es correcto pero es el primario para notif in-app en general; falta `FR-NOTIF-003` (email simulado por log). `BR-NOTIF-001` es correcto pero faltan `BR-NOTIF-002` (eventos disparadores; QR-recibida es uno), `BR-NOTIF-003` (email log), `BR-NOTIF-005` (aislamiento) y `BR-NOTIF-007` (idioma). Falta `UC-QUOTE-001` como fuente del disparo (paso 6). El `NFR-OBS-001` declarado no aplica (es `AdminAction`); los canónicos son `NFR-OBS-004` (email log) y `NFR-OBS-005` (cambios críticos en logs).
3. **Decisiones técnicas y operacionales abiertas.** No se declara si el handler corre **in-transaction** con el `CreateQuoteRequestUseCase` de US-049 o **post-commit** (event bus/outbox). No se define el mecanismo de idempotencia (retry del use case por fallo transiente puede duplicar notifs), la estructura del `payload`, ni la generación server-side del `link` para el DTO de US-071/US-072 (`type='quote_request_received' → /vendor/quote-requests/{quoteRequestId}`, consistente con la D3 aprobada de US-071).
4. **AC-01 no ejecutable.** "Notif creada + log email" no define el número exacto de registros (1 in_app + 1 email_simulated por el patrón US-034 D5), campos del `payload`, `channel`, `language_code`, subject/body localizados, correlationId ni comportamiento cuando el vendor no está aprobado (aunque BR-QUOTE-003 en US-049 lo bloquea upstream, la defensa en profundidad debe estar declarada).

Adicionalmente, `docs/16 §34.3` declara el enum `type` con `task_due` en lugar del canónico `task_due_soon` — la misma inconsistencia levantada por US-034 y US-071. Para US-068 el valor canónico es `quote_request_received` (ya presente en el enum de docs/16). No hay conflicto directo, pero conviene ratificar en la Documentation Alignment global de EPIC-NOT-001.

Sin resolver Q1 (transaction scope), Q2 (idempotencia), Q3 (payload + link), Q4 (vendor surface UI en scope o fuera) y Q5 (idioma + fallback), no se pueden reescribir AC/EC/VR/Technical Notes de forma consistente con US-049 y con el patrón formalizado por US-034.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                            | Impacto                                                                                                                                                     | Recomendación                                                                                                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Scope creep: `UX / UI Notes` y `Technical Notes → Frontend` describen surface vendor (`NotificationsBell`, `notificationsApi.list`) que no pertenece a un emisor.                                                                                    | Aprobar así duplica alcance con una eventual "US-071-vendor" y rompe boundaries.                                                                            | Recortar US-068 al handler + persistencia (`Notification` in_app + email_simulated + log). Marcar la bandeja vendor como Out of Scope con handoff explícito a una US futura (o incluir en US-072).       |
| Alta      | Transaction scope del handler no definido. El paso 6 de UC-QUOTE-001 sugiere emisión síncrona; MVP single-process (docs/14 §23.1) permite in-tx.                                                                                                     | Sin decisión, ante fallo transiente al INSERT de `Notification` el `CreateQuoteRequestUseCase` puede abortar y perder la QR ya creada.                       | Resolver Q1 (Tech + PO). Recomendación: in-transaction, con retry por chunk atómico. Handler = servicio invocado por el mismo use case; sin event bus en MVP (consistente con `docs/14 §23.1`).          |
| Alta      | Idempotencia sin mecanismo. Retries por 5xx transient pueden crear notifs duplicadas.                                                                                                                                                                | Duplicidad en la bandeja vendor.                                                                                                                            | Resolver Q2 (Tech). Recomendación: SELECT/INSERT en transacción por `(user_id, type='quote_request_received', payload->>'quote_request_id')` (patrón D2 US-034).                                        |
| Alta      | Contrato del payload y del `link` sin definir. US-071 D3 formalizó el patrón por tipo pero no cubrió `quote_request_received`.                                                                                                                       | La bandeja vendor no puede navegar al detalle sin patrón formal.                                                                                            | Resolver Q3 (PO + Tech). Recomendación: `payload={quoteRequestId, eventId, organizerId, categoryCode}`; link `/vendor/quote-requests/{quoteRequestId}` (extensión de D3 US-071).                        |
| Alta      | Traceability incorrecta/incompleta. Falta `FR-NOTIF-003`, `UC-QUOTE-001`, `BR-NOTIF-002/003/005/007`; `NFR-OBS-001` no aplica.                                                                                                                       | Rompe la trazabilidad académica y no permite generar Technical Spec consistente.                                                                            | Reemplazar por IDs canónicos durante refinación (`FR-NOTIF-001 + FR-NOTIF-003`, `UC-NOTIF-001 + UC-QUOTE-001`, `BR-NOTIF-001/002/003/005/007`, `NFR-OBS-004 + NFR-OBS-005`).                             |
| Media     | AC-01 no ejecutable: "notif creada + log email" no define número, campos, canal, idioma ni correlationId.                                                                                                                                            | QA no puede asertar; el emisor puede quedar incompleto.                                                                                                    | Reescribir tras Q1..Q5 con el patrón 1 in_app + 1 email_simulated + 1 log `[EMAIL]` + resumen `correlationId=req-<id>` (heredado de US-034 D5).                                                          |
| Media     | Idioma sin decisión. BR-NOTIF-007 dice "destinatario o entidad, según corresponda"; para vendor recibiendo aviso del organizer, prevalece `User.language_preference` del vendor (paralelo a US-034 D6).                                              | Copy en idioma incorrecto en demo multi-locale.                                                                                                             | Resolver Q5 (PO). Recomendación: `User.language_preference` del vendor con fallback al `event.language_code` (si aplica) o al idioma default del sistema.                                                  |
| Media     | Defensa en profundidad ante vendor no-approved sin declarar. UC-QUOTE-001 E3 lo bloquea upstream, pero el handler debe explícitamente saltar (registrar warning) si por bug recibe un `vendor.status != 'approved'`.                                | Bug upstream podría llegar al handler sin ser detectado.                                                                                                    | Documentar como VR nuevo + AC negative test.                                                                                                                                                              |
| Media     | Sin política para retry por fallo. ¿Reintentar N veces? ¿Log + continuar?                                                                                                                                                                             | Comportamiento no definido ante errores DB/red.                                                                                                             | Alinear con patrón de `docs/14 §23.2` (captura por chunk; log y continúa) o hacer del INSERT parte de la misma transacción del use case (el rollback del use case revierte la notif).                    |
| Media     | Backlog Item no declarado.                                                                                                                                                                                                                          | Pérdida de trazabilidad académica.                                                                                                                          | Agregar `Backlog Item: PB-P2-005 (posición 1 de 1)`.                                                                                                                                                       |
| Baja      | `i18n Notes: 4 locales` sin enumerar (`es-LATAM`, `es-ES`, `pt`, `en` per US-007).                                                                                                                                                                    | QA puede no cubrir los 4 locales.                                                                                                                           | Enumerar en refinación.                                                                                                                                                                                    |
| Baja      | Dependencia `US-049` correcta pero incompleta: falta declarar dependencia con US-072 (mark-as-read cross-role) para el ciclo completo del vendor. La eventual bandeja vendor (Future) depende de US-034/US-071 pattern.                             | Handoff poco explícito.                                                                                                                                     | Ampliar `Dependencies` con US-049 (upstream) + US-072 (downstream mark-as-read) + una nota indicando que la bandeja vendor requiere US futura no listada hoy.                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                     |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| No introduce pagos reales            | Pass      | —                                                                              |
| No introduce contratos firmados      | Pass      | —                                                                              |
| No introduce WhatsApp/chat/push      | Pass      | Out of Scope declara "Push, SMS".                                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                  |
| Respeta backend como source of truth | Pass      | Emisor server-side.                                                            |
| Respeta seed/demo si aplica          | N/A       | Sin cambios estructurales del seed.                                            |
| No introduce RAG/vector DB           | Pass      | —                                                                              |
| No introduce multi-tenant enterprise | Pass      | Ownership por `user_id`.                                                       |
| No introduce P4/Future scope         | Pass      | Push/SMS/realtime siguen Future.                                               |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                                                                                    | Acción recomendada                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable | "Notif creada + log email" no define número, canal, payload, idioma, correlationId ni comportamiento transaccional.                    | Reescribir tras Q1..Q5. Ejemplo (sujeto a decisión): "Dado un organizer que ejecuta con éxito `CreateQuoteRequestUseCase`, cuando la QR se persiste, entonces se crean 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` para el `vendor.user_id`, más una entrada de log `[EMAIL] to=<userId> subject=... body=...` sin PII, todo dentro de la misma transacción; ante rollback del use case, ambas notifs se revierten." |

AC faltantes:
- AC para idempotencia (Q2): re-invocación con misma QR no crea segundo par.
- AC para aislamiento BR-NOTIF-005 (`Notification.user_id = vendorProfile.user_id`).
- AC para idioma (Q5): `language_code` resuelto y persistido.
- AC para observabilidad: `correlationId` propagado; log estructurado sin PII.
- AC para retry vs rollback (política elegida en Q1).
- AC para defensa vendor no-approved: warning + skip.

---

## 6. Gaps Detectados

### Producto / Negocio
- Falta decisión sobre alcance de la bandeja vendor (Out of Scope + handoff, Q4).
- Falta enumerar los locales soportados (4).

### Backend / API
- Falta declarar `OnQuoteRequestCreatedHandler` como servicio del módulo `notifications` invocado por `CreateQuoteRequestUseCase` (US-049).
- Falta contrato `payload` (Q3).
- Falta patrón `link` server-side (Q3).
- Falta transaction scope (Q1).
- Falta política de idempotencia (Q2).
- Falta defensa vendor no-approved.

### Frontend / UX
- **Recortar toda la sección Frontend + UX/UI Notes.** Vendor surface Out of Scope.

### Base de Datos
- Sin migraciones. Reuso de `notifications` + `idx_notifications_user_status_sent`.
- Sin unique constraint nuevo (D2 pattern de US-034).

### Seguridad / Autorización
- Falta declarar aislamiento explícito (`Notification.user_id = vendorProfile.user_id`).
- Falta declarar campos permitidos en log (userId, quoteRequestId, eventId, correlationId).
- Falta declarar exclusión de PII (email, displayName, brief content).

### IA / PromptOps
No aplica — no invoca IA.

### QA / Testing
- Falta test de idempotencia (re-invocación).
- Falta test de aislamiento (2 vendors, cada uno recibe sólo su notif).
- Falta test de rollback (fallo del INSERT revierte la QR si el handler in-tx).
- Falta test de idioma (fallback si `User.language_preference` vacío).
- Falta test de log estructurado sin PII.
- Falta test de vendor no-approved (defensa en profundidad).

### Seed / Demo
- No requiere cambios estructurales.
- Recomendado: el seed debe permitir generar una QR demo que dispare la notif visible al vendor demo.

### Documentación / Trazabilidad
- IDs incorrectos en FRD/UC/BR/NFR.
- Backlog Item no declarado.
- `Related Document(s)` sólo referencia `/docs/8`; ampliar.

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech + PO    | Q1. ¿El handler corre in-transaction dentro del `CreateQuoteRequestUseCase` (US-049) o post-commit vía event bus/outbox? MVP single-process (`docs/14 §23.1`) favorece in-tx. Impacta política de rollback (si el INSERT de Notification falla, ¿aborta la QR?) y patrón de retry.                                                                                                                                                                                                                | Sí                 | Tech Lead + PO     |
| Tech + PO    | Q2. ¿Cómo se garantiza la idempotencia si el use case se re-invoca (retry por fallo transiente)? Opciones: (a) SELECT antes de INSERT en transacción por `(user_id, type='quote_request_received', payload->>'quote_request_id')` (patrón US-034 D2); (b) unique constraint parcial nuevo (`docs/18 §18.1` alignment); (c) confiar en el rollback del use case y no reintentar por notif duplicada. Recomendación: (a).                                                                            | Sí                 | Tech Lead + PO     |
| PO + Tech    | Q3. ¿Cuál es el `payload` de la notif y el `link` server-side generado por el `NotificationLinkResolver` (definido en US-071 D3)? Recomendación: `payload={quoteRequestId, eventId, organizerId, categoryCode}` y `link = /vendor/quote-requests/{quoteRequestId}`. Requiere ratificación PO.                                                                                                                                                                                                    | Sí                 | Product Owner + Tech Lead |
| PO           | Q4. ¿La bandeja vendor (surface UI) forma parte del alcance de US-068, se materializa como US futura (`US-071-vendor-equivalente`), o se resuelve como Out of Scope con handoff explícito? Recomendación: Out of Scope con handoff a una US futura no listada hoy; US-072 (mark-as-read) atiende la mutación.                                                                                                                                                                                     | Sí                 | Product Owner     |
| PO           | Q5. Idioma de la notif. BR-NOTIF-007 dice "destinatario o entidad, según corresponda". Recomendación (paralelo a US-034 D6): `User.language_preference` del vendor con fallback a `event.language_code` si vacío.                                                                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q6 (opcional, defensa en profundidad). Si por bug upstream el handler recibe un `VendorProfile` en `status != 'approved'` (contradice UC-QUOTE-001 E3), ¿el handler emite igual (siguiendo el evento persistido) o skip con warning? Recomendación: skip + log warning con `correlationId` para diagnóstico.                                                                                                                                                                                       | Parcial            | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                                  | Conflicto detectado                                                                                                                       | Decisión vigente                                                                                                          | Acción recomendada                                                                                                                                                             | ¿Bloquea aprobación? |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`)                   | La tabla se crea en US-071 con `task_due_soon`; falta la fila `quote_request_received`.                                                    | D3 US-071 permite extender por tipo.                                                                                       | Agregar fila `quote_request_received → /vendor/quote-requests/{quoteRequestId}` tras Q3.                                                                                        | No                   |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P2-005) | `Traceability` declara `FR-NOTIF-001 · BR-NOTIF-001`. Falta `FR-NOTIF-003` (email log) y `BR-NOTIF-002/003/005/007`.                       | FRD/BRD son fuente única; email simulado en MVP es obligatorio.                                                            | Ampliar Traceability del backlog item.                                                                                                                                          | No                   |
| `docs/14 §Notifications`                                            | No documenta el handler `OnQuoteRequestCreatedHandler`.                                                                                    | Q1 define transaction scope.                                                                                              | Agregar sección o fila para el handler tras Q1.                                                                                                                                | No                   |
| `docs/10 §NFR-OBS-001` vs US-068 declaración                         | US-068 declara `NFR-OBS-001` que no aplica (es AdminAction).                                                                                | Canónicos: `NFR-OBS-004 + NFR-OBS-005`.                                                                                    | Reemplazado en la US durante la refinación.                                                                                                                                    | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-068-inapp-notification-new-quote-request.md`                                                                                                                                                                                                                                                                                    |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                                                                                                                         |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-068-decision-resolution.md`                                                                                                                                                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-068-refinement-review.md`                                                                                                                                                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                                                                                                                         |
| Reason                                     | Existen 5 preguntas bloqueantes (Q1–Q5) más Q6 parcial. La US no puede actualizarse en sitio porque Q1 define transaction scope y política de rollback; Q2 impacta idempotencia; Q3 define contrato payload/link; Q4 recorta alcance con handoff; Q5 formaliza idioma. Adicionalmente, la sección Frontend + UX/UI debe migrar a Out of Scope. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados. Prescriptivos para tras la resolución.)

### Metadata
- Agregar `Backlog Item: PB-P2-005 (posición 1 de 1)`.
- `Feature` refinado: "Emitir notificación in-app y email simulado al vendor al crear QuoteRequest".
- `Last Updated` a la fecha de resolución.
- `Status` → `Ready for Approval` sólo tras aplicar todos los cambios.

### Business Context
- `Assumptions`: precisar "Vendor activo y `VendorProfile.status='approved'` garantizado por UC-QUOTE-001 E3 (US-049)".
- `Dependencies`: agregar US-049 (upstream, provee el disparador), US-072 (mark-as-read cross-role); nota: la bandeja vendor requiere US futura no listada hoy.

### PO/BA Decisions Applied
- Agregar sección con D1..D5 (y D6 si aplica) tras la ejecución del resolver.

### Traceability
- FRD → `FR-NOTIF-001, FR-NOTIF-003`.
- UC → `UC-NOTIF-001, UC-QUOTE-001` (fuente del disparo, paso 6).
- BR → `BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007`.
- Permission → `Sistema → vendor.user_id (VendorProfile.user_id)`.
- Data Entity → `Notification, QuoteRequest, VendorProfile, User`.
- API → No aplica (handler interno).
- NFR → `NFR-OBS-004, NFR-OBS-005`.
- Related Documents → ampliar a `/docs/4 §BR-NOTIF-001/002/003/005/007`, `/docs/6 §Notification, §VendorProfile`, `/docs/8 §UC-QUOTE-001, §UC-NOTIF-001`, `/docs/9 §FR-NOTIF-001/003`, `/docs/10 §NFR-OBS-004/005`, `/docs/14 §Notifications`, `/docs/18 §18.1`.
- Backlog Item → `PB-P2-005`.

### Scope Guardrails
- `Explicitly Out of Scope`: agregar "Surface UI vendor (bandeja de notificaciones) — Future US no listada hoy", "Mark-as-read explícito → US-072", "Push, SMS, WhatsApp (BR-NOTIF-006)", "Event bus / outbox pattern (Future; MVP usa emisión in-transaction o post-commit del use case)".
- `Scope Notes`: reformular a "Sólo handler + persistencia (`Notification` in_app + email_simulated) + log estructurado. Sin componentes frontend".

### Acceptance Criteria
- AC-01 reescrito con el patrón 1+1+log.
- AC-02 nuevo (idempotencia).
- AC-03 nuevo (aislamiento BR-NOTIF-005).
- AC-04 nuevo (idioma resuelto y persistido).
- AC-05 nuevo (observabilidad + no-PII).
- AC-06 nuevo (rollback/retry según Q1).
- AC-07 nuevo (defensa vendor no-approved, Q6).

### Edge Cases
- EC-01 mantenido (vendor offline) — reformular como "vendor no autenticado en ese momento; la notif se persiste y es visible al login".
- EC-02 nuevo (retry del use case: sin duplicados).
- EC-03 nuevo (VendorProfile eliminado / User desactivado: skip).
- EC-04 nuevo (fallo del INSERT según política de Q1).

### Validation Rules
- VR-01 mantenido (vendor `user_id` válido).
- VR-02 nuevo (vendor `status='approved'`).
- VR-03 nuevo (`Notification.user_id = VendorProfile.user_id`).

### Authorization & Security Rules
- SEC-01 mantenido (Sistema).
- SEC-02 nuevo (log sin PII: campos permitidos `userId, quoteRequestId, eventId, categoryCode, correlationId`).
- SEC-03 nuevo (aislamiento BR-NOTIF-005).

### Technical Notes
- Frontend: **eliminar la sección completa**. Reemplazar por "No aplica — surface vendor Out of Scope".
- Backend: declarar `OnQuoteRequestCreatedHandler` como servicio invocado por `CreateQuoteRequestUseCase` (US-049). Reuso de `NotificationRepository` (patrón US-034). Transaction scope según Q1. Idempotencia por SELECT/INSERT en transacción (Q2). Payload y link server-side según Q3.
- Database: sin migración; reuso de índices existentes.
- API: no aplica (handler interno); las lecturas del vendor viven en `GET /api/v1/notifications` (canonical, `docs/16 §34.2`).
- Observability: `correlationId` heredado del request de `CreateQuoteRequestUseCase` o generado `req-qr-<id>`; log `[EMAIL] to=<vendorUserId> subject=... body=...` + log resumen si aplica.

### UX / UI Notes
- Reemplazar por "No aplica — surface vendor Out of Scope; consumo del canonical `GET /api/v1/notifications`".

### Test Scenarios
- Reescribir con TS-01 (emisión correcta), TS-02 (idempotencia), TS-03 (aislamiento), TS-04 (idioma), TS-05 (log sin PII), TS-06 (rollback/retry según Q1), TS-07 (vendor no-approved), NT-01..NT-04 (vendor `user_id` null, vendor eliminado, User desactivado, retry).
- Eliminar `AUTH-TS-01` como está redactado ("Vendor lee sus notifs") — pertenece al surface; puede migrar a la US futura de bandeja vendor.

### Definition of Ready / Done
- DoR: `[x] PO/BA validó` sólo tras aprobación.
- DoD: idempotencia comprobada, log sin PII, rollback/retry según Q1, i18n con 4 locales de plantilla, PO valida en demo (crear QR desde organizer demo → verificar `notifications` con `type='quote_request_received'` para vendor demo).

### Notes
- Reemplazar "Copy alineado con i18n" por la política concreta (D5) y por la lista de locales (`es-LATAM`, `es-ES`, `pt`, `en`).
- Documentar handoff con US-049 (upstream), US-072 (mark-as-read), y bandeja vendor Future.

---

## 11. Recomendación Final

`Needs Refinement`

La historia no puede actualizarse en sitio porque cinco decisiones (Q1: transaction scope; Q2: idempotencia; Q3: payload + link; Q4: recorte de alcance vs surface vendor; Q5: idioma) están abiertas y bloquean la reescritura de AC/EC/VR/Technical Notes. Q6 (defensa vendor no-approved) es parcial y puede resolverse por PO o dejarse como defensa en profundidad opcional.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review para resolver Q1–Q5 desde la documentación aprobada (docs/8 §UC-QUOTE-001, docs/14 §23.1, docs/18 §18.1, US-034 D1–D6 aprobadas, US-071 D3 aprobada) o, en su defecto, elevarlas a PO formal.

---

User Story file updated: No
Path: management/user-stories/US-068-inapp-notification-new-quote-request.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-068-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
