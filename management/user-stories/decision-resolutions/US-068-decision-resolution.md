# PO/BA Decision Resolution — US-068

## Source User Story File
management/user-stories/US-068-inapp-notification-new-quote-request.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-068-refinement-review.md

## Decision Date
2026-07-06

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-068                                                                                                            |
| User Story file path                         | `management/user-stories/US-068-inapp-notification-new-quote-request.md`                                          |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-068-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-005 — Notificación de QuoteRequest creada (P2, posición 1 de 1)                                            |
| Epic                                         | EPIC-NOT-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 6 (Q1–Q5 + Q6)                                                                                                    |
| Decisiones PO/BA tomadas                     | 6 (D1 in-transaction; D2 idempotencia SELECT/INSERT; D3 payload + link; D4 surface vendor Out of Scope; D5 idioma; D6 defensa vendor no-approved) |
| Decisiones técnicas recomendadas             | 2 (D1 y D2 requieren validación Tech Lead en la Technical Specification)                                          |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                |
| User Story file updated                      | Yes                                                                                                               |
| Decision Resolution artifact created/updated | Yes                                                                                                               |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-068-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

---

## 2. Decisiones Respondidas

## Decisión 1 — Transaction scope (Q1)

### Respuesta PO/BA

`docs/14 §23.1` confirma MVP single-process sin event bus (`Sin Redis/BullMQ/Kafka`). Emisión post-commit vía outbox introduce complejidad no justificada. Emisión in-transaction:
* Garantiza atomicidad: si el INSERT de `Notification` falla, se revierte la QR y el organizador recibe error explícito.
* Elimina la ventana de inconsistencia post-commit.
* Se alinea con el paso 6 de UC-QUOTE-001 (`Sistema dispara Notification`) leído como acción sincrónica del use case.

### Decisión formal

```text
El handler `OnQuoteRequestCreatedHandler` se invoca de forma sincrónica dentro del `CreateQuoteRequestUseCase` (US-049), como parte de la misma transacción Prisma que persiste la QuoteRequest. Si el INSERT de cualquiera de los dos registros `Notification` falla, la transacción se revierte y el caller recibe error 500 con `correlationId`. No se usa event bus ni outbox en MVP. Retries del use case son responsabilidad del caller HTTP (idempotencia cubierta por D2).
```

### Rationale

* Alineado con MVP-first (`docs/14 §23.1`).
* Atomicidad = consistencia sin doble escritura ni ventanas de recuperación.
* Reversibilidad: promover a event bus en Future queda como ADR aparte.

### Impacto

| Sección              | Cambio                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                                          |
| Acceptance Criteria  | AC-01 declara emisión in-tx; AC-06 declara rollback ante fallo del INSERT.                          |
| Technical Notes      | Backend declara handler in-tx, invocado por `CreateQuoteRequestUseCase`.                            |
| Test Scenarios       | TS-06 verifica rollback (mock INSERT falla → QR no persistida).                                     |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** durante Technical Spec.

---

## Decisión 2 — Idempotencia (Q2)

### Respuesta PO/BA

Patrón US-034 D2 validado: chequeo SELECT antes de INSERT en la misma transacción, filtrando por `(user_id, type='quote_request_received', payload->>'quote_request_id')`. `docs/18 §18.1` rechaza `notification_delivery_log` en MVP y no requiere unique constraint nuevo. En emisión in-tx (D1), el mismo `quote_request_id` sólo se ve una vez (porque la QR se crea en la misma tx), pero el chequeo defensivo cubre eventuales retries del use case a nivel HTTP donde el caller re-envía la creación completa (misma tx que insertaría una NUEVA QR con nuevo id; el mismo par de notifs se emitiría, sin duplicar por QR).

### Decisión formal

```text
Idempotencia garantizada por chequeo defensivo `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_request_received' AND payload->>'quote_request_id'=$2 LIMIT 1` antes de cada INSERT, dentro de la misma transacción del `CreateQuoteRequestUseCase`. Si el registro existe, el handler skip silencioso. Sin unique constraint nuevo. Sin tabla `notification_delivery_log`.
```

### Rationale

* Patrón ya validado en US-034 D2 aprobada.
* Respeta `docs/18 §18.1`.
* Defensa en profundidad ante bugs del caller.

### Impacto

| Sección              | Cambio                                                       |
| -------------------- | ------------------------------------------------------------ |
| PO/BA Decisions      | Agregar D2.                                                   |
| Acceptance Criteria  | AC-02 verifica ausencia de duplicados.                       |
| Technical Notes      | Backend declara SELECT antes de INSERT.                      |
| Test Scenarios       | TS-02 idempotencia.                                          |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** durante Technical Spec.

---

## Decisión 3 — Payload + `link` server-side (Q3)

### Respuesta PO/BA

D3 US-071 aprobada delegó a cada tipo la ratificación de su patrón. Para `quote_request_received`, el destinatario es el vendor y el destino es la pantalla de detalle de la QR. La ruta canónica en el frontend vendor es `/vendor/quote-requests/{quoteRequestId}` (consistente con la tabla `link generation by type` propuesta en US-071 D3, fila `quote_request_received`).

### Decisión formal

```text
`Notification.payload` para `type='quote_request_received'` es JSON con los campos:
{
  "quoteRequestId": "<uuid>",
  "eventId": "<uuid>",
  "organizerId": "<uuid>",
  "categoryCode": "<enum ServiceCategoryCode>"
}

`Notification.link` generado server-side por `NotificationLinkResolver.resolve(notification)` (patrón US-071 D3):
- `type='quote_request_received'` → `/vendor/quote-requests/{payload.quoteRequestId}`.
- Si el `payload.quoteRequestId` no existe (defensa), `link=null`.

Se ratifica la fila `quote_request_received` en la tabla `link generation by type` de `docs/16 §34.3` (Documentation Alignment Required).
```

### Rationale

* Extiende D3 US-071 sin cambios de patrón.
* Payload mínimo suficiente para render UI (título/body) y navegación.
* Sin PII en el payload (sólo IDs).

### Impacto

| Sección              | Cambio                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                                  |
| Acceptance Criteria  | AC-01 explicita el `payload`; AC nuevo (si aplicable) para el link.                          |
| Technical Notes      | Backend declara resolver + shape del payload.                                                |
| Documentation Alignment | Fila `quote_request_received` en `docs/16 §34.3`.                                          |
| Test Scenarios       | TS verifica payload + link.                                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Vendor surface UI (Q4)

### Respuesta PO/BA

EPIC-NOT-001 lista US-071 (surface T-7 organizer) y US-073 (surface vendor rechazo/expiración) pero no una bandeja vendor general para `quote_request_received`. El endpoint canónico `GET /api/v1/notifications` (`docs/16 §34.2`) es genérico y sirve a cualquier rol autenticado. Materializar la bandeja vendor genérica requiere una US futura simétrica a US-071 en un layout vendor. Fuera del alcance de US-068 (emisor).

### Decisión formal

```text
US-068 recorta su alcance a: handler + persistencia (`Notification` in_app + email_simulated) + log estructurado. La bandeja vendor (surface UI) queda Out of Scope y se marca como Future US no listada en el backlog actual. El mark-as-read del vendor es alcance de US-072 (PB-P2-008, cross-role). Cuando el vendor abra un cliente que consuma `GET /api/v1/notifications`, verá las notifs `quote_request_received` con `link` server-side generado por US-068.
```

### Rationale

* Preserva boundaries entre emisor y surface (mismo patrón US-034 vs US-071 aprobado).
* Documenta el gap del backlog para tratamiento futuro.
* Reduce riesgo de solapamiento con US-072.

### Impacto

| Sección              | Cambio                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                                                |
| Scope Guardrails     | `Explicitly Out of Scope`: surface vendor + mark-as-read (→ US-072).                                       |
| Scope Notes          | "Sólo emisor + persistencia".                                                                              |
| Technical Notes      | Frontend: "No aplica".                                                                                      |
| UX / UI Notes        | Reemplazar por "No aplica — surface Out of Scope; consumo del canonical `GET /api/v1/notifications`".      |
| Test Scenarios       | Eliminar tests de surface.                                                                                  |
| Notes                | Documentar gap del backlog: Future US "US-071-vendor" para bandeja unificada del vendor.                    |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Idioma (Q5)

### Respuesta PO/BA

BR-NOTIF-007: idioma preferido del destinatario o del evento asociado. Para US-068, destinatario = vendor (User); entidad = QuoteRequest (asociada al `event.language_code`). El vendor es el destinatario personal; la preferencia personal prevalece. Fallback secundario: `event.language_code` (contexto del organizer). Fallback terciario: idioma default sistema (`en`) — improbable dado que `User.language_preference` está bound al onboarding US-007.

### Decisión formal

```text
`Notification.language_code` se resuelve como:
1) `User.language_preference` del vendor (destinatario).
2) Si vacío: `event.language_code` (contexto de la QR).
3) Si aún vacío: `en` (default sistema).

El código resuelto se persiste en `Notification.language_code` y se aplica al subject/body simulado en el log `[EMAIL]`.
```

### Rationale

* Alineado con US-034 D6 y BR-NOTIF-007.
* Idioma del destinatario prevalece para comunicaciones personales.

### Impacto

| Sección              | Cambio                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                        |
| Acceptance Criteria  | AC-04 idioma resuelto y persistido.                                                |
| Technical Notes      | Backend declara `UserRepository.resolveLanguageCode(userId, fallback)` reusado.    |
| Test Scenarios       | TS-04 verifica los 3 casos (con preferencia; fallback event; fallback default).    |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Defensa vendor no-approved (Q6, parcial)

### Respuesta PO/BA

UC-QUOTE-001 E3 bloquea la creación de QR si el vendor no está `approved` (`docs/8 §3070`). Por lo tanto, si el handler recibe un vendor no-`approved`, es un bug upstream. La respuesta defensiva correcta es: skip + log warning con `correlationId` para diagnóstico (sin abortar la QR ya creada, aunque la lógica es que este caso no debe existir).

### Decisión formal

```text
Si por bug upstream el handler recibe una QR asociada a un `VendorProfile.status != 'approved'`, el handler emite un log warning estructurado con `correlationId, quoteRequestId, vendorProfileId, vendorStatus` y skip la creación de la notif. No aborta la transacción del use case (la QR queda persistida; la ausencia de notif se detecta por auditoría del log). En la práctica, este escenario no ocurre porque UC-QUOTE-001 E3 lo bloquea antes.
```

### Rationale

* Defensa en profundidad sin romper el flujo aprobado.
* Log auditable habilita diagnóstico.

### Impacto

| Sección              | Cambio                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| PO/BA Decisions      | Agregar D6.                                                                                 |
| Acceptance Criteria  | AC-07 declara el skip + warning.                                                            |
| Test Scenarios       | TS-07 verifica el warning y ausencia de notif si vendor no-approved (defensa en profundidad). |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                | Decisión                                                                                                        | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Transaction scope                   | In-transaction dentro del `CreateQuoteRequestUseCase`; sin event bus/outbox en MVP.                              | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  2 | Idempotencia                        | SELECT antes de INSERT en la misma tx por `(user_id, type, payload->>'quote_request_id')`. Sin unique constraint. | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  3 | Payload + link server-side          | `payload={quoteRequestId, eventId, organizerId, categoryCode}`; `link=/vendor/quote-requests/{quoteRequestId}`.  | PO                  | Sí                     | No requiere                                     |
|  4 | Vendor surface UI                   | Out of Scope. Bandeja vendor = Future US no listada; mark-as-read = US-072.                                     | PO                  | Sí                     | No requiere                                     |
|  5 | Idioma                              | `User.language_preference` con fallback `event.language_code` con fallback `en`.                                | PO                  | Sí                     | No requiere                                     |
|  6 | Defensa vendor no-approved          | Skip + warning; sin abortar el use case.                                                                        | PO                  | Parcial                | No requiere                                     |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-068-inapp-notification-new-quote-request.md`.

### Metadata
- Backlog Item agregado (`PB-P2-005`).
- Feature refinado.
- Status → `Ready for Approval`.

### Business Context
- Assumptions actualizados con UC-QUOTE-001 E3.
- Dependencies ampliadas con US-049 + US-072 + nota de bandeja Future.

### PO/BA Decisions Applied
- Sección nueva con D1..D6.

### Traceability
- FRD/UC/BR/NFR corregidos y ampliados.

### Scope Guardrails
- Out of Scope ampliado (surface vendor, mark-as-read, event bus, push/SMS).

### Acceptance Criteria
- AC-01..AC-07 reescritos y ampliados.

### Edge Cases
- EC-01..EC-04 reescritos.

### Validation Rules
- VR-01..VR-03.

### Authorization & Security
- SEC-01..SEC-03.

### Technical Notes
- Frontend eliminado.
- Backend documentado con handler in-tx, idempotencia, resolver, adapter.

### UX / UI Notes
- Reemplazado por "No aplica".

### Test Scenarios
- TS-01..TS-07 + NT-01..NT-04.

### Definition of Ready / Done
- DoR: PO/BA validó.
- DoD: idempotencia comprobada, log sin PII, rollback verificado.

### Notes
- Documentado gap del backlog + handoff.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                   | Conflicto                                                                                | Decisión vigente                                                                       | Acción recomendada                                                                     | ¿Bloquea aprobación? |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §34.3` (tabla `link generation by type`)    | Falta fila `quote_request_received`.                                                     | D3 US-068 extiende la tabla.                                                            | Agregar fila `quote_request_received → /vendor/quote-requests/{quoteRequestId}`.       | No                   |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P2-005) | Traceability declara sólo `FR-NOTIF-001 · BR-NOTIF-001`.                     | US-068 refinada declara `FR-NOTIF-001/003`, `BR-NOTIF-001/002/003/005/007`.             | Ampliar Traceability del backlog item.                                                 | No                   |
| `docs/14 §Notifications` / `docs/14 §handlers`        | Sin sección para `OnQuoteRequestCreatedHandler`.                                        | Handler in-tx (D1).                                                                    | Agregar handler y su patrón in-tx a `docs/14`.                                          | No                   |
| Backlog EPIC-NOT-001                                  | Falta US "bandeja vendor" simétrica a US-071.                                            | D4 documenta gap y difiere a Future.                                                    | Considerar creación de US futura para bandeja vendor (fuera del alcance de US-068).    | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                      |
| User Story file path                         | `management/user-stories/US-068-inapp-notification-new-quote-request.md`                                                                                  |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                      |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-068-decision-resolution.md`                                                                              |
| New User Story status                        | Ready for Approval                                                                                                                                       |
| Remaining blockers                           | No                                                                                                                                                       |
| Reason                                       | Las 6 decisiones D1–D6 quedaron formalizadas con respaldo documental (UC-QUOTE-001, docs/14 §23.1, docs/18 §18.1, US-034 D1–D6 aprobadas, US-071 D3 aprobada). D1 y D2 marcadas como `Tech Recommendation` para validación en Technical Spec. |

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
Path: management/user-stories/US-068-inapp-notification-new-quote-request.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-068-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval` directamente.
