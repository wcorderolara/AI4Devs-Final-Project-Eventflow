# PO/BA Decision Resolution — US-069

## Source User Story File
management/user-stories/US-069-inapp-notification-new-quote.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-069-refinement-review.md

## Decision Date
2026-07-06

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-069                                                                                                            |
| User Story file path                         | `management/user-stories/US-069-inapp-notification-new-quote.md`                                                  |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-069-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-006 — Notificación de Quote enviada (P2, Should Have, posición 1 de 1)                                     |
| Epic                                         | EPIC-NOT-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 6 (Q1–Q5 + Q6)                                                                                                    |
| Decisiones PO/BA tomadas                     | 6 (D1 in-tx; D2 idempotencia por `quote_id`; D3 payload+link; D4 surface consumido por US-071 = Out of Scope; D5 idioma; D6 defensa `quote.status`/QR huérfana) |
| Decisiones técnicas recomendadas             | 2 (D1 y D2 requieren validación Tech Lead en la Technical Spec)                                                    |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                |
| User Story file updated                      | Yes                                                                                                               |
| Decision Resolution artifact created/updated | Yes                                                                                                               |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-069-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

---

## 2. Decisiones Respondidas

## Decisión 1 — Transaction scope (Q1)

### Respuesta PO/BA

Alineado con D1 US-068 aprobada y `docs/14 §23.1` (MVP single-process, sin event bus/outbox). Emisión in-transaction dentro del `RespondToQuoteRequestUseCase` (US-052) garantiza atomicidad: si el INSERT de `Notification` falla, la Quote no queda en `sent` inconsistente. `FR-QUOTE-017` describe la emisión como acción sincrónica al pasar a `sent`.

### Decisión formal

```text
`OnQuoteSentHandler` se invoca sincrónicamente dentro del `RespondToQuoteRequestUseCase` (US-052), como parte de la misma transacción Prisma que persiste el cambio a `Quote.status='sent'`. Ante fallo del INSERT de cualquiera de los 2 registros `Notification`, la transacción se revierte por completo y el caller HTTP recibe 500 con `correlationId`. Sin event bus / outbox en MVP.
```

### Rationale

* MVP-first (`docs/14 §23.1`).
* Consistencia atómica: la Quote no queda `sent` sin notif emitida.
* Reversibilidad: Future ADR puede promover a outbox si aparece necesidad multi-proceso.

### Impacto

| Sección              | Cambio                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                                          |
| Acceptance Criteria  | AC-01 declara emisión in-tx; AC-06 declara rollback ante fallo.                                     |
| Technical Notes      | Backend declara handler in-tx dentro del use case de US-052.                                        |
| Test Scenarios       | TS-06 verifica rollback.                                                                            |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** en Technical Spec.

---

## Decisión 2 — Idempotencia (Q2)

### Respuesta PO/BA

Patrón D2 US-068 aprobado, adaptado a la clave natural para `quote_received`: `payload->>'quote_id'`. La `Quote` es la unidad indivisible; una notif por Quote persistida.

### Decisión formal

```text
Idempotencia garantizada por chequeo defensivo `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_received' AND payload->>'quote_id'=$2 LIMIT 1` antes de cada INSERT, dentro de la misma tx del `RespondToQuoteRequestUseCase`. Skip silencioso si el registro existe. Sin unique constraint nuevo. Sin `notification_delivery_log`.
```

### Rationale

* Patrón validado en US-034 D2 y US-068 D2.
* Respeta `docs/18 §18.1`.
* Múltiples Quotes contra la misma QR (EC-01 del draft original) generan una notif por cada `quote_id` distinta.

### Impacto

| Sección              | Cambio                                                       |
| -------------------- | ------------------------------------------------------------ |
| PO/BA Decisions      | Agregar D2.                                                   |
| Acceptance Criteria  | AC-02 verifica ausencia de duplicados por `quote_id`.        |
| Edge Cases           | EC-01 ratificado (una notif por Quote).                       |
| Technical Notes      | Backend declara SELECT antes de INSERT.                      |
| Test Scenarios       | TS-02.                                                        |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** en Technical Spec.

---

## Decisión 3 — Payload + `link` server-side (Q3)

### Respuesta PO/BA

Extiende la tabla `LINK_STRATEGY_BY_TYPE` del `NotificationLinkResolver` (US-071 D3) con la fila `quote_received`. La ruta canónica es `/organizer/quote-requests/{quoteRequestId}/comparator` — el comparador de Quotes existe en el frontend organizer y es el destino natural al recibir una nueva Quote.

Respecto a incluir `vendorDisplayName` en payload: se descarta porque duplica dato disponible al render (el frontend puede resolverlo por `GET /api/v1/quote-requests/{id}/quotes`), reduce PII persistida y mantiene el `payload` mínimo consistente con US-068.

### Decisión formal

```text
`Notification.payload` para `type='quote_received'` es JSON con:
{
  "quoteId": "<uuid>",
  "quoteRequestId": "<uuid>",
  "eventId": "<uuid>",
  "vendorProfileId": "<uuid>"
}

`Notification.link` generado server-side por `NotificationLinkResolver.resolve(notification)`:
- `type='quote_received'` → `/organizer/quote-requests/{payload.quoteRequestId}/comparator`.
- Si el `quoteRequestId` no existe o el evento fue eliminado, `link=null`.

Se ratifica la fila `quote_received` en la tabla `link generation by type` de `docs/16 §34.3` (Documentation Alignment Required).
```

### Rationale

* Extiende D3 US-071 y el patrón US-068.
* Sin PII en el payload.
* El comparador ya renderiza el nombre del vendor con datos frescos.

### Impacto

| Sección              | Cambio                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                                  |
| Acceptance Criteria  | AC-01 explicita el payload.                                                                  |
| Technical Notes      | Backend declara resolver + shape.                                                            |
| Documentation Alignment | Fila `quote_received`.                                                                    |
| Test Scenarios       | TS verifica payload + link.                                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Surface UI del organizer (Q4)

### Respuesta PO/BA

US-071 (Approved with Minor Notes) entrega la bandeja unificada organizer con destacado visual por tipo. Los registros `Notification(type='quote_received')` emitidos por US-069 se visualizan automáticamente sin cambios de UI. US-072 cubre mark-as-read. Ninguna US adicional es necesaria.

### Decisión formal

```text
US-069 recorta su alcance a: handler + persistencia + log. La surface UI organizer es alcance de US-071 (aprobada) que consume `GET /api/v1/notifications` en bandeja unificada. Mark-as-read = US-072. US-069 NO entrega componentes frontend.
```

### Rationale

* Preserva boundaries.
* Reuso máximo de US-071.

### Impacto

| Sección              | Cambio                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                                                |
| Scope Guardrails     | `Explicitly Out of Scope`: surface organizer (→ US-071), mark-as-read (→ US-072).                          |
| Scope Notes          | "Sólo emisor + persistencia; consumo por US-071".                                                          |
| Technical Notes      | Frontend: "No aplica".                                                                                      |
| UX / UI Notes        | Reemplazar por "No aplica — surface en US-071".                                                            |
| Test Scenarios       | Eliminar tests de surface.                                                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Idioma (Q5)

### Respuesta PO/BA

Fallback ladder paralelo a D5 US-068: destinatario personal (organizer) prevalece; `event.language_code` como fallback secundario; `en` como último recurso.

### Decisión formal

```text
`Notification.language_code` se resuelve como:
1) `User.language_preference` del organizer (`event.owner_id`).
2) Si vacío: `event.language_code`.
3) Si aún vacío: `en`.

El código resuelto se persiste en `Notification.language_code` y se aplica al subject/body del `[EMAIL]`.
```

### Rationale

* Alineado con BR-NOTIF-007 y con D5 US-068.
* Idioma del destinatario personal prevalece.

### Impacto

| Sección              | Cambio                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                        |
| Acceptance Criteria  | AC-04.                                                                              |
| Technical Notes      | Backend reusa `UserRepository.resolveLanguageCode(organizerUserId, event.language_code)`. |
| Test Scenarios       | TS-04 con los 3 casos.                                                              |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Defensa `quote.status` / QR huérfana (Q6, parcial)

### Respuesta PO/BA

UC-QUOTE-004 exige `quote.status='sent'` al momento del disparo. Si por bug upstream el handler recibe una Quote en otro estado o una QR sin evento válido, skip + log warn estructurado, sin abortar la Quote ya persistida (aunque el escenario está bloqueado por US-052 upstream).

### Decisión formal

```text
El handler ejecuta guards defensivos:
- Si `quote.status != 'sent'` → skip + log warn.
- Si `quote_request.event_id` no resuelve a evento existente o `event.owner_id` es nulo → skip + log warn.
- Si `User(event.owner_id).status = 'deactivated'` → skip + log warn.

El log warn incluye `correlationId, quoteId, quoteRequestId, eventId?, reason`. El handler no aborta la transacción del use case; la Quote permanece persistida.
```

### Rationale

* Defensa en profundidad; no rompe UC-QUOTE-004.
* Log auditable habilita diagnóstico.

### Impacto

| Sección              | Cambio                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| PO/BA Decisions      | Agregar D6.                                                                                 |
| Acceptance Criteria  | AC-07 declara skip + warning.                                                               |
| Test Scenarios       | TS-07 verifica.                                                                             |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                | Decisión                                                                                                        | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Transaction scope                   | In-tx dentro del `RespondToQuoteRequestUseCase`; sin event bus.                                                  | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  2 | Idempotencia                        | SELECT antes de INSERT por `(user_id, type='quote_received', payload->>'quote_id')`.                             | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  3 | Payload + link                      | `{quoteId, quoteRequestId, eventId, vendorProfileId}`; link `/organizer/quote-requests/{quoteRequestId}/comparator`. | PO                  | Sí                     | No requiere                                     |
|  4 | Surface UI                          | Consumido por US-071 (aprobada). US-069 Out of Scope de UI.                                                     | PO                  | Sí                     | No requiere                                     |
|  5 | Idioma                              | `User.language_preference` del organizer → `event.language_code` → `en`.                                        | PO                  | Sí                     | No requiere                                     |
|  6 | Defensa `quote.status` / QR huérfana | Skip + warning; no aborta.                                                                                       | PO                  | Parcial                | No requiere                                     |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-069-inapp-notification-new-quote.md`.

### Metadata
- Backlog Item agregado (`PB-P2-006`).
- Feature refinado.
- Status → `Ready for Approval`.

### Business Context
- Assumptions actualizados (US-052 upstream; US-071 consume surface).
- Dependencies ampliadas (US-052, US-071, US-072).

### PO/BA Decisions Applied
- D1..D6.

### Traceability
- FRD/UC/BR/NFR corregidos con IDs canónicos.

### Scope Guardrails
- Out of Scope ampliado (surface → US-071; mark-as-read → US-072; event bus; push/SMS/WhatsApp).

### Acceptance Criteria
- AC-01..AC-07 reescritos.

### Edge Cases
- EC-01..EC-05 reescritos.

### Validation Rules
- VR-01..VR-04.

### Authorization & Security
- SEC-01..SEC-03.

### Technical Notes
- Frontend eliminado.
- Backend documentado con handler in-tx invocado por US-052.

### UX / UI Notes
- Reemplazado por "No aplica — surface en US-071".

### Test Scenarios
- TS-01..TS-07 + NT-01..NT-04.

### Definition of Ready / Done
- DoR: PO/BA validó.
- DoD: idempotencia comprobada, log sin PII, rollback verificado.

### Notes
- Handoff explícito US-052 (upstream), US-071 (surface consumidor aprobada), US-072 (mark-as-read).

---

## 5. Documentation Alignment Required

| Documento / Fuente                                | Conflicto                                                              | Decisión vigente                                                    | Acción recomendada                                                                       | ¿Bloquea aprobación? |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `quote_received`.                                            | D3 extiende la tabla.                                               | Agregar fila `quote_received → /organizer/quote-requests/{quoteRequestId}/comparator`.  | No                   |
| PB-P2-006 Traceability                             | Falta `FR-QUOTE-017, BR-QUOTE-018, BR-NOTIF-002/003/005/007`.           | US-069 refinada declara IDs canónicos.                              | Ampliar Traceability del backlog item.                                                   | No                   |
| `docs/14 §Notifications`                            | Sin `OnQuoteSentHandler` documentado.                                    | Handler in-tx (D1).                                                  | Agregar documentación.                                                                    | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                      |
| User Story file path                         | `management/user-stories/US-069-inapp-notification-new-quote.md`                                                                                          |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                      |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-069-decision-resolution.md`                                                                              |
| New User Story status                        | Ready for Approval                                                                                                                                       |
| Remaining blockers                           | No                                                                                                                                                       |
| Reason                                       | 6 decisiones D1–D6 formalizadas con respaldo documental (UC-QUOTE-004, FR-QUOTE-017, BR-QUOTE-018, US-052 upstream, US-071 D3 aprobada, US-068 D1–D6 aprobadas). D1 y D2 marcadas como Tech Recommendation. |

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
Path: management/user-stories/US-069-inapp-notification-new-quote.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-069-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
