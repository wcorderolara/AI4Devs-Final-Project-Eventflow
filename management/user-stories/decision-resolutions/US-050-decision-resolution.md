# PO/BA Decision Resolution — US-050

## Source User Story File
management/user-stories/US-050-quote-request-category-limit.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-050-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-050                                                                           |
| User Story file path                         | management/user-stories/US-050-quote-request-category-limit.md                   |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-050-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)              |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                        |
| Decisiones PO/BA tomadas                     | 6                                                                                |
| Decisiones técnicas recomendadas             | 0                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-050-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Endpoint dedicado `active-count`

```text
Nuevo endpoint `GET /api/v1/quote-requests/active-count?event_id=<uuid>&service_category_id=<uuid>`. Response `200 { active_count, limit: 5, available_slots, statuses_counted: ['sent','viewed','responded','preferred'] }`. Requiere sesión organizer + ownership del evento. Sin sesión ⇒ `401`. Evento ajeno o inexistente ⇒ `404 EVENT_NOT_FOUND` (uniforme con US-049). `service_category_id` inválido ⇒ `400 INVALID_CATEGORY`.
```

### Rationale
Endpoint dedicado simplifica la UX del frontend (badge en form de QR) sin requerir paginar el listado completo de QRs por evento.

---

## Decisión 2 — Concurrencia pesimista atómica

```text
La concurrencia se resuelve con `SELECT ... FOR UPDATE` sobre la fila `events` dentro de `prisma.$transaction` (ya implementado en US-049 D9). El conteo `WHERE event_id=? AND service_category_id=? AND status IN ('sent','viewed','responded','preferred') AND (expires_at IS NULL OR expires_at > NOW())` se ejecuta DESPUÉS del lock, garantizando que dos creates simultáneos no superen el límite. No se implementa bloqueo optimista (`@@version`) en MVP.
```

### Rationale
SELECT FOR UPDATE es atómico, simple y compatible con la transacción existente de US-049. El throughput esperado (10 req/min/user, D8 US-049) hace innecesario un esquema optimista.

---

## Decisión 3 — Código de error unificado

```text
El backend responde `409 Conflict` con `error.code='QR_CATEGORY_LIMIT_REACHED'` y `details: { active_count: 5, limit: 5, event_id, service_category_id }`. Consistente con US-049 EC-05. El código `QR_CATEGORY_LIMIT` (sin sufijo) se descarta.
```

### Rationale
Unificación con US-049 evita ambigüedad en clients y tests.

---

## Decisión 4 — Conteo lazy basado en `expires_at`

```text
El conteo activo aplica filtro lazy: `status IN ('sent','viewed','responded','preferred') AND (expires_at IS NULL OR expires_at > NOW())`. Cuando una QR vence (`expires_at < NOW()`), deja automáticamente de contar — sin job background dedicado en US-050. La transición formal a `status='expired'` queda para US futura del lifecycle (BR-QUOTE-005).
```

### Rationale
Lazy evita complejidad de jobs en MVP. El usuario ve "available_slots" actualizados al cargar el form sin esperar batch.

---

## Decisión 5 — Pre-check híbrido frontend

```text
Cuando el organizer abre el form de QR y selecciona categoría, el frontend llama `GET /api/v1/quote-requests/active-count?event_id=&service_category_id=` y muestra el badge "N/5". Si `available_slots === 0`, el CTA "Enviar solicitud" se deshabilita con `aria-describedby` que explica el bloqueo. El backend SIEMPRE re-valida en POST (defense in depth).
```

### Rationale
Híbrido mejora UX (evita submit fallido) sin debilitar enforcement server-side.

---

## Decisión 6 — Visibilidad del badge

```text
El badge `QRLimitBadge` se renderiza SIEMPRE que el formulario tenga categoría seleccionada, mostrando "N/5 cotizaciones activas en esta categoría" con `aria-live="polite"`. Visible inclusive cuando `N=0` (transparencia preventiva).
```

### Rationale
Visibilidad permanente refuerza el límite como expectativa explícita.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Endpoint count                     | `GET /api/v1/quote-requests/active-count` con `{ active_count, limit: 5, available_slots, statuses_counted }`.                                                  | PO/Tech | Sí                     | No                   |
|  2 | Concurrencia                        | `SELECT FOR UPDATE` (heredado de US-049 D9).                                                                                                                      | Tech    | Sí                     | No                   |
|  3 | Código de error                     | `409 QR_CATEGORY_LIMIT_REACHED` + details.                                                                                                                        | PO      | Sí                     | No                   |
|  4 | Liberación de slot                  | Conteo lazy con `(expires_at IS NULL OR expires_at > NOW())`. Sin job background.                                                                                | Tech    | Sí                     | No                   |
|  5 | Pre-check                          | Híbrido — frontend muestra badge y deshabilita CTA si `available_slots=0`; backend re-valida.                                                                    | PO      | Sí                     | No                   |
|  6 | Visibilidad badge                   | Siempre visible al seleccionar categoría con `aria-live`.                                                                                                         | PO      | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-050-quote-request-category-limit.md`                   |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-050-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 6/6 decisiones PO/Tech formalizadas.                                               |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```
