# User Story Refinement Review — US-069

## Source User Story File
management/user-stories/US-069-inapp-notification-new-quote.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-069-decision-resolution.md

## Review Date
2026-07-06 (revalidación: 2026-07-06)

## Revalidation Result (2026-07-06)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-069-decision-resolution.md`) y la actualización en sitio de la User Story:

| Verificación                                                                                                                            | Resultado |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (transaction scope) resuelta: handler in-tx dentro del `RespondToQuoteRequestUseCase`.                                                | OK        |
| Q2 (idempotencia) resuelta: SELECT antes de INSERT por `(user_id, type='quote_received', payload->>'quote_id')`.                        | OK        |
| Q3 (payload + link) resuelta: `{quoteId, quoteRequestId, eventId, vendorProfileId}`; link `/organizer/quote-requests/{id}/comparator`.   | OK        |
| Q4 (surface UI) resuelta: consumido por US-071 (aprobada); US-069 sin frontend.                                                          | OK        |
| Q5 (idioma) resuelta: fallback ladder `User.language_preference → event.language_code → en`.                                             | OK        |
| Q6 (defensa `quote.status` / QR huérfana) resuelta: skip + warning log.                                                                  | OK        |
| Traceability corregida con IDs canónicos (`FR-QUOTE-017`, `UC-QUOTE-004`, `BR-QUOTE-018`, `BR-NOTIF-*`, `NFR-OBS-004/005`).             | OK        |
| Recorte de alcance: Frontend + UX/UI eliminadas. Backlog Item declarado (`PB-P2-006`).                                                  | OK        |
| AC reescritos (AC-01..AC-07), EC ampliados (EC-01..EC-05), VR/SEC/Test ampliados.                                                       | OK        |
| Documentation Alignment Required (3 ítems, no bloqueantes).                                                                              | OK        |
| Sin scope creep.                                                                                                                        | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| User Story ID                              | US-069                                                                                          |
| File Path                                  | `management/user-stories/US-069-inapp-notification-new-quote.md`                                |
| Backlog Item                               | PB-P2-006 — Notificación de Quote enviada (P2, Should Have, posición 1 de 1)                    |
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
| Refinement review path                     | `management/user-stories/refinement-reviews/US-069-refinement-review.md`                        |

---

## 2. Diagnóstico PO/BA

US-069 es el reflejo bilateral de US-068: cuando un vendor pasa una `Quote` a `status='sent'` mediante `RespondToQuoteRequestUseCase` (US-052), el sistema debe emitir una `Notification(type='quote_received')` al organizer dueño de la QR. El requisito está formalizado en `FR-QUOTE-017` (`docs/9 §475`): "El sistema debe enviar una notificación in-app al organizador al pasar la `Quote` a estado `sent`" y en `BR-QUOTE-018` (`docs/4 §332`).

El patrón esperado es idéntico al aprobado para US-068:

* Handler in-transaction (D1 US-068).
* Idempotencia por SELECT/INSERT (D2 US-068).
* Payload + link server-side (D3 US-068 → tabla `link generation by type` de US-071).
* Fallback ladder de idioma (D5 US-068).
* Emisión + persistencia; sin surface UI.

Ventaja clave respecto a US-068: **el surface UI del organizer ya existe** — US-071 (Approved with Minor Notes) entrega la bandeja unificada organizer que consume `GET /api/v1/notifications` y muestra todos los tipos. Por lo tanto, las notifs `quote_received` emitidas por US-069 se visualizan automáticamente en la campanita organizer sin necesidad de UI adicional.

Sin embargo, el archivo llega con los mismos cuatro bloques de problemas identificados en US-068:

1. **Solapamiento de alcance.** `UX / UI Notes` y `Technical Notes → Frontend` describen "Organizer inbox", campanita, "Marcar leída". Ese alcance pertenece a US-071 (bandeja + destacado) y US-072 (mark-as-read).
2. **Traceability incompleta.** `FR-NOTIF-002` es correcto (consulta y marcado) pero no es el primario del disparo; el canónico es **`FR-QUOTE-017`** (notif in-app al organizer al pasar `sent`) más `FR-NOTIF-001` y `FR-NOTIF-003`. Falta `UC-QUOTE-004` (Responder cotización, fuente del disparo). Falta `BR-QUOTE-018`. `BR-NOTIF-002` correcto; faltan `BR-NOTIF-001/003/005/007`. `NFR-OBS-001` no aplica (canónicos: `NFR-OBS-004`, `NFR-OBS-005`). Backlog Item no declarado.
3. **Decisiones técnicas y operacionales abiertas.** Mismas que US-068: transaction scope (in-tx vs post-commit), idempotencia, contrato `payload` + `link`, fallback de idioma, defensa ante estados inválidos (`quote.status != 'sent'`, QR no dirigida al vendor).
4. **AC-01 no ejecutable.** "Notif creada + log email" sin número exacto, canal, payload, idioma, correlationId ni comportamiento transaccional.

`docs/16 §34.3` incluye `type='quote_received'` en su enum, sin conflicto directo. El patrón de link para `quote_received` fue anticipado en la propuesta D3 US-071: `/organizer/quote-requests/{quoteRequestId}/comparator` (surface del comparador de quotes de la QR, existe en el frontend organizer).

`EC-01` ("múltiples Quotes → una notif por cada") es correcto y coincide con la política de idempotencia por `payload->>'quote_id'` (una notif por `quote.id`, no por `quote_request_id`). Se ratifica en D2.

Sin resolver Q1–Q5 (y Q6 opcional) no pueden reescribirse AC/EC/VR/Technical Notes de forma consistente con US-052 (upstream) y con el patrón US-068 aprobado.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                    | Impacto                                                                                                                    | Recomendación                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Scope creep hacia el surface organizer (US-071).                                                                                                                                            | Duplicidad con US-071 aprobada; boundary broken.                                                                            | Recortar US-069 al handler + persistencia. UX/UI y Frontend Notes migran a "No aplica — surface en US-071".                                                                                                |
| Alta      | Transaction scope no definido.                                                                                                                                                              | Ante fallo del INSERT, ¿aborta la Quote?                                                                                    | Resolver Q1. Recomendación: in-transaction (patrón D1 US-068).                                                                                                                                              |
| Alta      | Idempotencia no definida.                                                                                                                                                                    | Duplicidad ante retries.                                                                                                    | Resolver Q2. Recomendación: SELECT/INSERT por `(user_id, type='quote_received', payload->>'quote_id')` (patrón D2 US-068).                                                                                 |
| Alta      | Contrato payload + link ausente. Sin `NotificationLinkResolver` para `quote_received`.                                                                                                        | Surface US-071 no puede navegar al detalle sin patrón.                                                                     | Resolver Q3. Recomendación: `payload={quoteId, quoteRequestId, eventId, vendorProfileId, vendorDisplayName? (evaluar PII)}`; link `/organizer/quote-requests/{quoteRequestId}/comparator`.                |
| Alta      | Traceability incompleta y con IDs incorrectos: falta `FR-QUOTE-017` (primario), `UC-QUOTE-004`, `BR-QUOTE-018`, `BR-NOTIF-001/003/005/007`. `NFR-OBS-001` no aplica.                       | Rompe trazabilidad académica.                                                                                                | Reemplazar por IDs canónicos: FR = `FR-QUOTE-017, FR-NOTIF-001, FR-NOTIF-003`; UC = `UC-QUOTE-004, UC-NOTIF-001`; BR = `BR-QUOTE-018, BR-NOTIF-001/002/003/005/007`; NFR = `NFR-OBS-004, NFR-OBS-005`.  |
| Media     | AC-01 no ejecutable.                                                                                                                                                                          | QA no puede aserciones.                                                                                                    | Reescribir con patrón 1 in_app + 1 email_simulated + 1 log `[EMAIL]` heredado de US-068.                                                                                                                    |
| Media     | Idioma sin definir. BR-NOTIF-007.                                                                                                                                                            | Copy en idioma incorrecto en demo.                                                                                          | Resolver Q5. Recomendación: `User.language_preference` del organizer con fallback a `event.language_code` con fallback `en` (paralelo D5 US-068).                                                          |
| Media     | Defensa ante `quote.status != 'sent'` (por bug upstream) o QR huérfana no declarada.                                                                                                          | Bug upstream llega al handler sin ser detectado.                                                                            | Documentar VR/AC negative test (paralelo D6 US-068).                                                                                                                                                        |
| Media     | Backlog Item no declarado.                                                                                                                                                                    | Pérdida de trazabilidad.                                                                                                    | Agregar `Backlog Item: PB-P2-006 (posición 1 de 1)`.                                                                                                                                                        |
| Baja      | `i18n Notes: 4 locales` sin enumerar.                                                                                                                                                        | QA puede no cubrir todos.                                                                                                    | Enumerar (`es-LATAM, es-ES, pt, en`).                                                                                                                                                                        |
| Baja      | Dependencia declarada `US-052` correcta pero incompleta. Falta declarar US-072 (mark-as-read) y US-071 (surface consumidor).                                                                  | Handoff poco explícito.                                                                                                     | Ampliar `Dependencies`.                                                                                                                                                                                     |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                    |
| ------------------------------------ | --------- | ------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                             |
| No introduce contratos firmados      | Pass      | —                                                             |
| No introduce WhatsApp/chat/push      | Pass      | Out of Scope declara "Push, SMS".                             |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                 |
| Respeta backend como source of truth | Pass      | Emisor server-side.                                            |
| Respeta seed/demo si aplica          | N/A       | Reuso del seed de US-052.                                     |
| No introduce RAG/vector DB           | Pass      | —                                                             |
| No introduce multi-tenant enterprise | Pass      | Ownership por `event.owner_id`.                                |
| No introduce P4/Future scope         | Pass      | Push/SMS/realtime siguen Future.                              |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                                                                                             | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail / Not Testable | "Notif creada + log email" sin número, canal, payload, idioma, transaccionalidad.                                                              | Reescribir tras Q1..Q5. Ejemplo: "Dado un vendor que ejecuta con éxito `RespondToQuoteRequestUseCase` (US-052) y la Quote pasa a `status='sent'`, cuando se persiste, entonces dentro de la misma transacción se crean 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` para `QuoteRequest.event.owner_id` con `type='quote_received'`, `payload={quoteId, quoteRequestId, eventId, vendorProfileId}`, `language_code=<resolved>` + 1 entrada log `[EMAIL]` sin PII."     |

AC faltantes:
- AC para idempotencia (Q2) por `payload->>'quote_id'`.
- AC para aislamiento BR-NOTIF-005 (`Notification.user_id = event.owner_id`).
- AC para idioma (Q5).
- AC para observabilidad + no-PII (paralelo AC-05 US-068).
- AC para rollback ante fallo del INSERT (paralelo AC-06 US-068).
- AC para defensa `quote.status != 'sent'` o QR huérfana (paralelo AC-07 US-068).

---

## 6. Gaps Detectados

### Producto / Negocio
- Falta decidir política ante `quote.status != 'sent'` o QR sin evento (defensa Q6).
- Enumerar locales.

### Backend / API
- Declarar `OnQuoteSentHandler` en módulo `notifications`, invocado por `RespondToQuoteRequestUseCase` (US-052).
- Contrato `payload` + link (Q3).
- Idempotencia (Q2).
- Transaction scope (Q1).

### Frontend / UX
- **Recortar completamente.** Consumo por US-071 (bandeja unificada organizer, aprobada).

### Base de Datos
- Sin migraciones. Reuso.

### Seguridad / Autorización
- Aislamiento explícito.
- Log sin PII: campos permitidos (paralelo SEC-02 US-068).
- Preservar la privacidad del nombre del vendor si se decide no incluirlo en `payload.vendorDisplayName`.

### QA / Testing
- TS de idempotencia, aislamiento, rollback, idioma, log sin PII, defensa `quote.status`, defensa QR huérfana.

### Seed / Demo
- Reuso del seed de US-052.

### Documentación / Trazabilidad
- IDs incorrectos/incompletos.
- Backlog Item no declarado.
- Ampliar `Related Document(s)`.

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Bloquea aprobación | Responsable        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech + PO    | Q1. ¿Handler in-tx dentro del `RespondToQuoteRequestUseCase` (US-052) o post-commit? Recomendación: in-tx (paralelo D1 US-068).                                                                                                                                                                                                                                                                                                                                                                | Sí                 | Tech Lead + PO     |
| Tech + PO    | Q2. Idempotencia. Recomendación: SELECT/INSERT por `(user_id, type='quote_received', payload->>'quote_id')` (paralelo D2 US-068).                                                                                                                                                                                                                                                                                                                                                              | Sí                 | Tech Lead + PO     |
| PO + Tech    | Q3. Payload + link server-side. Recomendación: `payload={quoteId, quoteRequestId, eventId, vendorProfileId}`, `link=/organizer/quote-requests/{quoteRequestId}/comparator` (extensión de la tabla D3 US-071). Decisión adicional: ¿incluir `vendorDisplayName` en payload para permitir render sin nueva query? Riesgo PII acotado (los organizers ya lo ven en el comparador). Recomendación: NO incluir; el frontend lo resuelve al hacer render vía `GET /api/v1/quote-requests/{id}/quotes`. | Sí                 | Product Owner + Tech Lead |
| PO           | Q4. ¿La bandeja UI del organizer forma parte del alcance de US-069, se resuelve consumiendo US-071 (aprobada), o se resuelve como Out of Scope explícito? Recomendación: Out of Scope; US-071 consume automáticamente `quote_received` como bandeja unificada.                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q5. Idioma. Recomendación: `User.language_preference` del organizer con fallback a `event.language_code` con fallback `en` (paralelo D5 US-068).                                                                                                                                                                                                                                                                                                                                              | Sí                 | Product Owner     |
| PO           | Q6 (opcional, defensa en profundidad). Si por bug upstream el handler recibe `quote.status != 'sent'` o una `QuoteRequest` huérfana (evento eliminado), ¿el handler emite igual o skip con warning? Recomendación: skip + log warning con `correlationId` (paralelo D6 US-068).                                                                                                                                                                                                                | Parcial            | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                                                | Decisión vigente                                                             | Acción recomendada                                                                                                                                            | ¿Bloquea aprobación? |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `quote_received`.                                                                        | D3 extiende la tabla iniciada en US-071.                                     | Agregar fila `quote_received → /organizer/quote-requests/{quoteRequestId}/comparator`.                                                                        | No                   |
| PB-P2-006 Traceability                              | Declara `FR-NOTIF-001 · BR-NOTIF-001` (verificar; probablemente incompleto).                        | US-069 refinada declara IDs canónicos (`FR-QUOTE-017, FR-NOTIF-001/003`).    | Ampliar Traceability del backlog item.                                                                                                                        | No                   |
| `docs/14 §Notifications`                            | Sin documentar `OnQuoteSentHandler`.                                                                | Handler in-tx (D1).                                                          | Documentar el handler.                                                                                                                                        | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-069-inapp-notification-new-quote.md`                                                                                                                                                            |
| User Story ID verified                     | Yes                                                                                                                                                                                                                         |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-069-decision-resolution.md`                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-069-refinement-review.md`                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                         |
| Reason                                     | 5 preguntas bloqueantes Q1–Q5 + Q6 parcial. Reescritura de AC/EC/VR/Technical Notes depende de las decisiones; scope creep hacia surface debe recortarse (US-071 consume automáticamente). |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-006`.
- `Feature`: "Emitir notificación in-app y email simulado al organizer cuando el vendor envía Quote".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- Dependencies ampliadas: US-052 (upstream), US-071 (surface consumidor), US-072 (mark-as-read).

### PO/BA Decisions Applied
- Sección nueva D1..D6.

### Traceability
- FRD → `FR-QUOTE-017, FR-NOTIF-001, FR-NOTIF-003`.
- UC → `UC-QUOTE-004, UC-NOTIF-001`.
- BR → `BR-QUOTE-018, BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007`.
- Permission → `Sistema → QuoteRequest.event.owner_id`.
- Data Entity → `Notification, Quote, QuoteRequest, Event, User`.
- API → No aplica (handler); consumo `GET /api/v1/notifications`.
- NFR → `NFR-OBS-004, NFR-OBS-005`.
- Related Documents → `/docs/4 §BR-QUOTE-018 §BR-NOTIF-*`, `/docs/6 §Notification, §Quote, §QuoteRequest`, `/docs/8 §UC-QUOTE-004 §UC-NOTIF-001`, `/docs/9 §FR-QUOTE-017 §FR-NOTIF-001/003`, `/docs/10 §NFR-OBS-004/005`, `/docs/14 §Notifications §23.1`, `/docs/18 §18.1`.
- Backlog Item.

### Scope Guardrails
- Out of Scope: surface organizer (US-071 aprobada), mark-as-read (US-072), event bus, `notification_delivery_log`, push/SMS/WhatsApp, retry asincrónico, SMTP real.
- Scope Notes: sólo emisor + persistencia.

### Acceptance Criteria
- Reescribir AC-01. Añadir AC-02..AC-07 (patrón US-068).

### Edge Cases
- EC-01 mantenido (múltiples Quotes → una notif cada uno). Añadir EC-02 (idempotencia por `quote_id`), EC-03 (retry), EC-04 (rollback), EC-05 (QR huérfana / Quote status inválido — defensa Q6).

### Validation Rules
- VR-01 organizer válido; VR-02 `event.owner_id` no nulo y usuario activo; VR-03 `quote.status='sent'` (defensa); VR-04 `Notification.user_id = event.owner_id`.

### Authorization & Security
- SEC-01 Sistema; SEC-02 log sin PII (`userId, quoteId, quoteRequestId, eventId, correlationId`; excluye `email, displayName, brief, brief content, event notes, vendor name, quote amount`); SEC-03 aislamiento BR-NOTIF-005.

### Technical Notes
- Frontend eliminado.
- Backend: `OnQuoteSentHandler` invocado in-tx desde `RespondToQuoteRequestUseCase` (US-052). Reuso de `NotificationRepository`, `SimulatedEmailAdapter` (US-034), `UserRepository.resolveLanguageCode` (US-034), `NotificationLinkResolver` extendido con `quote_received`.

### UX / UI Notes
- Reemplazar por "No aplica — surface en US-071 (bandeja unificada organizer, aprobada)".

### Test Scenarios
- TS-01..TS-07 + NT-01..NT-04 (paralelo US-068).

### Definition of Ready / Done
- DoR: `[x] PO/BA validó`.
- DoD: idempotencia, rollback, log sin PII, i18n 4 locales, PO valida en demo (vendor demo responde QR → organizer demo recibe notif).

### Notes
- Handoff explícito: US-052 (upstream), US-071 (surface), US-072 (mark-as-read).
- Documentation Alignment.

---

## 11. Recomendación Final

`Needs Refinement`

Cinco decisiones bloqueantes (Q1–Q5) + Q6 parcial. Recorte de alcance necesario. Todas las decisiones tienen paralelo directo en US-068 aprobada y US-071 aprobada, por lo que la resolución es determinística.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-069-inapp-notification-new-quote.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-069-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
